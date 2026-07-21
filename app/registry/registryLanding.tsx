"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/localeProvider";
import {
  FileText,
  RotateCcw,
  Search,
  ArrowRight as ArrowRightIcon,
} from "lucide-react";

type IconProps = { className?: string };

function FormIcon({ className }: IconProps) {
  return <FileText className={className} size={24} strokeWidth={1.8} aria-hidden="true" />;
}
function ResumeIcon({ className }: IconProps) {
  return <RotateCcw className={className} size={24} strokeWidth={1.8} aria-hidden="true" />;
}
function StatusIcon({ className }: IconProps) {
  return <Search className={className} size={24} strokeWidth={1.8} aria-hidden="true" />;
}

function ArrowRight() {
  // rem-based so it scales with the root font (screen-size responsive).
  return <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />;
}

export default function RegistryLanding({
  onStart,
  onResume,
  selfDone,
  hasIncomplete,
  ownerApproved,
  officerMode = false,
}: {
  onStart: () => void;
  onResume: () => void;
  selfDone: boolean;
  hasIncomplete: boolean;
  /** The account holder's own registration has been APPROVED by an officer. */
  ownerApproved: boolean;
  /** Officer mode — hides citizen-specific cards and adjusts labels. */
  officerMode?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  // Once the account holder is registered, "start" means registering a dependent
  // — which is only permitted after their own registration is APPROVED.
  const dependentBlocked = selfDone && !ownerApproved;

  const cards = [
    {
      key: "start",
      Icon: FormIcon,
      // Before the profile owner is done, "start" means register yourself;
      // afterwards it means register a dependent. Officers always see a generic title.
      title: officerMode
        ? t("registry.officerStartTitle")
        : selfDone ? t("registry.startDependentTitle") : t("registry.startOwnerTitle"),
      desc: officerMode
        ? t("registry.officerStartDesc")
        : selfDone ? t("registry.startDependentDesc") : t("registry.startOwnerDesc"),
      action: t("registry.startAction"),
      onClick: onStart,
      // Officers: always allowed to start a new registration (even with
      // incomplete cases — each "+ New Registration" creates a fresh case).
      // Citizens: can't start a new one while a registration is incomplete,
      //           and can't register a dependent until the holder is APPROVED.
      disabled: officerMode ? false : (hasIncomplete || dependentBlocked),
      note: officerMode
        ? undefined
        : hasIncomplete
          ? t("registry.finishFirstNote")
          : dependentBlocked
            ? t("registry.approvalRequiredNote")
            : undefined,
    },
    {
      key: "resume",
      Icon: ResumeIcon,
      title: officerMode ? t("registry.officerResumeTitle") : t("registry.resumeTitle"),
      desc: officerMode ? t("registry.officerResumeDesc") : t("registry.resumeDesc"),
      action: t("registry.resumeAction"),
      onClick: onResume,
      disabled: !hasIncomplete,
      note: !hasIncomplete ? t("registry.nothingToResume") : undefined,
    },
    // Status card — always available for both officers and citizens.
    {
      key: "status",
      Icon: StatusIcon,
      title: t("registry.statusTitle"),
      desc: t("registry.statusDesc"),
      action: t("registry.statusAction"),
      onClick: () => router.push("/registry/status"),
      disabled: false,
      note: undefined,
    },
  ];

  return (
    <main className="flex flex-1 flex-col px-4 py-8 lg:px-8 lg:py-10">
      {/* Centred within the content area (mx-auto) so the two columns sit in the
          middle of the page, consistent with the officer cases / people views. */}
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {/* Intro */}
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-navy-700 sm:text-4xl">
              {officerMode ? t("registry.officerLandingTitle") : t("registry.landingTitle")}
              <br />
              <span className="text-gold">
                {officerMode ? t("registry.officerLandingTitleAccent") : t("registry.landingTitleAccent")}
              </span>
            </h1>
            <div className="mt-6 max-w-lg space-y-3 leading-relaxed text-muted">
              {(officerMode ? t("registry.officerLandingIntro") : t("registry.landingIntro"))
                .split("\n")
                .filter((para) => para.trim().length > 0)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {cards.map(({ key, Icon, title, desc, action, onClick, disabled, note }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-disabled={disabled}
                className="group flex flex-col rounded-xl border border-line bg-card p-5 text-left transition hover:border-gold/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-line disabled:hover:shadow-none"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  {/* rem-based size so the glyph scales with the root font (which
                      scales by screen size), not a fixed 24px. */}
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-3 text-lg font-bold text-navy-700">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
                {note ? (
                  <span className="mt-3 text-xs font-medium text-warning">{note}</span>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 transition group-hover:gap-2.5">
                    {action}
                    <ArrowRight />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
