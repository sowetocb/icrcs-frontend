// Client-side session helpers. Tokens are stored in HttpOnly cookies (set by
// the server-side /api/auth/* routes) and are NOT accessible from JavaScript.
//
// The frontend only tracks a lightweight "logged-in" flag so components can
// conditionally render without inspecting the actual token. The proxy route
// reads the cookie automatically on every fetch.
//
// The flag lives in localStorage (NOT sessionStorage) on purpose: the HttpOnly
// auth cookie is shared by every tab, so the flag must be too. localStorage is
// shared across all same-origin tabs AND emits a cross-tab `storage` event on
// change — which lets a newly-opened tab detect the existing session and lets
// every open tab react instantly when the user logs in or out in another tab
// (see subscribeSession). sessionStorage is per-tab and fires no cross-tab
// event, so a new tab could never see a session opened elsewhere.

import type { Tokens } from "@/lib/api/auth";

export type Session = Tokens;

const FLAG = "icrcs-logged-in";

/** Returns a stub Session when the user is signed in (cookie-based), or null.
 * The actual token values are NOT available — they live in HttpOnly cookies. */
export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    // The logged-in flag is set after a successful login call. The real tokens
    // are in HttpOnly cookies that the browser sends automatically.
    const flag = window.localStorage.getItem(FLAG);
    if (flag === "1") {
      return { accessToken: "__httponly__", refreshToken: "__httponly__" };
    }
    return null;
  } catch {
    return null;
  }
}

/** Mark the user as logged in (the actual tokens are stored in HttpOnly cookies
 * by the server-side login route). */
export function saveSession(_session: Session): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLAG, "1");
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FLAG);
  } catch {
    // ignore
  }
}

/**
 * Subscribe to cross-tab session changes. `onChange` fires whenever the
 * logged-in flag is set or cleared in ANOTHER tab (localStorage `storage`
 * events only fire in other tabs, never the one that made the change), with the
 * new logged-in state. Returns an unsubscribe function. No-op on the server.
 *
 * Used by AuthGuard (log out here when another tab signs out) and the guest
 * shell (leave the login page when another tab signs in).
 */
export function subscribeSession(onChange: (loggedIn: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    // key === null means localStorage.clear(); FLAG means our flag changed.
    if (e.key === null || e.key === FLAG) {
      onChange(loadSession() !== null);
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// A one-shot notice explaining an automatic sign-out, so the login screen can
// tell the user WHY they were logged out (idle timeout / expired session)
// instead of silently dropping them there. Written just before redirecting to
// /login and consumed (read + cleared) once on the login page.
const SIGNOUT_NOTICE = "icrcs-signout-notice";
export type SignoutReason = "idle" | "expired";

export function setSignoutNotice(reason: SignoutReason): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SIGNOUT_NOTICE, reason);
  } catch {
    // ignore
  }
}

/** Read and clear the pending sign-out notice (returns null when none). */
export function takeSignoutNotice(): SignoutReason | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(SIGNOUT_NOTICE);
    if (v === "idle" || v === "expired") {
      window.sessionStorage.removeItem(SIGNOUT_NOTICE);
      return v;
    }
    return null;
  } catch {
    return null;
  }
}
