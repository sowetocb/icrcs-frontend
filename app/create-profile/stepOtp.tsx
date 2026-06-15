"use client";

import { useEffect, useState } from "react";
import OtpInput from "@/components/ui/otpInput";
import Modal from "@/components/ui/modal";
import { useI18n } from "../i18n/localeProvider";
import { getErrorMessage } from "@/lib/api/client";

const OTP_TTL = 179; // 02:59

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StepOtp({
  email,
  onNext,
}: {
  email: string;
  onNext: (code: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL);
  const [legal, setLegal] = useState<null | "terms" | "privacy">(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const expired = secondsLeft <= 0;

  async function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length < 6) {
      setInvalid(true);
      return;
    }
    setSubmitting(true);
    setVerifyError("");
    try {
      await onNext(code);
    } catch (err) {
      setSubmitting(false);
      setVerifyError(getErrorMessage(err, t("otp.verifyFailed")));
    }
  }

  function resend() {
    // TODO: POST /api/registration/otp/resend
    setCode("");
    setInvalid(false);
    setSecondsLeft(OTP_TTL);
  }

  return (
    <>
      <form onSubmit={handleNext} className="space-y-5">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-navy-700">
            {t("otp.title")}
          </h2>
          {email && (
            <p className="mt-1 break-all text-sm font-medium text-navy-500">
              {email}
            </p>
          )}
        </div>

        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (invalid) setInvalid(false);
          }}
          invalid={invalid}
        />

        <p className="text-center text-sm text-muted">
          {invalid ? (
            <span className="text-danger">{t("otp.invalid")}</span>
          ) : expired ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-danger">{t("otp.expired")}</span>
              <button
                type="button"
                onClick={resend}
                className="font-semibold text-gold-700 hover:text-gold"
              >
                {t("otp.resend")}
              </button>
            </span>
          ) : (
            <>
              {t("otp.expires")}{" "}
              <span className="font-mono font-semibold text-navy-700">
                {formatTime(secondsLeft)}
              </span>
            </>
          )}
        </p>

        {verifyError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm font-medium text-danger">
            {verifyError}
          </p>
        )}

        <button
          type="submit"
          disabled={code.length < 6 || expired || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {submitting && (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          )}
          {t("otp.next")}
        </button>

        <p className="text-center text-xs leading-relaxed text-muted">
          {t("otp.agree")}{" "}
          <button
            type="button"
            onClick={() => setLegal("terms")}
            className="font-semibold text-navy-700 underline underline-offset-2 hover:text-gold-700"
          >
            {t("otp.terms")}
          </button>{" "}
          {t("otp.and")}{" "}
          <button
            type="button"
            onClick={() => setLegal("privacy")}
            className="font-semibold text-navy-700 underline underline-offset-2 hover:text-gold-700"
          >
            {t("otp.privacy")}
          </button>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("otp.haveAccount")}{" "}
        <a href="/login" className="font-semibold text-gold-700 hover:text-gold">
          {t("otp.login")}
        </a>
      </p>

      <Modal
        open={legal === "terms"}
        onClose={() => setLegal(null)}
        title={t("legal.termsTitle")}
        closeLabel={t("legal.close")}
      >
        {t("legal.termsBody")}
      </Modal>
      <Modal
        open={legal === "privacy"}
        onClose={() => setLegal(null)}
        title={t("legal.privacyTitle")}
        closeLabel={t("legal.close")}
      >
        {t("legal.privacyBody")}
      </Modal>
    </>
  );
}
