"use client";

import { useI18n } from "@/app/i18n/localeProvider";

export default function HelpfulTip() {
  const { t } = useI18n();

  return (
    <div className="mt-6 flex gap-4 rounded-2xl border border-line bg-card p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
      <div>
        <h3 className="font-display text-base font-bold text-navy-700">
          {t("registry.tipTitle")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t("registry.tipBody")}
        </p>
      </div>
    </div>
  );
}
