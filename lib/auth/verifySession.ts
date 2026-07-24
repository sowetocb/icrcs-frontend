"use client";

// Authoritative "is this session still alive?" check.
//
// The logged-in flag lives in localStorage, but the real credential is an
// HttpOnly SESSION cookie (no max-age) that the browser drops when it closes.
// Those two disagree in one important case: the user closes the browser WITHOUT
// closing the tabs, then reopens and the browser restores the tabs. localStorage
// (and even sessionStorage, which browsers restore too) still says "logged in",
// while the auth cookie is gone — so the app would happily render the dashboard
// for a user who is no longer authenticated.
//
// Asking the SERVER is the only reliable answer: the refresh endpoints succeed
// only if the cookie survived. Calls are de-duplicated through a single in-flight
// promise so the guard and the keep-alive can both ask without racing (a double
// refresh could rotate the token twice and invalidate a good session).

import { refresh } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, loadSession, saveSession } from "./session";
import { isOfficer, clearOfficer } from "./officerSession";

let inFlight: Promise<boolean> | null = null;

async function run(): Promise<boolean> {
  // Officers authenticate against the separate User Management cookies.
  if (isOfficer()) {
    try {
      const res = await fetch("/api/officer/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearOfficer();
        return false;
      }
      return true;
    } catch {
      // Network blip — keep the session and let the next tick retry rather than
      // logging out a user who is merely offline for a moment.
      return true;
    }
  }

  const session = loadSession();
  if (!session) return false;
  try {
    const tokens = await refresh(session.refreshToken);
    if (tokens.accessToken) saveSession(tokens);
    return true;
  } catch (err) {
    // Only a definitive rejection means the cookie is gone/expired.
    const rejected = err instanceof ApiError && (err.status === 401 || err.status === 403);
    if (rejected) {
      clearSession();
      return false;
    }
    return true;
  }
}

/** Confirm with the server that the session cookie is still valid. Clears the
 * local session and resolves false when it isn't. Concurrent callers share one
 * request. */
export function verifySession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
