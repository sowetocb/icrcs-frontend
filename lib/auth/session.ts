// Client-side session helpers. Tokens are stored in HttpOnly cookies (set by
// the server-side /api/auth/* routes) and are NOT accessible from JavaScript.
//
// The frontend only tracks a lightweight "logged-in" flag in sessionStorage so
// components can conditionally render without inspecting the actual token.
// The proxy route reads the cookie automatically on every fetch.

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
    const flag = window.sessionStorage.getItem(FLAG);
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
    window.sessionStorage.setItem(FLAG, "1");
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FLAG);
  } catch {
    // ignore
  }
}
