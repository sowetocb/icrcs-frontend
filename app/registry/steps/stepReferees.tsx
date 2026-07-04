"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { loadProfile } from "@/lib/auth/profile";
import { openRefereesForm } from "@/lib/api/registration";
import { Users, Download } from "lucide-react";

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
          <Users className="text-navy-700" size={32} strokeWidth={1.5} aria-hidden="true" />
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
          <Download size={18} aria-hidden="true" />
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
