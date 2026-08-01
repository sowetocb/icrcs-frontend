// Client-side session helpers. Tokens are stored in HttpOnly cookies (set by
// the server-side /api/auth/* routes) and are NOT accessible from JavaScript.
//
// The frontend only tracks a lightweight "logged-in" flag so components can
// conditionally render without inspecting the actual token. The proxy route
// reads the cookie automatically on every fetch.
//
// The flag is a SESSION cookie (not localStorage): cleared when the browser
// closes, and explicitly removed on logout / session expiry. Cross-tab sync
// uses BroadcastChannel (see clientCookies).

import type { Tokens } from "@/lib/api/auth";
import { clearLookupCache } from "@/lib/api/lookup";
import {
  broadcastAuthChange,
  deleteClientCookie,
  getClientCookie,
  purgeSensitiveLocalStorage,
  setClientCookie,
  subscribeAuthBroadcast,
} from "./clientCookies";

export type Session = Tokens;

const FLAG = "icrcs-logged-in";

/** Returns a stub Session when the user is signed in (cookie-based), or null.
 * The actual token values are NOT available — they live in HttpOnly cookies. */
export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    if (getClientCookie(FLAG) === "1") {
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
    purgeSensitiveLocalStorage();
    setClientCookie(FLAG, "1");
    broadcastAuthChange({ kind: "citizen", loggedIn: true });
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    deleteClientCookie(FLAG);
    clearLookupCache();
    purgeSensitiveLocalStorage();
    broadcastAuthChange({ kind: "citizen", loggedIn: false });
  } catch {
    // ignore
  }
}

/**
 * Subscribe to cross-tab session changes. Fires when another tab signs in/out.
 * Returns an unsubscribe function. No-op on the server.
 */
export function subscribeSession(onChange: (loggedIn: boolean) => void): () => void {
  return subscribeAuthBroadcast((d) => {
    if (d.kind === "citizen") onChange(d.loggedIn);
  });
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
    // Short-lived session cookie (cleared when read, or when the browser closes).
    setClientCookie(SIGNOUT_NOTICE, reason);
  } catch {
    // ignore
  }
}

/** Read and clear the pending sign-out notice (returns null when none). */
export function takeSignoutNotice(): SignoutReason | null {
  if (typeof window === "undefined") return null;
  try {
    const v = getClientCookie(SIGNOUT_NOTICE);
    deleteClientCookie(SIGNOUT_NOTICE);
    if (v === "idle" || v === "expired") return v;
    return null;
  } catch {
    return null;
  }
}
