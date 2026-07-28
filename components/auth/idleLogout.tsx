"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { clearSession, loadSession, setSignoutNotice } from "@/lib/auth/session";
import { clearProfile } from "@/lib/auth/profile";
import { clearPeople } from "@/app/registry/peopleStore";
import { clearRegistration } from "@/app/registry/registrationStore";
import { isOfficer, clearOfficer } from "@/lib/auth/officerSession";
import {
  deleteClientCookie,
  getClientCookie,
  setClientCookie,
} from "@/lib/auth/clientCookies";

// Sign the user out after true inactivity. Officers use a shorter limit on
// shared workstations, but activity detection must cover form work (nested
// scroll panels, wheel, typing) or active users get false idle timeouts.
const CITIZEN_IDLE_LIMIT_MS = 15 * 60 * 1000;
const OFFICER_IDLE_LIMIT_MS = 10 * 60 * 1000;
const ACTIVITY_KEY = "icrcs-last-activity";
const ACTIVITY_COOKIE_THROTTLE_MS = 5000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "pointerdown",
  "click",
] as const;

// Public routes that don't need idle tracking
const PUBLIC_ROUTES = ["/login", "/create-profile", "/forgot"];

function idleLimitMs(): number {
  return isOfficer() ? OFFICER_IDLE_LIMIT_MS : CITIZEN_IDLE_LIMIT_MS;
}

export default function IdleLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCookieWriteRef = useRef(0);
  /** In-memory last activity — always fresh; cookie is only for cross-tab sync. */
  const lastActivityRef = useRef(Date.now());
  const signedOutRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  const performSignOut = useCallback(async () => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;

    if (isOfficer()) {
      try {
        await fetch("/api/officer/logout", { method: "POST", credentials: "include" });
      } catch {
        // ignore — clear the local officer session regardless
      }
      clearOfficer();
      clearRegistration();
      clearPeople();
      deleteClientCookie(ACTIVITY_KEY);
      setSignoutNotice("idle");
      router.push("/login");
      return;
    }

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
    // The auto-saved draft is session cache — an idle timeout ENDS the session,
    // so wipe it rather than leaving an applicant's data on an unattended
    // workstation. Submitted stages remain on the backend.
    clearRegistration();
    clearPeople();
    deleteClientCookie(ACTIVITY_KEY);
    // Inform the user WHY they were signed out — the login screen shows a notice.
    setSignoutNotice("idle");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    // Don't track idle on public routes
    if (isPublicRoute) return;
    signedOutRef.current = false;

    function readLastActivity(): number {
      const cookieRaw = getClientCookie(ACTIVITY_KEY);
      const cookieTs = cookieRaw ? Number(cookieRaw) : NaN;
      const cookieVal = Number.isFinite(cookieTs) ? cookieTs : 0;
      // Prefer the newest of in-memory (this tab) and cookie (other tab).
      return Math.max(lastActivityRef.current, cookieVal);
    }

    // Schedule the auto-logout for whatever idle time remains since last activity.
    function arm() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!loadSession() && !isOfficer()) return;

      const elapsed = Date.now() - readLastActivity();
      const remaining = idleLimitMs() - elapsed;

      if (remaining <= 0) {
        void performSignOut();
        return;
      }
      idleTimerRef.current = setTimeout(() => void performSignOut(), remaining);
    }

    function onActivity() {
      const now = Date.now();
      lastActivityRef.current = now;
      // Throttle cookie writes (mousemove fires very frequently).
      if (now - lastCookieWriteRef.current > ACTIVITY_COOKIE_THROTTLE_MS) {
        lastCookieWriteRef.current = now;
        setClientCookie(ACTIVITY_KEY, String(now));
      }
      arm();
    }

    // Re-check when returning to the tab — it may have been idle while hidden.
    function onVisible() {
      if (document.visibilityState === "visible") arm();
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastCookieWriteRef.current = now;
    setClientCookie(ACTIVITY_KEY, String(now));

    // Capture phase so nested overflow panels (wizard / tables) still count as
    // activity — window 'scroll' alone never sees those.
    // Use the same capture option shape on add/remove so listeners detach reliably
    // (boolean `true` does not match an options-object registration in all browsers).
    const activityOpts: AddEventListenerOptions = { passive: true, capture: true };
    const removeOpts: EventListenerOptions = { capture: true };
    ACTIVITY_EVENTS.forEach((e) =>
      document.addEventListener(e, onActivity, activityOpts),
    );
    document.addEventListener("visibilitychange", onVisible);
    arm();
    // Re-arm periodically so a session that becomes active with no further
    // input (e.g. just after login) is still covered.
    const poll = setInterval(arm, 30 * 1000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(poll);
      ACTIVITY_EVENTS.forEach((e) =>
        document.removeEventListener(e, onActivity, removeOpts),
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isPublicRoute, performSignOut]);

  return null;
}
