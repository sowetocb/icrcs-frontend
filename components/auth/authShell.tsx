"use client";

import { useEffect, useState } from "react";
import LanguageSwitcher from "@/app/i18n/languageSwitcher";
import { useI18n } from "@/app/i18n/localeProvider";
import { getApplicationStatus, type ApplicationStatus } from "@/lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import { LOGO_EMBLEM, LOGO_COAT_OF_ARMS } from "@/lib/assets";
import { ABOUT_GUIDE } from "./aboutGuide";
import { X, ShieldCheck, ArrowRight, Info, LoaderCircle } from "lucide-react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

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
        <div className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-br from-navy-700 to-navy-900 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-icrcs-gold-light/80">
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
            <X size={20} aria-hidden="true" />
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
  wide = false,
}: {
  children: React.ReactNode;
  /** Render the "Security: Status Check" widget in the left panel. Shown on the
   *  login screen only; hidden on create-profile / forgot flows. */
  showStatusCheck?: boolean;
  /** Widen the card + give the form more of the split, so a longer form (e.g.
   *  Create Profile) fits without vertical scrolling. */
  wide?: boolean;
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

  // Status check + About ICRCS are shown in two places with different colour
  // themes: on the deep-blue left panel (desktop) and below the form (mobile).
  // `dark` picks the palette so the same markup works on both backgrounds.
  const renderStatusCheck = (dark: boolean) => (
    <div className="w-full">
      <div
        className={`rounded-xl border p-3.5 ${
          dark ? "border-white/15 bg-white/10 backdrop-blur-sm" : "border-line bg-surface"
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className={dark ? "text-green-300" : "text-success"} size={14} aria-hidden="true" />
          <span className={`text-[12px] font-bold uppercase tracking-wider ${dark ? "text-white/90" : "text-navy-700"}`}>
            {t("status.heading")}
          </span>
        </div>
        <p className={`mt-1.5 text-[11px] ${dark ? "text-white" : "text-muted"}`}>
          {t("status.label")}
        </p>
        <form onSubmit={checkStatus} className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            placeholder={t("status.placeholder")}
            aria-label="Authorization ID"
            className={`min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm tracking-wider outline-none transition ${
              dark
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15"
                : "border-line bg-card text-ink placeholder:text-muted/50 focus:border-navy-500"
            }`}
          />
          <button
            type="submit"
            disabled={statusLoading}
            aria-label={t("status.verify")}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition disabled:opacity-50 ${
              dark ? "bg-white/20 hover:bg-white/30" : "bg-navy-700 hover:bg-navy-500"
            }`}
          >
            {statusLoading ? (
              <LoaderCircle className="animate-spin h-4 w-4 text-white" aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
        </form>
        {statusError && (
          <p role="alert" className={`mt-1.5 text-xs ${dark ? "text-red-300" : "text-danger"}`}>
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
          <div className={`mt-3 rounded-xl border p-4 text-center ${dark ? "border-white/15 bg-white/10 backdrop-blur-sm" : "border-line bg-surface"}`}>
            <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${dark ? "bg-white/15 text-white" : "bg-navy-700/10 text-navy-700"}`}>
              <span className={`h-2 w-2 rounded-full ${dark ? "bg-green-300" : "bg-success"}`} />
              {statusLabel(statusResult.status)}
            </span>

            {incomplete ? (
              <>
                <p className={`mt-3 text-xs font-medium ${dark ? "text-white" : "text-ink"}`}>
                  {t("status.incomplete")}
                </p>
                <div className={`mt-2 space-y-1.5 text-left text-xs ${dark ? "text-white/85" : "text-muted"}`}>
                  <p>
                    <span className={dark ? "text-white/70" : "text-muted"}>{t("status.atStage")}: </span>
                    <span className={`font-semibold ${dark ? "" : "text-ink"}`}>
                      {stage >= 1 ? `${t("registry.s" + stage + "Tag").split(" - ")[0]} — ` : ""}
                      {stageName(stage)}
                    </span>
                  </p>
                  <p>
                    <span className={dark ? "text-white/70" : "text-muted"}>{t("status.nextStage")}: </span>
                    <span className={`font-semibold ${dark ? "text-green-200" : "text-success"}`}>
                      {`${t("registry.s" + (stage + 1) + "Tag").split(" - ")[0]} — `}
                      {stageName(stage + 1)}
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <p className={`mt-3 text-xs leading-relaxed ${dark ? "text-icrcs-gold-light/80" : "text-muted"}`}>
                {t("status.hint")}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );

  const renderAbout = (dark: boolean) => (
    <button
      type="button"
      onClick={() => setAboutOpen(true)}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition ${
        dark
          ? "border-white/15 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
          : "border-line bg-surface text-navy-700 hover:bg-line/40"
      }`}
    >
      <Info size={15} aria-hidden="true" />
      {t("about.trigger")}
    </button>
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Tanzania flag-inspired background */}
      <div className="tz-flag-bg fixed inset-0 opacity-30" />
      <div className="fixed inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/60 backdrop-blur-[2px]" />

      {/* Top bar — single official banner: coat of arms · titles + flag strip · emblem */}
      <header className="relative z-20 border-b border-white/10 bg-navy-700">
        {/* Gold institutional accent bar (matches the ICRCS portal masthead). */}
        <div className="h-1 w-full bg-gold" aria-hidden="true" />
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-2.5 [@media(max-height:820px)]:py-1 sm:gap-6">
          {/* Left — national coat of arms */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_COAT_OF_ARMS}
            alt={t("brand.country")}
            width={124}
            height={124}
            className="h-16 w-16 shrink-0 object-contain [@media(max-height:820px)]:!h-14 [@media(max-height:820px)]:!w-14 sm:h-24 sm:w-24"
          />

          {/* Center — three titles + national flag strip */}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-white/80 sm:text-sm">
              {t("brand.country")}
            </p>
            <p className="font-display text-sm font-bold text-white sm:text-base">
              {t("brand.ministry")}
            </p>
            <p className="font-display text-base font-black uppercase tracking-tight text-white sm:text-lg">
              {t("brand.servicesDepartment")}
            </p>
            <span className="mt-1.5 flex h-1.5 w-56 max-w-full overflow-hidden rounded-full sm:w-56">
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
            className="h-16 w-16 shrink-0 object-contain [@media(max-height:820px)]:!h-14 [@media(max-height:820px)]:!w-14 sm:h-24 sm:w-24"
          />
        </div>
      </header>

      {/* Language switcher — floats below the header, right-aligned, with no
          visible background bar. */}
      <div className="relative z-20 flex items-center justify-end px-6 py-1">
        <LanguageSwitcher variant="onLight" />
      </div>

      {/* Main — centered split card */}
      <main className={`relative z-10 flex flex-1 flex-col items-center px-4 sm:px-6 ${wide ? "justify-start py-2 sm:py-3" : "justify-center py-4"}`}>
        {/* The split card. On mobile the left panel is hidden and its status
            check + "About ICRCS" are rendered below the form instead. */}
        <div className={`flex w-full overflow-hidden rounded-2xl bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ${wide ? "max-w-5xl" : "max-w-4xl"}`}>
          {/* Left panel — deep blue with coat of arms + status check (desktop only) */}
          <div className={`hidden flex-col items-center justify-start gap-4 bg-gradient-to-br from-navy-700 via-navy-500 to-navy-900 px-5 py-5 md:flex ${wide ? "md:w-[34%]" : "w-[42%]"}`}>
            {/* Immigration emblem + branding — on top. The emblem sits on a light
                pad so its blue ribbons and gold lettering stay legible against
                the deep-blue panel. */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-white/95 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_EMBLEM}
                  alt={t("brand.servicesDepartment")}
                  width={200}
                  height={200}
                  className="h-auto w-28 object-contain"
                />
              </div>
              {/* <div className="mt-5 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-icrcs-gold-light/80">
                  {t("brand.country")}
                </p>
                <p className="mt-1 font-display text-base font-bold text-white">
                  {t("brand.servicesDepartment")}
                </p>
              </div> */}
            </div>

            {/* Status check (login only) + About ICRCS — dark theme for the
                deep-blue panel. On mobile these render below the form instead. */}
            {showStatusCheck && renderStatusCheck(true)}
            {renderAbout(true)}
          </div>

          {/* Right panel — form only */}
          <div className={`flex w-full flex-col justify-center px-6 sm:px-8 ${wide ? "py-4 md:w-[66%] sm:px-8" : "py-5 md:w-[58%]"}`}>
            {/* Form (LoginForm / CreateProfileFlow / ForgotFlow) */}
            {children}

            {/* Mobile-only: the left panel is hidden below md, so the status
                check (login only) + About ICRCS live here, below the form and
                above the footer. Wrapped in the same deep-blue panel so they
                keep their bluish look on the white card. */}
            <div className="mt-6 space-y-3 rounded-2xl bg-gradient-to-br from-navy-700 via-navy-500 to-navy-900 p-4 md:hidden">
              {showStatusCheck && renderStatusCheck(true)}
              {renderAbout(true)}
            </div>

            {/* Footer — text and version kept together on a single line */}
            <p className="mt-3 flex items-baseline justify-center gap-2 whitespace-nowrap text-center text-[13px] text-muted">
              {t("footer")}
              {APP_VERSION && <span className="text-xs text-muted/70">v{APP_VERSION}</span>}
            </p>
          </div>
        </div>
      </main>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
