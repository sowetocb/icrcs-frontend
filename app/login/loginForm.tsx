"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/localeProvider";
import { useToast } from "@/components/ui/toast";
import { getMyProfile } from "@/lib/api/auth";
import { saveSession, clearSession, takeSignoutNotice } from "@/lib/auth/session";
import { saveOfficer, clearOfficer, officerCanRegisterIcrcs } from "@/lib/auth/officerSession";
import { saveProfile, clearProfile } from "@/lib/auth/profile";
import { loadRegistration, clearRegistration } from "@/app/registry/registrationStore";
import { clearPeople } from "@/app/registry/peopleStore";
import { RULES } from "@/lib/validation/rules";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

// Practical email format: a local part of letters/digits/._%+- , an @, a
// domain of letters/digits/hyphens with at least one dot, and a ≥2-letter TLD.
// Stricter than "anything@anything.anything" so structured junk like
// "[[[@[[.co" is rejected, while every real-world address still passes.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Characters that can legitimately appear anywhere in an email address (the
// union of valid local-part and domain characters, plus the @). Anything else
// is stripped as the user types so they can't enter what would never validate.
const EMAIL_DISALLOWED = /[^A-Za-z0-9._%+\-@]/g;

// Government officers use `.go.tz` email addresses and authenticate against the
// SEPARATE User Management API (via /api/officer/login), not the citizen service.
const OFFICER_EMAIL = /\.go\.tz$/i;

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <EyeOff size={18} aria-hidden="true" />
  ) : (
    <Eye size={18} aria-hidden="true" />
  );
}

function Spinner() {
  return <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />;
}

export default function LoginForm() {
  const { t } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Explain an automatic sign-out (idle timeout / expired session) when the user
  // was dropped here — read once from the one-shot notice set before redirect.
  const [signoutNotice, setSignoutNotice] = useState("");
  useEffect(() => {
    const reason = takeSignoutNotice();
    if (reason) {
      setSignoutNotice(t(reason === "idle" ? "session.idleNotice" : "session.expiredNotice"));
    }
    // Run once on mount; `t` is stable for the active locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // ── Officer sign-in (.go.tz) — same form, SEPARATE service ───────────────
    // Officers authenticate against the User Management API via /api/officer/login
    // (username = their .go.tz email). On success their profile is cached
    // (icrcs-officer-*) and they go straight to the registry to register migrants.
    if (OFFICER_EMAIL.test(email.trim())) {
      let ores: Response;
      try {
        ores = await fetch("/api/officer/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: email.trim(), password }),
        });
      } catch {
        setSubmitting(false);
        setLoginError(t("form.connectionError"));
        return;
      }
      const odata = (await ores.json().catch(() => null)) as
        | { success?: boolean; error?: string; user?: Record<string, unknown> }
        | null;
      if (!ores.ok || !odata?.success) {
        setSubmitting(false);
        if (ores.status === 401) setLoginError(t("form.loginFailed"));
        else if (ores.status === 503) setLoginError(t("form.connectionError"));
        else setLoginError(odata?.error || t("form.connectionError"));
        return;
      }
      // Officers have no citizen session/profile — clear any stale one so the two
      // identities never mix on this browser.
      clearSession();
      clearProfile();
      saveOfficer({ roles: [], permissions: [], ...(odata.user ?? {}) });
      // A .go.tz account may authenticate for OTHER modules (RSICN / WEBSITE / …)
      // without any ICRCS right — deny access to the registry in that case.
      if (!officerCanRegisterIcrcs()) {
        clearOfficer();
        setSubmitting(false);
        setLoginError(t("form.officerNoIcrcs"));
        return;
      }
      notify(t("toast.loginSuccess"));
      router.push("/registry");
      return;
    }

    // Login via the server-side route that sets HttpOnly cookies — the tokens
    // never reach the browser (not in localStorage, not in the response body).
    // A throw here = the client couldn't reach the Next server at all (offline /
    // dev server down): a connection problem, NOT bad credentials.
    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: email.trim(), password }),
      });
    } catch {
      setSubmitting(false);
      setLoginError(t("form.connectionError"));
      return;
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string; code?: string }
        | null;
      setSubmitting(false);
      // Only a genuine 401 means the email/password is wrong. A 503 (or the
      // route's CONNECTION code) means the auth server is unreachable; any other
      // status surfaces the backend's actual reason (e.g. account locked) or a
      // generic connection message — never "invalid email or password" for a
      // failure that isn't about credentials.
      if (res.status === 401) setLoginError(t("form.loginFailed"));
      else if (res.status === 503 || data?.code === "CONNECTION") setLoginError(t("form.connectionError"));
      else setLoginError(data?.error || t("form.connectionError"));
      return;
    }

    // Mark the session as active (the actual tokens are in HttpOnly cookies).
    saveSession({ accessToken: "__httponly__", refreshToken: "__httponly__" });
    // Fetch the full profile once and cache it. Non-fatal: a failure here
    // shouldn't block sign-in — the dashboard can fall back gracefully.
    try {
      const profile = await getMyProfile("__httponly__");
      saveProfile(profile);
      // Drop any locally cached registration/people that belong to a different
      // account on this browser, so a new user never inherits a previous user's
      // "pending registration" draft.
      const draft = loadRegistration();
      if (draft && (draft.ownerId ?? "") !== (profile.profileId ?? "")) {
        clearRegistration();
        clearPeople();
      }
    } catch {
      // ignore — profile can be re-fetched later
    }
    notify(t("toast.loginSuccess"));
    router.push("/dashboard");
  }

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold text-navy-700">
          {t("brand.system")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("form.subtitle")}</p>
      </div>

      {signoutNotice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning"
        >
          {signoutNotice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            maxLength={RULES.UI_EMAIL_MAX}
            value={email}
            onChange={(e) => {
              // Strip any character that can't appear in an email so the user
              // can never type what wouldn't validate (e.g. brackets, quotes).
              const cleaned = e.target.value.replace(EMAIL_DISALLOWED, "");
              setEmail(cleaned);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            onBlur={() => {
              if (email.trim() && !EMAIL_RE.test(email.trim()))
                setErrors((p) => ({ ...p, email: t("form.emailInvalid") }));
            }}
            placeholder={t("form.emailPlaceholder")}
            aria-invalid={emailInvalid}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:bg-card focus:ring-2 ${
              errors.email
                ? "border-danger focus:border-danger focus:ring-danger/15"
                : "border-input-line focus:border-navy-700 focus:ring-navy-700/15"
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
              onBlur={() => {
                if (!password)
                  setErrors((p) => ({ ...p, password: t("form.passwordRequired") }));
              }}
              placeholder="••••••••"
              aria-invalid={passwordInvalid}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 pr-11 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:bg-card focus:ring-2 ${
                errors.password
                  ? "border-danger focus:border-danger focus:ring-danger/15"
                  : "border-input-line focus:border-navy-700 focus:ring-navy-700/15"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {submitting && <Spinner />}
          {submitting ? t("form.signingIn") : t("form.signIn")}
        </button>

        <Link
          href="/forgot"
          className="block text-center text-sm font-medium text-navy-700 transition hover:text-gold-700"
        >
          {t("form.forgot")}
        </Link>
      </form>

      <p className="mt-3 text-center text-sm text-muted">
        {t("form.noAccount")}{" "}
        <Link href="/create-profile" className="font-semibold text-navy-700 hover:text-gold-700">
          {t("form.register")}
        </Link>
      </p>
    </div>
  );
}
