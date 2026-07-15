"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OtpInput from "@/components/ui/otpInput";
import { useI18n } from "../i18n/localeProvider";
import { forgotPassword, verifyResetOtp, resetPassword } from "@/lib/api/auth";
import { getErrorMessage, ApiError } from "@/lib/api/client";
import { RULES } from "@/lib/validation/rules";
import { Eye, EyeOff, LoaderCircle, CircleCheck } from "lucide-react";

// The reset OTP is valid for 10 minutes, so resend is only offered after that
// (mirrors the create-profile OTP).
const OTP_RESEND_COOLDOWN = 180; // 10:00
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-navy-500 focus:bg-card focus:ring-2 focus:ring-navy-500/15";
const labelClass = "block text-sm font-medium text-navy-700";

function EyeIcon({ open }: { open: boolean }) {
  return open ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />;
}

function Spinner() {
  return <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />;
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={met ? "text-success" : "text-muted/50"}>
        <CircleCheck size={15} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className={met ? "text-ink" : "text-muted"}>{label}</span>
    </li>
  );
}

// Persist just enough of the reset flow (per-tab) so a page refresh returns to
// the same step instead of dropping back to "request OTP". Only step/identifier/
// profileId are kept — never the OTP code or the new password.
const FORGOT_STATE_KEY = "icrcs-forgot-state";
// False only on a fresh document load (a hard refresh); stays true across
// client-side navigations, so arriving at /forgot from the login link starts
// clean while a refresh mid-flow resumes.
let forgotMountedInSession = false;

function readRestorableForgot(): { step: 2 | 3; identifier: string; profileId: string } | null {
  if (typeof window === "undefined" || forgotMountedInSession) return null;
  try {
    const raw = sessionStorage.getItem(FORGOT_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { step?: number; identifier?: string; profileId?: string };
    // Only steps 2 (verify OTP) and 3 (new password) are resumable, and both
    // need a profileId to talk to the backend.
    if ((s.step === 2 || s.step === 3) && typeof s.profileId === "string" && s.profileId) {
      return {
        step: s.step,
        identifier: typeof s.identifier === "string" ? s.identifier : "",
        profileId: s.profileId,
      };
    }
  } catch {
    // ignore malformed state
  }
  return null;
}

export default function ForgotFlow() {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => readRestorableForgot()?.step ?? 1);
  const [identifier, setIdentifier] = useState(() => readRestorableForgot()?.identifier ?? "");
  const [profileId, setProfileId] = useState(() => readRestorableForgot()?.profileId ?? "");
  const [code, setCode] = useState("");
  const [otpInvalid, setOtpInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Resend-OTP cooldown (seconds) + state.
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // After the first mount, any later mount is a client-side navigation (which
  // should start the flow clean); only a fresh document load (refresh) resumes.
  useEffect(() => {
    forgotMountedInSession = true;
  }, []);

  // Persist the resumable part of the flow so a refresh returns to the same step.
  // Steps 1 (identifier) and 4 (success) are not resumable, so clear there.
  useEffect(() => {
    try {
      if (step === 2 || step === 3) {
        sessionStorage.setItem(
          FORGOT_STATE_KEY,
          JSON.stringify({ step, identifier, profileId }),
        );
      } else {
        sessionStorage.removeItem(FORGOT_STATE_KEY);
      }
    } catch {
      // ignore — sessionStorage unavailable
    }
  }, [step, identifier, profileId]);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendIn > 0]);

  const hasMin = password.length >= RULES.PASSWORD_MIN;
  const hasCapital = RULES.PASSWORD_HAS_CAPITAL.test(password);
  const hasLower = RULES.PASSWORD_HAS_LOWER.test(password);
  const hasDigit = RULES.PASSWORD_HAS_DIGIT.test(password);
  const hasSpecial = RULES.PASSWORD_HAS_SPECIAL.test(password);
  const allMet = hasMin && hasCapital && hasLower && hasDigit && hasSpecial;
  const matches = password === confirm && confirm.length > 0;

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError(t("forgot.identifierRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await forgotPassword(identifier.trim());
      setProfileId(res.profileId);
      setResent(false);
      setResendIn(OTP_RESEND_COOLDOWN);
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err, t("forgot.error")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || resending) return;
    setResending(true);
    setError("");
    setResent(false);
    try {
      const res = await forgotPassword(identifier.trim());
      setProfileId(res.profileId);
      setResent(true);
      setResendIn(OTP_RESEND_COOLDOWN);
    } catch (err) {
      setError(getErrorMessage(err, t("forgot.error")));
    } finally {
      setResending(false);
    }
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length < RULES.OTP_LENGTH) {
      setOtpInvalid(true);
      setError(t("forgot.otpIncomplete"));
      return;
    }
    if (!profileId) {
      setError(t("forgot.error"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await verifyResetOtp(profileId, code);
      setStep(3);
    } catch (err) {
      // The only thing verified at this step is the OTP, so a failure means the
      // code is wrong/expired — say so explicitly (never "wrong credentials").
      // A genuine server/gateway outage still surfaces its own message.
      setOtpInvalid(true);
      const serverDown = err instanceof ApiError && err.status >= 500;
      setError(serverDown ? getErrorMessage(err, t("forgot.error")) : t("forgot.otpIncorrect"));
    } finally {
      setSubmitting(false);
    }
  }


  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allMet || !matches) return;
    setSubmitting(true);
    setError("");
    try {
      await resetPassword(profileId, password, confirm);
      setStep(4);
    } catch (err) {
      setError(getErrorMessage(err, t("forgot.error")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy-700">
          {t("forgot.title")}
        </h2>
        {step < 4 && <p className="mt-1 text-sm text-muted">{t("forgot.subtitle")}</p>}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {/* Step 1 — identifier */}
      {step === 1 && (
        <form onSubmit={handleSend} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="identifier" className={labelClass}>
              {t("forgot.identifier")}
            </label>
            <input
              id="identifier"
              value={identifier}
              maxLength={RULES.UI_EMAIL_MAX}
              onChange={(e) => { setIdentifier(e.target.value); if (error) setError(""); }}
              onBlur={() => {
                const v = identifier.trim();
                if (!v) {
                  setError(t("forgot.identifierRequired"));
                } else if (v.includes("@") && !EMAIL_RE.test(v)) {
                  setError(t("forgot.identifierInvalid"));
                } else if (!v.includes("@") && v.replace(/\D/g, "").length < 7) {
                  setError(t("forgot.identifierInvalid"));
                }
              }}
              placeholder={t("forgot.identifierPlaceholder")}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-70"
          >
            {submitting && <Spinner />}
            {submitting ? t("forgot.sending") : t("forgot.sendCode")}
          </button>
        </form>
      )}

      {/* Step 2 — OTP */}
      {step === 2 && (
        <form onSubmit={handleVerify} className="space-y-5">
          <p className="text-center text-sm text-muted">
            {t("forgot.otpSentTo")}{" "}
            <span className="font-semibold text-navy-700">{identifier.trim()}</span>
          </p>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              if (otpInvalid) setOtpInvalid(false);
            }}
            invalid={otpInvalid}
          />
          {resent && (
            <p className="text-center text-xs font-medium text-success">
              {t("forgot.resent")}
            </p>
          )}
          <button
            type="submit"
            disabled={code.length < RULES.OTP_LENGTH || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? t("forgot.verifying") : t("forgot.verify")}
          </button>
          <p className="text-center text-sm text-muted">
            {t("forgot.noCode")}{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || resending}
              className="inline-flex items-center gap-1.5 font-semibold text-gold-700 transition hover:text-gold disabled:cursor-not-allowed disabled:text-muted disabled:hover:text-muted"
            >
              {resending && <Spinner />}
              {resending
                ? t("forgot.resending")
                : resendIn > 0
                  ? t("forgot.resendIn").replace("{seconds}", String(resendIn))
                  : t("forgot.resend")}
            </button>
          </p>
        </form>
      )}

      {/* Step 3 — new password */}
      {step === 3 && (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className={labelClass}>
              {t("forgot.newPassword")}
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t("form.hidePassword") : t("form.showPassword")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:text-navy-700"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className={labelClass}>
              {t("forgot.confirm")}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} pr-11 ${confirm.length > 0 && !matches ? "border-danger" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? t("form.hidePassword") : t("form.showPassword")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:text-navy-700"
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-danger">{t("password.mismatch")}</p>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface/60 px-4 py-3">
            <p className="text-sm font-semibold text-navy-700">{t("password.requirements")}</p>
            <ul className="mt-2 space-y-1.5 pl-1 text-sm">
              <Requirement met={hasMin} label={t("password.reqMin")} />
              <Requirement met={hasCapital} label={t("password.reqCapital")} />
              <Requirement met={hasLower} label={t("password.reqLower")} />
              <Requirement met={hasDigit} label={t("password.reqDigit")} />
              <Requirement met={hasSpecial} label={t("password.reqSpecial")} />
              <Requirement met={matches} label={t("password.reqMatch")} />
            </ul>
          </div>

          <button
            type="submit"
            disabled={!allMet || !matches || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? t("forgot.resetting") : t("forgot.reset")}
          </button>
        </form>
      )}

      {/* Step 4 — success */}
      {step === 4 && (
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CircleCheck size={28} aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold text-navy-700">{t("forgot.successTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("forgot.successMsg")}</p>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-gold-700 hover:text-gold">
          {t("forgot.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
