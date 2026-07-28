// The account holder's details captured during profile creation. Used to
// pre-fill (and lock) the first person registered under the account.
//
// Stored in a SESSION cookie (not localStorage) so PII clears when the browser
// closes and on logout. Auth tokens remain HttpOnly. Photo previews are
// memory-only (too large for cookies) and re-fetched after login.

import {
  deleteClientCookie,
  getClientCookieJson,
  purgeSensitiveLocalStorage,
  setClientCookieJson,
} from "./clientCookies";

const KEY = "icrcs-profile";

export type Profile = {
  profileId?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  /** Country of nationality, stored as the country NAME (e.g. "Tanzania").
   *  Used to classify Tanzanian vs foreign at the registry. */
  nationality?: string;
  phoneNumber: string;
  email: string;
  /** Backend-relative path, e.g. "uploads/PROFILE-.../x.jpg". */
  profilePictureUrl?: string;
};

/** Route a backend photo URL/path through the same-origin proxy.
 *
 * The backend returns an absolute URL pointing at an internal cluster host
 * (e.g. http://10.244.0.13:7200/api/v1/files/view?path=…) that the browser
 * can't reach directly — so we keep only its path + query and prefix the proxy
 * base. Relative paths are prefixed as-is. Returns null when empty. */
export function toProxyUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      // Public, directly-loadable images (e.g. ui-avatars.com fallback avatars)
      // are not backend file paths — use them as-is, don't route through the proxy.
      if (!/\/files?\//i.test(u.pathname)) return v;
      // The backend emits absolute URLs that include its own base-path segment
      // (e.g. http://host/api/v1/files/view), and the proxy already forwards to
      // BACKEND_API_BASE_URL which ends in that same "/api". Drop the leading
      // "/api" so the proxy doesn't double it (…/api/api/v1/… → 403/404).
      const path = u.pathname.replace(/^\/api(?=\/)/, "");
      return `${base}${path}${u.search}`;
    } catch {
      return null;
    }
  }
  // Relative backend path (e.g. /api/v1/files/view?path=…). Strip a leading
  // /api segment — the proxy base already maps to the backend /api root.
  if (v.startsWith("/")) {
    const path = v.replace(/^\/api(?=\/)/, "");
    return `${base}${path}`;
  }
  return `${base}/${v.replace(/^\/+/, "")}`;
}

/** Resolve any backend file reference to a browser-loadable proxy URL.
 *
 * Handles absolute backend URLs, `/v1/files/view?path=…` paths, and bare storage
 * keys (e.g. `ICRCS-…/5/uuid.jpg`) returned by the upload API. */
export function fileViewUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (v.startsWith("data:")) return v;
  // Backend emits /api/v1/files/view?path=… — same shape management loads
  // directly (next.config rewrites it to the proxy route).
  if (/^\/api\/v1\/files\/view/i.test(v)) return v;
  if (/^https?:\/\//i.test(v) || /\/files\/view/i.test(v)) {
    return toProxyUrl(v);
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return `${base}/v1/files/view?path=${encodeURIComponent(v.replace(/^\/+/, ""))}`;
}

/** Resolve a profile photo path to a browser URL via the same-origin proxy.
 * Returns null when there is no photo. */
export function profilePhotoSrc(profile: Profile | null): string | null {
  return toProxyUrl(profile?.profilePictureUrl);
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    purgeSensitiveLocalStorage();
    setClientCookieJson(KEY, profile);
  } catch {
    // ignore
  }
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    return getClientCookieJson<Profile>(KEY);
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    deleteClientCookie(KEY);
    photoMemory.clear();
    purgeSensitiveLocalStorage();
  } catch {
    // ignore
  }
}

// ── In-memory photo preview cache (session-only; never localStorage/cookies) ─
const photoMemory = new Map<string, { url: string; dataUrl: string }>();

/** Stable per-user cache key. Email is always present and read-only in the UI;
 * profileId is a fallback. Returns null when neither is known. */
function photoKey(profile: Profile | null): string | null {
  const id = profile?.email?.trim().toLowerCase() || profile?.profileId?.trim();
  return id ? id : null;
}

/** Locally cached profile photo (data URL) for the current browser session. */
export function savePhotoDataUrl(profile: Profile | null, dataUrl: string): void {
  if (typeof window === "undefined") return;
  const key = photoKey(profile);
  if (!key) return;
  photoMemory.set(key, {
    url: profile?.profilePictureUrl?.trim() ?? "",
    dataUrl,
  });
}

export function loadPhotoDataUrl(profile: Profile | null): string | null {
  if (typeof window === "undefined") return null;
  const key = photoKey(profile);
  if (!key) return null;
  const entry = photoMemory.get(key);
  if (!entry) return null;
  const current = profile?.profilePictureUrl?.trim() ?? "";
  return entry.url === current ? entry.dataUrl : null;
}

export function clearPhotoDataUrl(profile: Profile | null): void {
  if (typeof window === "undefined") return;
  const key = photoKey(profile);
  if (key) photoMemory.delete(key);
}

/** Reads an image File into a data URL for local caching / preview. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
