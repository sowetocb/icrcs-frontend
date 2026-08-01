/**
 * Client for the workstation Canon camera via:
 *   C:\Users\allyb\Downloads\enrollment\icrcs-device-service
 *
 * Browser → http://127.0.0.1:8090 (icrcs-device-service)
 *         → http://127.0.0.1:6070 (Canon EDSDK bridge)
 *
 * Capture returns raw image bytes (PNG/JPEG), not JSON base64.
 * Live-view WS frames remain base64 in JSON (small EVF frames).
 *
 * Env: NEXT_PUBLIC_DEVICE_SERVICE_URL=http://127.0.0.1:8090
 */

const rawBase = process.env.NEXT_PUBLIC_DEVICE_SERVICE_URL ?? "http://127.0.0.1:8090";
const BASE = rawBase.replace(/\/$/, "");

export type CameraStatus = {
  connected: boolean;
  message: string;
};

export type EnrollmentStep = "NONE" | "CAMERA" | "FINGERPRINT" | "SIGNATURE";

export function deviceServiceBaseUrl(): string {
  return BASE;
}

function wsBase(): string {
  return BASE.replace(/^http/i, "ws");
}

export async function getCameraStatus(timeoutMs = 3000): Promise<CameraStatus> {
  const res = await fetch(`${BASE}/api/v1/camera/status`, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Camera status failed (${res.status})`);
  }
  const body = (await res.json()) as Partial<CameraStatus>;
  return {
    connected: Boolean(body.connected),
    message: String(body.message ?? ""),
  };
}

/** True when enrollment icrcs-device-service reports Canon connected. */
export async function isCanonCameraReady(): Promise<boolean> {
  try {
    const status = await getCameraStatus();
    return status.connected;
  } catch {
    return false;
  }
}

/**
 * Tell the agent which enrollment screen is active (USB priority between
 * Canon live view and native fingerprint). See EnrollmentStepController.
 */
export async function setEnrollmentStep(step: EnrollmentStep): Promise<void> {
  try {
    await fetch(`${BASE}/api/v1/enrollment/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // best-effort — capture can still work without coordination
  }
}

/**
 * Still photo from Canon as a binary Blob (image/png after rembg).
 * Agent releases USB after shot. Long timeout — bridge rembg can take >15s.
 */
export async function captureCanonPhoto(timeoutMs = 60000): Promise<Blob> {
  const res = await fetch(`${BASE}/api/v1/camera/capture`, {
    method: "POST",
    headers: { Accept: "image/png,image/jpeg,application/octet-stream" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Camera capture failed (${res.status})`);
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  // Compat: older agents returned JSON { image: base64 }
  if (ct.includes("application/json")) {
    const body = (await res.json()) as { image?: string };
    if (!body.image) throw new Error("Camera capture returned no image");
    const mime = body.image.startsWith("/9j/") ? "image/jpeg" : "image/png";
    const bin = Uint8Array.from(atob(body.image), (c) => c.charCodeAt(0));
    return new Blob([bin], { type: mime });
  }
  const buf = await res.arrayBuffer();
  if (!buf || buf.byteLength < 32) throw new Error("Camera capture returned empty image");
  const mime = ct.startsWith("image/")
    ? ct.split(";")[0]!.trim()
    : sniffBinaryMime(new Uint8Array(buf));
  return new Blob([buf], { type: mime });
}

function sniffBinaryMime(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  return "image/png";
}

/** Release Canon USB session (call when leaving the camera step). */
export async function releaseCanonCamera(): Promise<void> {
  try {
    await fetch(`${BASE}/api/v1/camera/release`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort
  }
}

export type LiveViewHandle = {
  close: () => void;
};

/**
 * Open WS /ws/camera on enrollment icrcs-device-service — same contract as
 * ICRCS-Management `openLiveView('camera', …)`.
 */
export function openCanonLiveView(
  onFrame: (dataUrl: string) => void,
  onError?: (message: string) => void,
): LiveViewHandle {
  const ws = new WebSocket(`${wsBase()}/ws/camera`);
  let closed = false;
  let gotFrame = false;

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        frame?: string;
        connected?: boolean;
        error?: string;
      };
      if (msg.error) {
        onError?.(msg.error);
        return;
      }
      if (msg.frame) {
        gotFrame = true;
        const frame = msg.frame;
        onFrame(frame.startsWith("data:") ? frame : `data:image/jpeg;base64,${frame}`);
      }
    } catch {
      // ignore malformed frames
    }
  };

  ws.onerror = () => {
    if (!closed && !gotFrame) onError?.("Camera live view connection failed");
  };

  ws.onclose = () => {
    if (!closed && !gotFrame) onError?.("Camera live view closed before preview");
  };

  return {
    close: () => {
      closed = true;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // ignore
      }
    },
  };
}

/** Centre-crop to square JPEG data URL ≤ maxBytes (default 300KB for icrcs-api upload). */
export function toPassportJpegDataUrl(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  maxBytes = 300 * 1024,
): string {
  let sw: number;
  let sh: number;
  if (source instanceof HTMLVideoElement) {
    sw = source.videoWidth;
    sh = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    sw = source.naturalWidth || source.width;
    sh = source.naturalHeight || source.height;
  } else {
    sw = source.width;
    sh = source.height;
  }
  if (!sw || !sh) throw new Error("Empty image source");

  const side = Math.min(sw, sh);
  const out = Math.min(640, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(source, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, out, out);

  let q = 0.9;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length * 0.75 > maxBytes && q > 0.3) {
    q -= 0.1;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}

/** Load from binary Blob without revoking early (avoids canvas draw failures). */
export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    return loadImageFromBase64(dataUrl);
  } finally {
    bitmap.close();
  }
}

/**
 * Capture blob → white-matte passport JPEG in one step (preferred path).
 * Uses createImageBitmap so we never depend on a revoked object URL.
 */
export async function toPassportJpegFromBlob(
  blob: Blob,
  maxBytes = 300 * 1024,
): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const sw = bitmap.width;
    const sh = bitmap.height;
    if (!sw || !sh) throw new Error("Empty image source");
    const side = Math.min(sw, sh);
    const out = Math.min(640, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(bitmap, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, out, out);
    let q = 0.9;
    let url = canvas.toDataURL("image/jpeg", q);
    while (url.length * 0.75 > maxBytes && q > 0.3) {
      q -= 0.1;
      url = canvas.toDataURL("image/jpeg", q);
    }
    return url;
  } finally {
    bitmap.close();
  }
}

/** @deprecated Prefer loadImageFromBlob — kept for freeze-frame data URLs. */
export function loadImageFromBase64(base64OrDataUrl: string): Promise<HTMLImageElement> {
  let src: string;
  if (base64OrDataUrl.startsWith("data:")) {
    src = base64OrDataUrl;
  } else {
    const mime = sniffBase64Mime(base64OrDataUrl);
    src = `data:${mime};base64,${base64OrDataUrl}`;
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode captured image"));
    img.src = src;
  });
}

function sniffBase64Mime(base64: string): string {
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  return "image/png";
}

/** Shared freeze→swap helper used by Capture UI (Track A). */
export function normalizeLiveFrameDataUrl(frame: string): string {
  if (frame.startsWith("data:")) return frame;
  return `data:${sniffBase64Mime(frame)};base64,${frame}`;
}
