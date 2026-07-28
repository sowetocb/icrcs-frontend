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
let softInFlight: Promise<boolean> | null = null;

function isAuthRejection(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

async function run(opts: { logoutOnFailure: boolean }): Promise<boolean> {
  // Officers authenticate against the separate User Management cookies.
  if (isOfficer()) {
    try {
      await refreshOfficerSession();
      return true;
    } catch (err) {
      // Keep-alive / background refresh must NOT log out a user mid-form when
      // refresh is flaky. Only AuthGuard's hard check (or withFreshAuth) clears.
      if (opts.logoutOnFailure && isAuthRejection(err)) {
        clearOfficer();
        void fetch("/api/officer/logout", { method: "POST", credentials: "include" });
        return false;
      }
      // Soft failure or transient — treat as still logged in.
      return !isAuthRejection(err) || !opts.logoutOnFailure;
    }
  }

  const session = loadSession();
  if (!session) return false;
  try {
    const tokens = await refresh(session.refreshToken);
    if (tokens.accessToken) saveSession(tokens);
    return true;
  } catch (err) {
    if (opts.logoutOnFailure && isAuthRejection(err)) {
      clearSession();
      clearProfile();
      return false;
    }
    return !isAuthRejection(err) || !opts.logoutOnFailure;
  }
}

/** Confirm with the server that the session cookie is still valid.
 * @param options.logoutOnFailure When false (keep-alive), a failed refresh does
 *   not clear the session — avoids kicking officers out mid-registration. */
export function verifySession(options?: {
  logoutOnFailure?: boolean;
}): Promise<boolean> {
  const logoutOnFailure = options?.logoutOnFailure !== false;
  if (logoutOnFailure) {
    if (!inFlight) {
      inFlight = run({ logoutOnFailure: true }).finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }
  if (!softInFlight) {
    softInFlight = run({ logoutOnFailure: false }).finally(() => {
      softInFlight = null;
    });
  }
  return softInFlight;
}
