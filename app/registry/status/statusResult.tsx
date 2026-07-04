"use client";

import Link from "next/link";
import { useI18n } from "../../i18n/localeProvider";
import { type LookupResult } from "./lookup";
import { type ApplicationStatus } from "../../../lib/api/registry";
import { Check, ArrowRight } from "lucide-react";

const PROCESS_STAGES = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
const FORM_STEPS = ["s1Title", "s2Title", "s3Title", "s4Title", "s5Title", "s6Title"] as const;

type StatusResultData = LookupResult | ApplicationStatus;

function formatBoolean(value: boolean, t: (key: string) => string) {
  return value ? t("registry.yes") : t("registry.no");
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const key = `registry.status_${status}`;
  const label = t(key);
  return label === key ? status.replace(/_/g, " ") : label;
}

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED" || s === "ACTIVE")
    return { bg: "bg-success/10", text: "text-success", dot: "bg-success" };
  if (s === "REJECTED" || s === "DENIED" || s === "CANCELLED")
    return { bg: "bg-danger/10", text: "text-danger", dot: "bg-danger" };
  return { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" };
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${min}`;
}

// Map a backend status to the 5-stage process timeline (0-based):
//   0 Submitted · 1 Enrolled · 2 Assessed · 3 Approved · 4 Status Issued
// A PENDING_<NEXT> status sits on the last completed milestone (e.g.
// PENDING_ASSESSMENT means the applicant is Enrolled, awaiting assessment).
function getPostSubmissionStageIndex(status: string, currentStage: number): number {
  const s = status.toUpperCase();
  if (s === "ACTIVE" || s === "COMPLETED" || s === "ISSUED" || s === "STATUS_ISSUED")
    return 4;
  if (s === "APPROVED" || s === "PENDING_ISSUANCE") return 3;
  if (s === "ASSESSED" || s === "PENDING_APPROVAL" || s === "IN_REVIEW") return 2;
  if (s === "ENROLLED" || s === "PENDING_ASSESSMENT" || s === "BIOMETRICS") return 1;
  if (s === "SUBMITTED" || s === "PENDING_ENROLLMENT") return 0;

  if (currentStage >= 6) {
    return Math.min(currentStage - 6, PROCESS_STAGES.length - 1);
  }
  return 0;
}

function CheckIcon() {
  return <Check size={14} strokeWidth={3} aria-hidden="true" />;
}

function Timeline({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="mt-3">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex gap-3">
            <span className="flex flex-col items-center self-stretch">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-navy-700 text-white"
                      : "border border-line bg-card text-muted"
                }`}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              {i < labels.length - 1 && (
                <span className={`mt-1 w-px flex-1 ${done ? "bg-success" : "bg-line"}`} />
              )}
            </span>
            <span className="pb-5">
              <span
                className={`block text-sm font-semibold ${
                  done || active ? "text-navy-700" : "text-muted"
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function StatusResult({
  result,
  onContinue,
}: {
  result: StatusResultData;
  /** When provided (e.g. on the login page), the continue action calls this
   * instead of navigating to the registry — used to prompt sign-in. */
  onContinue?: () => void;
}) {
  const { t } = useI18n();
  const continueClass =
    "inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400";
  const continueArrow = <ArrowRight size={16} aria-hidden="true" />;

  const isBackendStatus = !("kind" in result);

  if (isBackendStatus) {
    const isIncomplete = result.status === "PENDING" && result.currentStage < 6;

    if (isIncomplete) {
      const nextStep = result.currentStage + 1;
      return (
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("registry.checkResultTitle")}
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-navy-700">{result.subjectId}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
              <span className="h-2 w-2 rounded-full bg-warning" />
              {t("registry.statusIncompleteBadge")}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm text-ink">{t("registry.statusIncompleteMsg")}</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold text-muted">{t("registry.statusNextStep")}: </span>
              <span className="font-bold text-navy-700">
                {t(`registry.s${nextStep}Tag`).split(" - ")[0]} —{" "}
                {t(`registry.s${nextStep}Title`)}
              </span>
            </p>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("registry.statusFormProgress")}
          </p>
          <Timeline labels={FORM_STEPS.map((k) => t(`registry.${k}`))} current={result.currentStage} />

          {onContinue ? (
            <button type="button" onClick={onContinue} className={continueClass}>
              {t("registry.statusContinue")}
              {continueArrow}
            </button>
          ) : (
            <Link href="/registry" className={continueClass}>
              {t("registry.statusContinue")}
              {continueArrow}
            </Link>
          )}
        </div>
      );
    }

    const activeStageIndex = getPostSubmissionStageIndex(result.status, result.currentStage);
    const sc = statusColor(result.status);
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("registry.checkResultTitle")}
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold text-navy-700">
              {result.subjectId}
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${sc.bg} ${sc.text}`}>
            <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
            {getStatusLabel(result.status, t)}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line/80 bg-navy-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("registry.checkCurrent")}
            </p>
            <p className="mt-2 text-sm font-semibold text-navy-700">
              {t(`registry.${PROCESS_STAGES[activeStageIndex]}`)}
            </p>
          </div>
          <div className="rounded-lg border border-line/80 bg-card p-4">
            <div className="space-y-2 text-sm text-navy-600">
              <div>
                <span className="font-semibold text-navy-700">{t("registry.statusEmailVerified")}:</span>{" "}
                {formatBoolean(result.emailVerified, t)}
              </div>
              <div>
                <span className="font-semibold text-navy-700">{t("registry.statusActive")}:</span>{" "}
                {formatBoolean(result.isActive, t)}
              </div>
              <div>
                <span className="font-semibold text-navy-700">{t("registry.statusCreatedAt")}:</span>{" "}
                {formatDate(result.createdAt)}
              </div>
              <div>
                <span className="font-semibold text-navy-700">{t("registry.statusUpdatedAt")}:</span>{" "}
                {formatDate(result.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Timeline labels={PROCESS_STAGES.map((k) => t(`registry.${k}`))} current={activeStageIndex} />
        </div>
      </div>
    );
  }

  if (result.kind === "processing") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("registry.checkResultTitle")}
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold text-navy-700">{result.id}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            {t(`registry.${PROCESS_STAGES[result.stage]}`)}
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("registry.checkCurrent")}
        </p>
        <Timeline labels={PROCESS_STAGES.map((k) => t(`registry.${k}`))} current={result.stage} />
      </div>
    );
  }

  if (result.kind === "incomplete") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("registry.checkResultTitle")}
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold text-navy-700">{result.id}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
            <span className="h-2 w-2 rounded-full bg-warning" />
            {t("registry.statusIncompleteBadge")}
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-ink">{t("registry.statusIncompleteMsg")}</p>
          <p className="mt-2 text-sm">
            <span className="font-semibold text-muted">{t("registry.statusNextStep")}: </span>
            <span className="font-bold text-navy-700">
              {t(`registry.s${result.step}Tag`).split(" - ")[0]} —{" "}
              {t(`registry.s${result.step}Title`)}
            </span>
          </p>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("registry.statusFormProgress")}
        </p>
        <Timeline labels={FORM_STEPS.map((k) => t(`registry.${k}`))} current={result.step - 1} />

        {onContinue ? (
          <button type="button" onClick={onContinue} className={continueClass}>
            {t("registry.statusContinue")}
            {continueArrow}
          </button>
        ) : (
          <Link href="/registry" className={continueClass}>
            {t("registry.statusContinue")}
            {continueArrow}
          </Link>
        )}
      </div>
    );
  }

  return null;
}
