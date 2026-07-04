"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { unlockAccount } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useI18n } from "@/app/i18n/localeProvider";
import { LoaderCircle, CircleCheck, CircleAlert, ArrowRight } from "lucide-react";

type Status = "pending" | "success" | "error";

function Spinner() {
  return <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />;
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
            <CircleCheck size={32} aria-hidden="true" />
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
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
            <CircleAlert size={32} aria-hidden="true" />
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
