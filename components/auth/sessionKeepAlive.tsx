"use client";

import { useEffect } from "react";
import { refresh } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, loadSession, saveSession } from "@/lib/auth/session";
import { isOfficer, clearOfficer } from "@/lib/auth/officerSession";

// Proactively refresh the access token so it never expires mid-use. The interval
// is shorter than typical access-token TTLs; the reactive refresh in
// withFreshAuth covers anything that still slips through.
const REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

/** Officer-specific keep-alive — hits /api/officer/refresh (separate cookies). */
async function refreshOfficerToken(): Promise<boolean> {
  const res = await fetch("/api/officer/refresh", {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export default function SessionKeepAlive() {
  useEffect(() => {
    let active = true;

    async function keepAlive() {
      const officerMode = isOfficer();
      const session = loadSession();

      // Officers have no citizen session — use the officer refresh endpoint.
      if (officerMode) {
        try {
          const ok = await refreshOfficerToken();
          if (!ok && active) clearOfficer();
        } catch {
          // transient — retry next tick
        }
        return;
      }

      // Citizen keep-alive.
      if (!session?.refreshToken) return;
      try {
        const tokens = await refresh(session.refreshToken);
        // refresh() always returns a refresh token (kept if not rotated), so
        // save whenever a fresh access token came back.
        if (active && tokens.accessToken) saveSession(tokens);
      } catch (err) {
        // Only drop the session when the refresh token is definitively rejected.
        // Transient/network errors keep the session — we retry next tick.
        const rejected =
          err instanceof ApiError && (err.status === 401 || err.status === 403);
        if (active && rejected) clearSession();
      }
    }

    keepAlive();
    const id = setInterval(keepAlive, REFRESH_INTERVAL_MS);
    // Refresh again as soon as the tab becomes visible after being backgrounded.
    function onVisible() {
      if (document.visibilityState === "visible") keepAlive();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
