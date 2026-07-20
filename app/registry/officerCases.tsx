"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/localeProvider";
import { loadOfficer } from "@/lib/auth/officerSession";
import { getOfficerCases, type OfficerCase } from "@/lib/api/officer";
import { toMigrantRegistrationType } from "@/lib/registry/registrationCategory";
import type { RegistrationType } from "@/lib/api/registration";
import {
  Plus,
  ArrowRight as ArrowRightIcon,
  RotateCcw,
  UserCheck,
  AlertCircle,
  FileText,
  LoaderCircle,
  Search,
} from "lucide-react";

// Status → badge color map
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-gold/15 text-gold-700",
  PENDING_ENROLLMENT: "bg-info/15 text-info",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

function statusKey(status: string): string {
  const s = status.toUpperCase().replace(/\s+/g, "_");
  if (s === "PENDING") return "officer.statusPending";
  if (s === "PENDING_ENROLLMENT") return "officer.statusPendingEnrollment";
  if (s === "APPROVED") return "officer.statusApproved";
  if (s === "REJECTED") return "officer.statusRejected";
  return "officer.statusPending";
}

function StageBar({ current, total = 9 }: { current: number; total?: number }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-navy-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy-500 to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs font-medium text-muted">{current}/{total}</span>
    </div>
  );
}

export default function OfficerCases({
  onResume,
  onStartNew,
}: {
  /** Resume a specific case: (subjectId, currentStage, registrationType). */
  onResume: (subjectId: string, stage: number, regType: RegistrationType | undefined) => void;
  /** Start a fresh registration (category picker). */
  onStartNew: () => void;
}) {
  const { t } = useI18n();
  const officer = loadOfficer();
  const [cases, setCases] = useState<OfficerCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function fetchCases() {
    setLoading(true);
    setError("");
    try {
      const page = await getOfficerCases({ scope: "mine" });
      setCases(page.items);
    } catch {
      setError(t("officer.casesError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active (in-progress) cases — PENDING with stages < 9
  const activeCases = cases.filter(
    (c) => c.status.toUpperCase() === "PENDING" && c.currentStage < 9,
  );

  // Auto-resume when exactly one active (in-progress) case
  useEffect(() => {
    if (!loading && !error && activeCases.length === 1) {
      const c = activeCases[0];
      onResume(
        c.subjectId,
        c.currentStage + 1,
        toMigrantRegistrationType(c.registrationType) ?? undefined,
      );
    }
    // Only run when loading finishes; onResume is stable from parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error]);

  // The list shows ONLY active, pre-declaration cases: PENDING and not yet at
  // stage 9. A declared case (PENDING_ENROLLMENT, 9/9) has left the officer's
  // "active" work — it belongs under "Registered People", not here. Remaining
  // cases are sorted by progress, furthest along first (8/9, 7/9, …).
  const filteredCases = useMemo(() => {
    let list = cases.filter(
      (c) => c.status.toUpperCase() === "PENDING" && c.currentStage < 9,
    );
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.fullName || "").toLowerCase().includes(q) ||
          (c.registrationType || "").toLowerCase().includes(q) ||
          (c.subjectId || "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.currentStage - a.currentStage);
  }, [cases, search]);

  // If auto-resume will fire (exactly 1 active case), show a loading state
  if (!loading && !error && activeCases.length === 1) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-8 w-8 animate-spin text-navy-500" />
          <p className="text-sm text-muted">{t("officer.resuming")}</p>
        </div>
      </main>
    );
  }

  // Multiple cases → table view; otherwise cards/empty
  const showTable = cases.length > 1;

  return (
    <main className="flex flex-1 flex-col px-4 py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {officer?.fullName && (
              <p className="text-sm font-medium text-gold-700">
                {t("officer.welcome").replace("{name}", officer.fullName)}
              </p>
            )}
            <h1 className="font-display text-2xl font-black tracking-tight text-navy-700 sm:text-3xl">
              {t("officer.casesTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t("officer.casesSubtitle")}
              {officer?.stationName && (
                <span className="ml-2 inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                  {t("officer.station").replace("{station}", officer.stationName)}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            {t("officer.startNew")}
          </button>
        </div>

        {/* Search bar — visible when there are cases to search */}
        {!loading && !error && cases.length > 0 && (
          <div className="relative mb-6">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("officer.searchPlaceholder")}
              className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-navy-700 outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-navy-500" />
            <p className="mt-4 text-sm text-muted">{t("officer.casesLoading")}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger/5 py-16">
            <AlertCircle className="h-10 w-10 text-danger" />
            <p className="mt-4 font-medium text-danger">{error}</p>
            <button
              type="button"
              onClick={fetchCases}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-surface"
            >
              <RotateCcw size={14} aria-hidden="true" />
              {t("officer.casesRetry")}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && cases.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
              <FileText className="h-8 w-8 text-navy-400" strokeWidth={1.5} />
            </div>
            <h2 className="mt-5 text-lg font-bold text-navy-700">{t("officer.casesEmpty")}</h2>
            <p className="mt-1.5 max-w-md text-center text-sm text-muted">
              {t("officer.casesEmptyHint")}
            </p>
            <button
              type="button"
              onClick={onStartNew}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              {t("officer.startNew")}
            </button>
          </div>
        )}

        {/* Table view — for multiple cases */}
        {!loading && !error && showTable && (
          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-navy-50/60">
                    <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colName")}</th>
                    <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colType")}</th>
                    <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colStage")}</th>
                    <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colStatus")}</th>
                    <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colDate")}</th>
                    <th className="px-5 py-3.5 text-right font-semibold text-navy-700">{t("officer.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredCases.map((c) => {
                    const isActive = c.status.toUpperCase() === "PENDING" && c.currentStage < 9;
                    const regType = toMigrantRegistrationType(c.registrationType);
                    return (
                      <tr
                        key={c.subjectId}
                        className="transition hover:bg-surface/60"
                      >
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                              <UserCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                            </span>
                            <span className="font-semibold text-navy-700">{c.fullName || "—"}</span>
                          </div>
                        </td>
                        {/* Type — humanized (ASYLUM_SEEKER → ASYLUM SEEKER). */}
                        <td className="px-5 py-3.5 text-muted">{c.registrationType ? c.registrationType.replace(/_/g, " ") : "—"}</td>
                        {/* Stage progress */}
                        <td className="px-5 py-3.5" style={{ minWidth: 160 }}>
                          <StageBar current={c.currentStage} />
                        </td>
                        {/* Status badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status.toUpperCase()] ?? STATUS_STYLE.PENDING}`}
                          >
                            {t(statusKey(c.status))}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-3.5 text-xs text-muted">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => onResume(c.subjectId, c.currentStage + 1, regType ?? undefined)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold"
                            >
                              {t("officer.resume")}
                              <ArrowRightIcon size={12} aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-muted">
                        {t("people.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Single card view — for exactly one (non-active) case */}
        {!loading && !error && cases.length === 1 && !showTable && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cases.map((c) => {
              const isActive = c.status.toUpperCase() === "PENDING" && c.currentStage < 9;
              const regType = toMigrantRegistrationType(c.registrationType);
              return (
                <div
                  key={c.subjectId}
                  className="group relative flex flex-col rounded-xl border border-line bg-card p-5 transition hover:border-gold/40 hover:shadow-md"
                >
                  {/* Status badge */}
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status.toUpperCase()] ?? STATUS_STYLE.PENDING}`}
                  >
                    {t(statusKey(c.status))}
                  </span>

                  {/* Icon + name */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                      <UserCheck size={20} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-navy-700">{c.fullName || "—"}</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {c.registrationType || "—"}
                        {c.createdAt && (
                          <> · {t("officer.caseCreated").replace("{date}", new Date(c.createdAt).toLocaleDateString())}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stage progress */}
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-medium text-muted">
                      {t("officer.caseStage").replace("{n}", String(c.currentStage))}
                    </p>
                    <StageBar current={c.currentStage} />
                  </div>

                  {/* Resume button */}
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => onResume(c.subjectId, c.currentStage + 1, regType ?? undefined)}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-700 transition hover:bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {t("officer.resume")}
                      <ArrowRightIcon size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
