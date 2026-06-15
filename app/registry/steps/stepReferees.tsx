"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { loadProfile } from "@/lib/auth/profile";
import { openRefereesForm } from "@/lib/api/registration";

/**
 * Stage 7 — Referees (Print Only).
 * No data is submitted. The applicant downloads/prints the compiled referees
 * form (GET /stage7), collects physical signatures, and later uploads the
 * scanned copy in Stage 8.
 */
export default function StepReferees() {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setError("");
    setDownloading(true);
    const subjectId = loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ?? "";
    const ok = await openRefereesForm(subjectId);
    if (!ok) setError(t("registry.refereesDownloadError"));
    setDownloading(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface/30 p-6 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-700/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-700" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-bold text-navy-700">
          {t("registry.refereesTitle")}
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
          {t("registry.refereesInfo")}
        </p>

        {/* <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? t("registry.refereesDownloading") : t("registry.refereesDownload")}
        </button> */}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>

      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm font-medium text-navy-700">
          <span className="mr-2">ℹ️</span>
          {t("registry.refereesNote")}
        </p>
      </div>
    </div>
  );
}
