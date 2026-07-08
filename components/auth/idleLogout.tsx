"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { clearSession, loadSession, setSignoutNotice } from "@/lib/auth/session";
import { clearProfile } from "@/lib/auth/profile";
import { clearPeople } from "@/app/registry/peopleStore";

// Sign the user out after 15 minutes of inactivity (no mouse/keyboard/scroll/
// touch). There is no warning dialog — when the session lapses the user is
// signed out and sent to /login immediately.
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const ACTIVITY_KEY = "icrcs-last-activity";
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

// Public routes that don't need idle tracking
const PUBLIC_ROUTES = ["/login", "/create-profile", "/forgot"];

export default function IdleLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastWriteRef = useRef(0);
  const signedOutRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  const performSignOut = useCallback(async () => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    const session = loadSession();
    if (!session) return;
    if (session.refreshToken) {
      try {
        await logout(session.refreshToken);
      } catch {
        // ignore — clear the local session regardless
      }
    }
    clearSession();
    clearProfile();
    // Keep the in-progress registration draft (cached by Application ID) so an
    // unsubmitted registration survives an idle auto-logout and can be resumed.
    clearPeople();
    window.localStorage.removeItem(ACTIVITY_KEY);
    // Inform the user WHY they were signed out — the login screen shows a notice.
    setSignoutNotice("idle");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    // Don't track idle on public routes
    if (isPublicRoute) return;
    signedOutRef.current = false;

    function readLastActivity(): number {
      const raw = window.localStorage.getItem(ACTIVITY_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : Date.now();
    }

    // Schedule the auto-logout for whatever idle time remains since last activity.
    function arm() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!loadSession()) return; // only guard a live session

      const elapsed = Date.now() - readLastActivity();
      const remaining = IDLE_LIMIT_MS - elapsed;

      if (remaining <= 0) {
        void performSignOut();
        return;
      }
      idleTimerRef.current = setTimeout(() => void performSignOut(), remaining);
    }

    function onActivity() {
      const now = Date.now();
      // Throttle localStorage writes (activity events fire very frequently).
      if (now - lastWriteRef.current > 5000) {
        lastWriteRef.current = now;
        window.localStorage.setItem(ACTIVITY_KEY, String(now));
      }
      arm();
    }

    // Re-check when returning to the tab — it may have been idle while hidden.
    function onVisible() {
      if (document.visibilityState === "visible") arm();
    }

    window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    lastWriteRef.current = Date.now();
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", onVisible);
    arm();
    // Re-arm periodically so the timer also covers a session that becomes
    // active (e.g. just after login) with no further input.
    const poll = setInterval(arm, 60 * 1000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(poll);
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, onActivity),
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isPublicRoute, performSignOut]);

  return null;
}
