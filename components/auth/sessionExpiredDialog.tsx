"use client";

import { useEffect } from "react";
import { useI18n } from "@/app/i18n/localeProvider";
import { Clock } from "lucide-react";

/**
 * Blocking dialog shown when the session has expired (and was cleared). It can't
 * be dismissed — the only action signs the user out to the login screen.
 */
export default function SessionExpiredDialog({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onSignIn();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSignIn]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-body"
    >
      {/* Backdrop — intentionally not dismissable. */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="px-6 py-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock size={24} aria-hidden="true" />
          </span>
          <h2 id="session-expired-title" className="mt-4 font-display text-lg font-bold text-navy-700">
            {t("session.expiredTitle")}
          </h2>
          <p id="session-expired-body" className="mt-2 text-sm leading-relaxed text-muted">
            {t("session.expiredBody")}
          </p>
        </div>
        <div className="border-t border-line px-6 py-4">
          <button
            type="button"
            autoFocus
            onClick={onSignIn}
            className="w-full rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            {t("session.signIn")}
          </button>
        </div>
      </div>
    </div>
  );
}
