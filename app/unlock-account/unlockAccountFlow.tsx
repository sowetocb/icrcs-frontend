"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { unlockAccount } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useI18n } from "@/app/i18n/localeProvider";

type Status = "pending" | "success" | "error";

function Spinner() {
  return (
    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function UnlockAccountFlow() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>("pending");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg(t("unlock.missingToken"));
      return;
    }
    unlockAccount(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMsg(getErrorMessage(err, t("unlock.error")));
      });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full text-center">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy-700">
          {t("unlock.title")}
        </h2>
      </div>

      {status === "pending" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-navy-700"><Spinner /></span>
          <p className="text-sm text-muted">{t("unlock.verifying")}</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-navy-700">{t("unlock.successTitle")}</p>
            <p className="text-sm text-muted">{t("unlock.successMsg")}</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-500"
          >
            {t("unlock.signIn")}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-navy-700">{t("unlock.errorTitle")}</p>
            <p className="text-sm text-muted">{errorMsg || t("unlock.error")}</p>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-navy-700 transition hover:text-gold-700"
          >
            {t("unlock.backToLogin")}
          </Link>
        </div>
      )}
    </div>
  );
}
