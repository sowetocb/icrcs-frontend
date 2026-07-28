"use client";

// Authoritative "is this session still alive?" check.
//
// The logged-in flag is a session cookie (see lib/auth/session.ts), and the real
// credential is an HttpOnly SESSION cookie that the browser drops when it closes.
// Those two can still disagree after a crash/restore, so we ask the SERVER:
// refresh succeeds only if the auth cookie survived. Calls are de-duplicated
// through a single in-flight promise so the guard and the keep-alive can both
// ask without racing.

import { refresh } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, loadSession, saveSession } from "./session";
import { isOfficer, clearOfficer } from "./officerSession";
import { clearProfile } from "./profile";

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
      clearProfile();
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
