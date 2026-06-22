"use client";

import { useEffect, useState } from "react";
import LanguageSwitcher from "@/app/i18n/languageSwitcher";
import { useI18n } from "@/app/i18n/localeProvider";
import { getApplicationStatus, type ApplicationStatus } from "@/lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import { LOGO_EMBLEM, LOGO_COAT_OF_ARMS } from "@/lib/assets";
import { ABOUT_GUIDE } from "./aboutGuide";

/** A gold bullet list item. */
function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      <span>{text}</span>
    </li>
  );
}

/** Modal showing the full "About ICRCS" applicant guide for the active locale. */
function AboutDialog({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const guide = ABOUT_GUIDE[locale];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("about.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-br from-[#1e4d8a] to-[#0d2a52] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">
              {guide.systemName}
            </p>
            <h2 id="about-title" className="mt-1 font-display text-xl font-bold text-white">
              {guide.heading}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("about.close")}
            className="shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-muted">{guide.intro}</p>

          {guide.sections.map((section, i) => (
            <section key={i} className="mt-6">
              <h3 className="font-display text-base font-bold text-navy-700">
                {section.title}
              </h3>
              {section.intro && (
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{section.intro}</p>
              )}

              {section.items && (
                <ul className="mt-2.5 space-y-1.5">
                  {section.items.map((item, j) => (
                    <Bullet key={j} text={item} />
                  ))}
                </ul>
              )}

              {section.groups && (
                <div className="mt-3 space-y-4">
                  {section.groups.map((group, j) => (
                    <div key={j}>
                      <p className="text-sm font-semibold text-navy-700">{group.title}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {group.items.map((item, k) => (
                          <Bullet key={k} text={item} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {section.steps && (
                <div className="mt-3 space-y-4">
                  {section.steps.map((step, j) => (
                    <div key={j} className="rounded-xl border border-line bg-surface/50 p-4">
                      <p className="text-sm font-semibold text-navy-700">{step.title}</p>
                      <ul className="mt-2 space-y-1.5">
                        {step.lines.map((line, k) => (
                          <Bullet key={k} text={line} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
          >
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Institutional login / registration shell.
 * Matches the Tanzania Immigration Services Department design:
 * - Tanzania flag-inspired wave background
 * - Split card: left = deep blue panel with emblem + status check,
 *               right = form only
 */
export default function AuthShell({
  children,
  showStatusCheck = false,
}: {
  children: React.ReactNode;
  /** Render the "Security: Status Check" widget in the left panel. Shown on the
   *  login screen only; hidden on create-profile / forgot flows. */
  showStatusCheck?: boolean;
}) {
  const { t } = useI18n();
  const [statusId, setStatusId] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusResult, setStatusResult] = useState<ApplicationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Resolve a localized status label, falling back to a readable form.
  function statusLabel(status: string) {
    const key = `registry.status_${status}`;
    const label = t(key);
    return label === key ? status.replace(/_/g, " ") : label;
  }

  async function checkStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = statusId.trim();
    if (!value || value.replace(/[^A-Z0-9]/gi, "").length < 6) {
      setStatusError(t("registry.checkInvalid"));
      setStatusResult(null);
      return;
    }

    setStatusError("");
    setStatusLoading(true);
    try {
      const result = await getApplicationStatus(value);
      setStatusResult(result);
    } catch (err) {
      setStatusResult(null);
      setStatusError(getErrorMessage(err, t("registry.checkFailed")));
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Tanzania flag-inspired background */}
      <div className="tz-flag-bg fixed inset-0 opacity-30" />
      <div className="fixed inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/60 backdrop-blur-[2px]" />

      {/* Top bar — single official banner: coat of arms · titles + flag strip · emblem */}
      <header className="relative z-20 border-b border-white/10 bg-[#16395c]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-5 px-6 py-5 sm:gap-8">
          {/* Left — national coat of arms */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_COAT_OF_ARMS}
            alt={t("brand.country")}
            width={124}
            height={124}
            className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24"
          />

          {/* Center — three titles + national flag strip */}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-white/80 sm:text-base">
              {t("brand.country")}
            </p>
            <p className="font-display text-base font-bold text-white sm:text-xl">
              {t("brand.ministry")}
            </p>
            <p className="font-display text-lg font-black uppercase tracking-tight text-white sm:text-2xl">
              {t("brand.servicesDepartment")}
            </p>
            <span className="mt-2 flex h-2 w-76 max-w-full overflow-hidden rounded-full sm:w-72">
              <span className="flex-1 bg-[#1eb53a]" />
              <span className="flex-1 bg-[#fcd116]" />
              <span className="flex-1 bg-black" />
              <span className="flex-1 bg-[#fcd116]" />
              <span className="flex-1 bg-[#00a3dd]" />
            </span>
          </div>

          {/* Right — immigration emblem */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_EMBLEM}
            alt={t("brand.servicesDepartment")}
            width={124}
            height={124}
            className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24"
          />
        </div>
      </header>

      {/* Language switcher — floats below the header, right-aligned, with no
          visible background bar. */}
      <div className="relative z-20 flex items-center justify-end px-6 py-2">
        <LanguageSwitcher />
      </div>

      {/* Main — centered split card */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        {/* The split card */}
        <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
          {/* Left panel — deep blue with coat of arms + status check */}
          <div className="hidden w-[42%] flex-col items-center justify-start gap-5 bg-gradient-to-br from-[#1e4d8a] via-[#1a3d6e] to-[#0d2a52] px-6 py-8 md:flex">
            {/* Immigration emblem + branding — on top.
                The emblem sits on a light pad so its blue ribbons and gold
                lettering stay legible against the deep-blue panel. */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-white/95 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_EMBLEM}
                  alt={t("brand.servicesDepartment")}
                  width={200}
                  height={200}
                  className="h-auto w-32 object-contain"
                />
              </div>
              <div className="mt-5 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-200/80">
                  {t("brand.country")}
                </p>
                <p className="mt-1 font-display text-base font-bold text-white">
                  {t("brand.servicesDepartment")}
                </p>
              </div>
            </div>

            {/* Status check — below the emblem. Shown on the login screen only. */}
            {showStatusCheck && (
            <div className="w-full">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-300" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white/90">
                    {t("status.heading")}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-white">
                  {t("status.label")}
                </p>
                <form onSubmit={checkStatus} className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                    placeholder={t("status.placeholder")}
                    aria-label="Authorization ID"
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm tracking-wider text-white outline-none transition placeholder:text-white/40 focus:border-white/40 focus:bg-white/15"
                  />
                  <button
                    type="submit"
                    disabled={statusLoading}
                    aria-label={t("status.verify")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50"
                  >
                    {statusLoading ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    )}
                  </button>
                </form>
                {statusError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-300">
                    {statusError}
                  </p>
                )}
              </div>

              {/* Inline status result — status + (for incomplete) the stage the
                  applicant is at and the next stage to complete. */}
              {statusResult && (() => {
                const TOTAL_STAGES = 9;
                const stage = statusResult.currentStage;
                const incomplete =
                  statusResult.status === "PENDING" && stage < TOTAL_STAGES;
                const stageName = (n: number) =>
                  n >= 1 && n <= TOTAL_STAGES
                    ? t(`registry.s${n}Title`)
                    : t("status.notStarted");
                return (
                  <div className="mt-3 rounded-xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur-sm">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-green-300" />
                      {statusLabel(statusResult.status)}
                    </span>

                    {incomplete ? (
                      <>
                        <p className="mt-3 text-xs font-medium text-white">
                          {t("status.incomplete")}
                        </p>
                        <div className="mt-2 space-y-1.5 text-left text-xs text-blue-100">
                          <p>
                            <span className="text-blue-200/70">{t("status.atStage")}: </span>
                            <span className="font-semibold">
                              {stage >= 1 ? `${t("registry.s" + stage + "Tag").split(" - ")[0]} — ` : ""}
                              {stageName(stage)}
                            </span>
                          </p>
                          <p>
                            <span className="text-blue-200/70">{t("status.nextStage")}: </span>
                            <span className="font-semibold text-green-200">
                              {`${t("registry.s" + (stage + 1) + "Tag").split(" - ")[0]} — `}
                              {stageName(stage + 1)}
                            </span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-xs leading-relaxed text-blue-200/80">
                        {t("status.hint")}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            )}

            {/* "About this system" — opens an info dialog. Sits below the status
                check on login, and below the emblem on create-profile. */}
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[12px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {t("about.trigger")}
            </button>
          </div>

          {/* Right panel — form only */}
          <div className="flex w-full flex-col justify-center px-8 py-8 sm:px-12 md:w-[58%]">
            {/* Form (LoginForm / CreateProfileFlow / ForgotFlow) */}
            {children}

            {/* Footer */}
            <p className="mt-4 text-center text-xs text-muted">
              {t("footer")}
            </p>
          </div>
        </div>
      </main>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
