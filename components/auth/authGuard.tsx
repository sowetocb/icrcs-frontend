"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { loadSession, subscribeSession } from "@/lib/auth/session";
import { isOfficer, subscribeOfficer } from "@/lib/auth/officerSession";

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
    // A citizen session OR an officer session (government user) both grant access.
    const loggedIn = !!loadSession() || isOfficer();
    if (!loggedIn) {
      // Not logged in — redirect to login
      sessionVerified = false;
      setAuthorized(false);
      router.replace("/login");
    } else {
      sessionVerified = true;
      setAuthorized(true);
    }
  }, [pathname, router]);

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
    // Show a loading shimmer while we check auth / redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
          <p className="text-sm text-muted">Verifying session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
