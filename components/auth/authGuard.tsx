"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { loadSession, subscribeSession, setSignoutNotice } from "@/lib/auth/session";
import { isOfficer, subscribeOfficer } from "@/lib/auth/officerSession";
import { clearBrowserStorage } from "@/lib/auth/clientCookies";
import { verifySession } from "@/lib/auth/verifySession";
import { PageSkeleton } from "@/components/ui/skeleton";

// Remembers, for the lifetime of the tab, that we've already confirmed a live
// session. Because /dashboard, /registry, /registry/people, … are separate
// route segments, AuthGuard remounts on every client navigation; without this
// flag each remount would start unauthorized and flash the full-screen
// "Verifying session…" spinner. Once verified, later navigations render the
// protected content immediately (no flash).
let sessionVerified = false;

/** Call after a successful login so AuthGuard does not immediately refresh
 * (and risk rotating) a brand-new session. */
export function markSessionVerified() {
  sessionVerified = true;
}

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
    // Wipe leftover Local/Session Storage — session lives in cookies only.
    clearBrowserStorage();
    // A citizen session OR an officer session (government user) both grant access.
    const loggedIn = !!loadSession() || isOfficer();
    if (!loggedIn) {
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

  // When the tab becomes visible again, re-check with the server — but debounce
  // so a quick alt-tab doesn't race keep-alive / API refreshes (refresh-token
  // rotation would otherwise kill a live session).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const loggedIn = !!loadSession() || isOfficer();
      if (!loggedIn) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        verifySession().then((ok) => {
          if (ok) {
            sessionVerified = true;
            setAuthorized(true);
            return;
          }
          // verifySession only returns false on definitive 401/403.
          sessionVerified = false;
          setAuthorized(false);
          setSignoutNotice("expired");
          router.replace("/login");
        });
      }, 1500);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  // React to a sign-out that happened in ANOTHER tab.
  useEffect(() => {
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
