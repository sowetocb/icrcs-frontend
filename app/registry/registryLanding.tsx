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
  return <ArrowRightIcon size={16} aria-hidden="true" />;
}

export default function RegistryLanding({
  onStart,
  onResume,
  selfDone,
  hasIncomplete,
  ownerApproved,
}: {
  onStart: () => void;
  onResume: () => void;
  selfDone: boolean;
  hasIncomplete: boolean;
  /** The account holder's own registration has been APPROVED by an officer. */
  ownerApproved: boolean;
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
      // afterwards it means register a dependent.
      title: selfDone ? t("registry.startDependentTitle") : t("registry.startOwnerTitle"),
      desc: selfDone ? t("registry.startDependentDesc") : t("registry.startOwnerDesc"),
      action: t("registry.startAction"),
      onClick: onStart,
      // Rule 2: can't start a new one while a registration is incomplete.
      // Rule 3: can't register a dependent until the holder is APPROVED.
      disabled: hasIncomplete || dependentBlocked,
      note: hasIncomplete
        ? t("registry.finishFirstNote")
        : dependentBlocked
          ? t("registry.approvalRequiredNote")
          : undefined,
    },
    {
      key: "resume",
      Icon: ResumeIcon,
      title: t("registry.resumeTitle"),
      desc: t("registry.resumeDesc"),
      action: t("registry.resumeAction"),
      onClick: onResume,
      disabled: !hasIncomplete,
      note: !hasIncomplete ? t("registry.nothingToResume") : undefined,
    },
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
    <main className="flex flex-1 flex-col justify-center px-4 py-5 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {/* Intro */}
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-navy-700 sm:text-4xl">
              {t("registry.landingTitle")}
              <br />
              <span className="text-gold">{t("registry.landingTitleAccent")}</span>
            </h1>
            <p className="mt-6 max-w-lg leading-relaxed text-muted">
              {t("registry.landingIntro")}
            </p>
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
                  <Icon />
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
