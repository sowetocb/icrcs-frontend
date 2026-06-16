"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/localeProvider";
import { login, getMyProfile } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession } from "@/lib/auth/session";
import { saveProfile } from "@/lib/auth/profile";
import { loadRegistration, clearRegistration } from "@/app/registry/registrationStore";
import { clearPeople } from "@/app/registry/peopleStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailInvalid = Boolean(errors.email);
  const passwordInvalid = Boolean(errors.password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = t("form.emailInvalid");
    if (!password) nextErrors.password = t("form.passwordRequired");
    setErrors(nextErrors);
    setLoginError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const tokens = await login(email.trim(), password);
      saveSession(tokens);
      // Fetch the full profile once and cache it. Non-fatal: a failure here
      // shouldn't block sign-in — the dashboard can fall back gracefully.
      try {
        const profile = await getMyProfile(tokens.accessToken);
        saveProfile(profile);
        // Drop any locally cached registration/people that belong to a
        // different account on this browser, so a new user never inherits a
        // previous user's "pending registration" draft.
        const draft = loadRegistration();
        if (draft && (draft.ownerId ?? "") !== (profile.profileId ?? "")) {
          clearRegistration();
          clearPeople();
        }
      } catch {
        // ignore — profile can be re-fetched later
      }
      router.push("/dashboard");
    } catch (err) {
      setSubmitting(false);
      setLoginError(getErrorMessage(err, t("form.loginFailed")));
    }
  }

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy-700">
          {t("brand.system")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("form.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-navy-700">
            {t("form.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            placeholder={t("form.emailPlaceholder")}
            aria-invalid={emailInvalid}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:bg-card focus:ring-2 ${
              errors.email
                ? "border-danger focus:border-danger focus:ring-danger/15"
                : "border-line focus:border-[#1e4d8a] focus:ring-[#1e4d8a]/15"
            }`}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-xs text-danger">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-navy-700">
            {t("form.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="••••••••"
              aria-invalid={passwordInvalid}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 pr-11 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:bg-card focus:ring-2 ${
                errors.password
                  ? "border-danger focus:border-danger focus:ring-danger/15"
                  : "border-line focus:border-[#1e4d8a] focus:ring-[#1e4d8a]/15"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword ? t("form.hidePassword") : t("form.showPassword")
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:text-navy-700"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="text-xs text-danger">
              {errors.password}
            </p>
          )}
        </div>

        {loginError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {loginError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e4d8a] py-3 text-sm font-semibold text-white transition hover:bg-[#16396d] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {submitting && <Spinner />}
          {submitting ? t("form.signingIn") : t("form.signIn")}
        </button>

        <Link
          href="/forgot"
          className="block text-center text-sm font-medium text-[#1e4d8a] transition hover:text-gold-700"
        >
          {t("form.forgot")}
        </Link>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {t("form.noAccount")}{" "}
        <Link href="/create-profile" className="font-semibold text-[#1e4d8a] hover:text-gold-700">
          {t("form.register")}
        </Link>
      </p>

      {APP_VERSION && (
        <p className="mt-6 text-center text-xs text-muted/70">v{APP_VERSION}</p>
      )}
    </div>
  );
}
