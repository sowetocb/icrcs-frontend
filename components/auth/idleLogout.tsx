"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { clearSession, loadSession } from "@/lib/auth/session";
import { clearProfile } from "@/lib/auth/profile";
import { clearPeople } from "@/app/registry/peopleStore";
import { useI18n } from "@/app/i18n/localeProvider";

// Sign the user out after 15 minutes of inactivity (no mouse/keyboard/scroll/
// touch). The warning appears one minute earlier so the humble notice and its
// countdown together land the logout at exactly the 15-minute mark.
const WARNING_COUNTDOWN_S = 60; // 1 minute humble warning before forced logout
const IDLE_LIMIT_MS = 15 * 60 * 1000 - WARNING_COUNTDOWN_S * 1000; // 14 min → warn
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
  const { t } = useI18n();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_S);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastWriteRef = useRef(0);
  const warningActiveRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  const performSignOut = useCallback(async () => {
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
    setShowWarning(false);
    warningActiveRef.current = false;
    router.push("/login");
  }, [router]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
  }, []);

  const startWarningCountdown = useCallback(() => {
    if (warningActiveRef.current) return; // already showing
    warningActiveRef.current = true;
    setShowWarning(true);
    setCountdown(WARNING_COUNTDOWN_S);

    let remaining = WARNING_COUNTDOWN_S;
    clearCountdown();
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearCountdown();
        void performSignOut();
      }
    }, 1000);
  }, [clearCountdown, performSignOut]);

  // Dismiss warning and reset activity timer
  const handleStayLoggedIn = useCallback(() => {
    warningActiveRef.current = false;
    setShowWarning(false);
    clearCountdown();
    // Reset activity timestamp
    const now = Date.now();
    window.localStorage.setItem(ACTIVITY_KEY, String(now));
    lastWriteRef.current = now;
  }, [clearCountdown]);

  useEffect(() => {
    // Don't track idle on public routes
    if (isPublicRoute) return;

    function readLastActivity(): number {
      const raw = window.localStorage.getItem(ACTIVITY_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : Date.now();
    }

    // Schedule the warning for whatever idle time remains since last activity.
    function arm() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!loadSession()) return; // only guard a live session
      if (warningActiveRef.current) return; // don't re-arm while warning is shown

      const elapsed = Date.now() - readLastActivity();
      const remaining = IDLE_LIMIT_MS - elapsed;

      if (remaining <= 0) {
        startWarningCountdown();
        return;
      }
      idleTimerRef.current = setTimeout(
        () => startWarningCountdown(),
        remaining,
      );
    }

    function onActivity() {
      // If the warning dialog is showing, ignore activity events —
      // the user must explicitly click "Stay Logged In" or wait for logout.
      if (warningActiveRef.current) return;

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
      clearCountdown();
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, onActivity),
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isPublicRoute, startWarningCountdown, clearCountdown]);

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const progressPct = (countdown / WARNING_COUNTDOWN_S) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("idle.title")}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line bg-warning/5 px-6 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-warning"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-navy-700">
              {t("idle.title")}
            </h3>
            <p className="text-xs text-muted">{t("idle.subtitle")}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 text-center">
          <p className="text-sm leading-relaxed text-ink/80">
            {t("idle.message")}
          </p>

          {/* Countdown */}
          <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-warning/20 bg-warning/5">
            <span className="font-mono text-2xl font-bold text-warning">
              {timeDisplay}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progressPct}%`,
                backgroundColor:
                  countdown <= 15
                    ? "var(--color-danger)"
                    : "var(--color-warning)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("idle.autoLogout")}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => void performSignOut()}
            className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-line hover:text-danger"
          >
            {t("idle.logoutNow")}
          </button>
          <button
            type="button"
            onClick={handleStayLoggedIn}
            className="flex-1 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            {t("idle.stayLoggedIn")}
          </button>
        </div>
      </div>
    </div>
  );
}
