"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "../i18n/localeProvider";
import { getErrorMessage } from "@/lib/api/client";
import { useLookup } from "@/components/lookup/useLookup";
import { getGenders, type LookupItem } from "@/lib/api/lookup";
import ProfilePhoneInput from "./profilePhoneInput";

export type Gender = "" | "M" | "F" | "O";

/** The genders lookup returns a name ("MALE"/"FEMALE") and sometimes a code.
 * Normalise to the M/F/O code the profile + registration use everywhere. */
function genderCode(item: LookupItem): Gender {
  if (item.code) return item.code.toUpperCase() as Gender;
  const n = item.name.trim().toUpperCase();
  if (n.startsWith("M")) return "M";
  if (n.startsWith("F")) return "F";
  return "O";
}

// Static fallback when the lookup is unavailable (offline / auth-bypass).
const FALLBACK_GENDERS: LookupItem[] = [
  { id: 1, name: "MALE", code: "M" },
  { id: 2, name: "FEMALE", code: "F" },
];

export type RegistrationDetails = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: Gender;
  phoneNumber: string;
  email: string;
  password: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-navy-500 focus:bg-card focus:ring-2 focus:ring-navy-500/15";
const labelClass = "block text-sm font-medium text-navy-700";
const errorRing = "border-danger focus:border-danger focus:ring-danger/15";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  );
}

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

/** A single password requirement that has not yet been met. */
function UnmetRequirement({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs text-danger">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{label}</span>
    </li>
  );
}

export default function StepDetails({
  defaultValues,
  onNext,
}: {
  defaultValues: RegistrationDetails;
  onNext: (data: RegistrationDetails) => void | Promise<void>;
}) {
  const { t } = useI18n();

  // Gender options come from the lookup API; fall back to the static list when
  // it's unavailable. The value is the M/F/O code used across the app, but the
  // label renders exactly what the API returns (e.g. "Ke (Female)", "Me (Male)").
  const { options: genderItems } = useLookup(getGenders, []);
  const genderOptions = (genderItems.length ? genderItems : FALLBACK_GENDERS).map(
    (item) => ({ value: genderCode(item), label: item.name }),
  );

  const [form, setForm] = useState<RegistrationDetails>(defaultValues);
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegistrationDetails, boolean>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const hasMin = form.password.length >= 8;
  const hasCapital = /[A-Z]/.test(form.password);
  const hasSpecial = /[^A-Za-z0-9]/.test(form.password);
  const allMet = hasMin && hasCapital && hasSpecial;
  const matches = form.password === confirm && confirm.length > 0;
  const confirmInvalid = touchedConfirm && confirm.length > 0 && !matches;

  const firstNameInvalid = Boolean(errors.firstName);
  const lastNameInvalid = Boolean(errors.lastName);
  const genderInvalid = Boolean(errors.gender);
  const phoneInvalid = Boolean(errors.phoneNumber);
  const emailInvalid = Boolean(errors.email);
  const passwordInvalid = Boolean(errors.password);

  function update<K extends keyof RegistrationDetails>(
    key: K,
    value: RegistrationDetails[K],
  ) {
    let next = value;
    // Name fields accept letters only (plus spaces, hyphens and apostrophes for
    // compound names) — no digits or other symbols.
    if (key === "firstName" || key === "middleName" || key === "lastName") {
      next = (value as string).replace(/[^\p{L} '-]/gu, "") as RegistrationDetails[K];
    }
    setForm((f) => ({ ...f, [key]: next }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  }

  // Build a field-specific "X is required." message (universal pattern).
  const req = (label: string) => t("register.isRequired").replace("{field}", label);

  // Phone is invalid when empty OR when it has fewer than 7 digits.
  const [phoneFormatError, setPhoneFormatError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouchedConfirm(true);
    setPhoneFormatError(false);

    const phoneDigits = form.phoneNumber.replace(/[^\d]/g, "");
    const phoneBad = !form.phoneNumber.trim() || phoneDigits.length < 7;

    const next: Partial<Record<keyof RegistrationDetails, boolean>> = {
      firstName: !form.firstName.trim(),
      lastName: !form.lastName.trim(),
      gender: !form.gender,
      phoneNumber: phoneBad,
      email: !EMAIL_RE.test(form.email.trim()),
      password: !allMet,
    };
    setErrors(next);
    if (phoneBad && form.phoneNumber.trim()) setPhoneFormatError(true);
    if (Object.values(next).some(Boolean) || !matches) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      await onNext({
        ...form,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        password: form.password,
      });
    } catch (err) {
      setSubmitting(false);
      setSubmitError(getErrorMessage(err, t("register.error")));
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy-700">
          {t("register.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("register.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className={labelClass}>
              {t("register.firstName")}
            </label>
            <input
              id="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Ally"
              aria-invalid={firstNameInvalid}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              className={`${inputClass} ${errors.firstName ? errorRing : ""}`}
            />
            {errors.firstName && (
              <FieldError id="firstName-error" message={req(t("register.firstName"))} />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="middleName" className={labelClass}>
              {t("register.middleName")}
            </label>
            <input
              id="middleName"
              autoComplete="additional-name"
              value={form.middleName}
              onChange={(e) => update("middleName", e.target.value)}
              placeholder="Test"
              className={inputClass}
            /> 
            {errors.firstName && (
              <FieldError id="middleName-error" message={req(t("register.middleName"))} />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className={labelClass}>
              {t("register.lastName")}
            </label>
            <input
              id="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="User"
              aria-invalid={lastNameInvalid}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
              className={`${inputClass} ${errors.lastName ? errorRing : ""}`}
            />
            {errors.lastName && (
              <FieldError id="lastName-error" message={req(t("register.lastName"))} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <label htmlFor="gender" className={labelClass}>
              {t("register.gender")}
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value as Gender)}
              aria-invalid={genderInvalid}
              aria-describedby={errors.gender ? "gender-error" : undefined}
              className={`${inputClass} appearance-none ${form.gender ? "text-ink" : "text-muted/70"} ${errors.gender ? errorRing : ""}`}
            >
              <option value="" disabled>
                {t("register.genderSelect")}
              </option>
              {genderOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {errors.gender && (
              <FieldError id="gender-error" message={req(t("register.gender"))} />
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="email" className={labelClass}>
              {t("form.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={t("form.emailPlaceholder")}
              aria-invalid={emailInvalid}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`${inputClass} ${errors.email ? errorRing : ""}`}
            />
            {errors.email && (
              <FieldError
                id="email-error"
                message={form.email.trim() ? t("form.emailInvalid") : req(t("form.email"))}
              />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
            <label htmlFor="phoneNumber" className={labelClass}>
              {t("register.phone")}
            </label>
            <ProfilePhoneInput
              id="phoneNumber"
              value={form.phoneNumber}
              onChange={(v) => update("phoneNumber", v)}
              invalid={phoneInvalid}
              ariaLabel={t("register.phone")}
              describedBy={errors.phoneNumber ? "phoneNumber-error" : undefined}
            />
            {errors.phoneNumber && (
              <FieldError id="phoneNumber-error" message={phoneFormatError ? t("register.phoneInvalid") : req(t("register.phone"))} />
            )}
          </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className={labelClass}>
            {t("password.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
              aria-invalid={passwordInvalid}
              className={`${inputClass} pr-11 ${errors.password ? errorRing : ""}`}
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
          {/* Only requirements that are not yet met are shown, individually. */}
          {form.password.length > 0 && !allMet && (
            <ul className="space-y-1 pl-0.5">
              {!hasMin && <UnmetRequirement label={t("password.reqMin")} />}
              {!hasCapital && <UnmetRequirement label={t("password.reqCapital")} />}
              {!hasSpecial && <UnmetRequirement label={t("password.reqSpecial")} />}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className={labelClass}>
            {t("password.confirm")}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouchedConfirm(true)}
              placeholder="••••••••"
              className={`${inputClass} pr-11 ${confirmInvalid ? errorRing : ""}`}
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
          {confirmInvalid && (
            <FieldError id="confirm-error" message={t("password.mismatch")} />
          )}
        </div>

        {submitError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {submitting && <Spinner />}
          {submitting ? t("register.submitting") : t("register.next")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-gold-700 hover:text-gold">
          {t("register.signIn")}
        </Link>
      </p>
    </>
  );
}
