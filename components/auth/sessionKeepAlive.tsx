"use client";

import { useEffect } from "react";
import { verifySession } from "@/lib/auth/verifySession";
import { loadSession } from "@/lib/auth/session";
import { isOfficer } from "@/lib/auth/officerSession";

// Proactively refresh the access token so it never expires mid-use. All paths
// go through verifySession() so AuthGuard / keep-alive / API retries share ONE
// in-flight refresh — critical when the backend rotates refresh tokens.
const REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export default function SessionKeepAlive() {
  useEffect(() => {
    let active = true;

    async function keepAlive() {
      if (!active) return;
      if (!loadSession() && !isOfficer()) return;
      // Soft verify: never clear the session on a failed background refresh.
      // Logging out mid-form is worse than a briefly stale access token.
      await verifySession({ logoutOnFailure: false });
    }

    // Warm the session once on mount (shares AuthGuard's in-flight request).
    void keepAlive();
    const id = setInterval(() => void keepAlive(), REFRESH_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void keepAlive();
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
