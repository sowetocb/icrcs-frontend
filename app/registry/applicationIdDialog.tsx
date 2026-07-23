"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../i18n/localeProvider";
import { Send, Download, LoaderCircle } from "lucide-react";

export default function ApplicationIdDialog({
  open,
  applicationId,
  email,
  onDownload,
  onContinue,
}: {
  open: boolean;
  applicationId: string;
  email: string;
  /** Download the current registration form PDF. Returns false on failure. */
  onDownload?: () => Promise<boolean>;
  onContinue: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onContinue();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onContinue]);

  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("registry.idDialogTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <Send size={32} aria-hidden="true" />
        </span>

        <h2 className="mt-5 font-display text-xl font-bold text-navy-700">
          {t("registry.idDialogTitle")}
        </h2>

        <div className="mt-5 rounded-xl bg-navy-700 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-200">
            {t("registry.applicationId")}
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wide text-gold">
            {applicationId}
          </p>
          {email && (
            <p className="mt-2 break-all text-xs text-navy-200">
              {t("registry.idDialogEmailed").replace("{email}", email)}
            </p>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {t("registry.idDialogHelp")}
        </p>

        {onDownload && (
          <button
            type="button"
            disabled={downloading}
            onClick={async () => {
              if (downloading) return;
              setDownloading(true);
              try {
                await onDownload();
              } finally {
                setDownloading(false);
              }
            }}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700 py-3 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {t("registry.idDialogDownload")}
          </button>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="mt-3 w-full rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500"
        >
          {t("registry.idDialogContinue")}
        </button>
      </div>
    </div>
  );
}
