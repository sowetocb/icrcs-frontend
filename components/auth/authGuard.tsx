"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { loadSession, subscribeSession, setSignoutNotice } from "@/lib/auth/session";
import { isOfficer, subscribeOfficer } from "@/lib/auth/officerSession";
import {
  clearBrowserStorage,
  deleteClientCookie,
} from "@/lib/auth/clientCookies";
import { verifySession } from "@/lib/auth/verifySession";
import { PageSkeleton } from "@/components/ui/skeleton";

// Remembers, for the lifetime of the tab, that we've already confirmed a live
// session. Because /dashboard, /registry, /registry/people, … are separate
// route segments, AuthGuard remounts on every client navigation; without this
// flag each remount would start unauthorized and flash the full-screen
// "Verifying session…" spinner. Once verified, later navigations render the
// protected content immediately (no flash).
let sessionVerified = false;

/**
 * Client-side route guard. Wraps protected page content and redirects
 * unauthenticated users to /login. Renders nothing (null) while checking
 * so protected content never flashes to unauthenticated eyes.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(sessionVerified);

  useEffect(() => {
    let alive = true;
    // CRITICAL: wipe Local Storage / Session Storage — session lives in cookies only.
    clearBrowserStorage();
    deleteClientCookie("icrcs-officer-gate");
    // A citizen session OR an officer session (government user) both grant access.
    const loggedIn = !!loadSession() || isOfficer();
    if (!loggedIn) {
      // Not logged in — redirect to login
      sessionVerified = false;
      setAuthorized(false);
      router.replace("/login");
      return;
    }
    // Already confirmed against the server earlier in this page load — in-app
    // navigation doesn't need to re-check.
    if (sessionVerified) {
      setAuthorized(true);
      return;
    }
    // FRESH PAGE LOAD (including a browser restart that restored the tabs).
    // The logged-in flag is a session cookie; HttpOnly tokens may still be gone
    // after a browser restart — ask the server before showing protected UI.
    verifySession().then((ok) => {
      if (!alive) return;
      if (ok) {
        sessionVerified = true;
        setAuthorized(true);
      } else {
        sessionVerified = false;
        setAuthorized(false);
        setSignoutNotice("expired");
        router.replace("/login");
      }
    });
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  // When the tab becomes visible again, re-check with the server. Cookies can
  // expire or be revoked while the tab was backgrounded; sessionVerified would
  // otherwise skip verification for the rest of the tab's lifetime.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const loggedIn = !!loadSession() || isOfficer();
      if (!loggedIn) return;

      verifySession().then((ok) => {
        if (ok) {
          sessionVerified = true;
          setAuthorized(true);
          return;
        }
        sessionVerified = false;
        setAuthorized(false);
        setSignoutNotice("expired");
        router.replace("/login");
      });
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // React to a sign-out (or idle/expiry) that happened in ANOTHER tab: the
  // shared localStorage flag is cleared there, this fires here, and we drop the
  // user to /login so no tab keeps showing protected content after logout.
  useEffect(() => {
    // Redirect to /login only when BOTH the citizen and officer sessions are
    // gone (a sign-out in another tab), so an officer isn't dropped by a citizen
    // flag change (and vice-versa).
    const check = () => {
      if (!loadSession() && !isOfficer()) {
        sessionVerified = false;
        setAuthorized(false);
        router.replace("/login");
      }
    };
    const unsubSession = subscribeSession(check);
    const unsubOfficer = subscribeOfficer(check);
    return () => {
      unsubSession();
      unsubOfficer();
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-surface px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
