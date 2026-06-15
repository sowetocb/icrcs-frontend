// The account holder's details captured during profile creation. Used to
// pre-fill (and lock) the first person registered under the account.

const KEY = "icrcs-profile";
// The backend stores the photo but exposes no URL that serves it (403/404 on
// every path). So we also keep the uploaded image locally as a data URL and
// render that, so the avatar actually shows the photo across reloads.
//
// The cache is keyed per user (PHOTO_KEY_PREFIX + identity) and intentionally
// survives logout, so signing back in restores the photo. A different user on
// the same device gets a different key and never sees the previous photo.
// PHOTO_KEY is the legacy single-key store, still read as a fallback.
const PHOTO_KEY = "icrcs-profile-photo";
const PHOTO_KEY_PREFIX = "icrcs-profile-photo:";

export type Profile = {
  profileId?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
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
  return `${base}/${v.replace(/^\/+/, "")}`;
}

/** Resolve a profile photo path to a browser URL via the same-origin proxy.
 * Returns null when there is no photo. */
export function profilePhotoSrc(profile: Profile | null): string | null {
  return toProxyUrl(profile?.profilePictureUrl);
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    // Keep the per-user photo cache (PHOTO_KEY_PREFIX + identity) so the avatar
    // is restored on next sign-in. Only drop the legacy single-key store.
    window.localStorage.removeItem(PHOTO_KEY);
  } catch {
    // ignore
  }
}

/** Stable per-user cache key. Email is always present and read-only in the UI;
 * profileId is a fallback. Returns null when neither is known. */
function photoKey(profile: Profile | null): string | null {
  const id = profile?.email?.trim().toLowerCase() || profile?.profileId?.trim();
  return id ? PHOTO_KEY_PREFIX + id : null;
}

/** Locally cached profile photo (data URL) — see PHOTO_KEY note above. The cache
 * records the photo's source URL alongside the bytes so it self-invalidates
 * when the backend photo changes (e.g. a new upload on another device). */
export function savePhotoDataUrl(profile: Profile | null, dataUrl: string): void {
  if (typeof window === "undefined") return;
  const key = photoKey(profile);
  if (!key) return;
  try {
    const entry = JSON.stringify({
      url: profile?.profilePictureUrl?.trim() ?? "",
      dataUrl,
    });
    window.localStorage.setItem(key, entry);
  } catch {
    // ignore (e.g. quota) — the avatar simply falls back to initials
  }
}

export function loadPhotoDataUrl(profile: Profile | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = photoKey(profile);
    if (!key) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    // New format: { url, dataUrl }. Only return the cached bytes when they match
    // the profile's current photo URL — otherwise the photo changed elsewhere
    // and the caller should re-fetch.
    try {
      const parsed = JSON.parse(raw) as { url?: string; dataUrl?: string };
      if (parsed && typeof parsed.dataUrl === "string") {
        const current = profile?.profilePictureUrl?.trim() ?? "";
        return (parsed.url ?? "") === current ? parsed.dataUrl : null;
      }
    } catch {
      // Legacy plain-string entry — its source URL is unknown, so it can't be
      // trusted to match the current photo; ignore it and re-fetch.
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPhotoDataUrl(profile: Profile | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = photoKey(profile);
    if (key) window.localStorage.removeItem(key);
    window.localStorage.removeItem(PHOTO_KEY); // also drop any legacy copy
  } catch {
    // ignore
  }
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
