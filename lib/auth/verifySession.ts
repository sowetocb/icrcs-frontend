"use client";

// Authoritative "is this session still alive?" check.
//
// The logged-in flag is a session cookie (see lib/auth/session.ts), and the real
// credential is an HttpOnly SESSION cookie that the browser drops when it closes.
// Those two can still disagree after a crash/restore, so we ask the SERVER:
// refresh succeeds only if the auth cookie survived. Calls are de-duplicated
// through a single in-flight promise so the guard and the keep-alive can both
// ask without racing (and without rotating a refresh token twice).

import { refresh, refreshOfficerSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, loadSession, saveSession } from "./session";
import { isOfficer, clearOfficer } from "./officerSession";
import { clearProfile } from "./profile";

let inFlight: Promise<boolean> | null = null;

function isAuthRejection(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

async function run(): Promise<boolean> {
  // Officers authenticate against the separate User Management cookies.
  if (isOfficer()) {
    try {
      await refreshOfficerSession();
      return true;
    } catch (err) {
      // Only a definitive rejection ends the session. Network blips / 5xx must
      // NOT log out an officer who is still working.
      if (isAuthRejection(err)) {
        clearOfficer();
        return false;
      }
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
    if (isAuthRejection(err)) {
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
  if (!inFlight) {
    inFlight = run().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
