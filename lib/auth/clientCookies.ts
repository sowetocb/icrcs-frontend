// Client-readable SESSION cookies for non-token UI state (logged-in flags,
// profile/officer cache, registration draft metadata, locale). Auth JWTs
// remain HttpOnly (see cookieOptions).
//
// CRITICAL: nothing session-related may live in localStorage or sessionStorage.
// clearBrowserStorage() wipes both entirely on login/logout/guard mount so
// leftover keys from older builds (or other apps that shared the origin) cannot
// linger in DevTools.
//
// Cross-tab sync uses BroadcastChannel (cookie writes don't fire `storage`).

const AUTH_CHANNEL = "icrcs-auth";

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

/**
 * Wipe ALL localStorage + sessionStorage for this origin.
 * Prefer this over key-by-key deletes so unknown leftovers cannot remain.
 */
export function clearBrowserStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
}

/** @deprecated Use clearBrowserStorage — kept for call-site compatibility. */
export function purgeSensitiveLocalStorage(): void {
  clearBrowserStorage();
}

/** Read a cookie value (decoded), or null. */
export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return null;
}

/** Write a session cookie (no Max-Age → cleared when the browser session ends). */
export function setClientCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
    `; Path=/; SameSite=Lax${secure}`;
}

/** Delete a cookie (matching Path/SameSite/Secure used at write time). */
export function deleteClientCookie(name: string): void {
  if (typeof document === "undefined") return;
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie =
    `${encodeURIComponent(name)}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

export function getClientCookieJson<T>(name: string): T | null {
  const raw = getClientCookie(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setClientCookieJson(name: string, value: unknown): void {
  setClientCookie(name, JSON.stringify(value));
}

/** Notify other tabs that auth/profile cookie state changed. */
export function broadcastAuthChange(detail: {
  kind: "citizen" | "officer";
  loggedIn: boolean;
}): void {
  if (typeof window === "undefined") return;
  try {
    const ch = new BroadcastChannel(AUTH_CHANNEL);
    ch.postMessage(detail);
    ch.close();
  } catch {
    // BroadcastChannel unavailable — other tabs refresh on next focus/navigation
  }
}

/** Subscribe to auth cookie changes from OTHER tabs. */
export function subscribeAuthBroadcast(
  onChange: (detail: { kind: "citizen" | "officer"; loggedIn: boolean }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  let ch: BroadcastChannel;
  try {
    ch = new BroadcastChannel(AUTH_CHANNEL);
  } catch {
    return () => {};
  }
  const handler = (e: MessageEvent) => {
    const d = e.data as { kind?: string; loggedIn?: boolean } | null;
    if (!d || (d.kind !== "citizen" && d.kind !== "officer")) return;
    if (typeof d.loggedIn !== "boolean") return;
    onChange({ kind: d.kind, loggedIn: d.loggedIn });
  };
  ch.addEventListener("message", handler);
  return () => {
    ch.removeEventListener("message", handler);
    ch.close();
  };
}
