"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import { useI18n } from "../../i18n/localeProvider";
import { loadPeople, type Person } from "../peopleStore";
import { getRegisteredPeople, type RegisteredPerson } from "../../../lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import { getRegistrationReview } from "@/lib/api/registration";
import { reviewToForm } from "@/lib/registry/reviewToForm";
import { loadProfile } from "@/lib/auth/profile";
import PrintableForm from "../printableForm";
import { printRegistrationForm } from "../printRegistrationForm";

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

type StatusCategory = "completed" | "pending" | "rejected";

/** Collapse the many raw backend status values into the three buckets used by
 *  the summary cards and the status filter. */
function statusCategory(status: string): StatusCategory {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED" || s === "ACTIVE") return "completed";
  if (s === "REJECTED" || s === "DENIED" || s === "CANCELLED") return "rejected";
  return "pending";
}

/** Map a raw backend status string to a CSS colour family. */
function statusColor(status: string): {
  bg: string;
  text: string;
  dot: string;
} {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED" || s === "ACTIVE")
    return { bg: "bg-success/10", text: "text-success", dot: "bg-success" };
  if (s === "REJECTED" || s === "DENIED" || s === "CANCELLED")
    return { bg: "bg-danger/10", text: "text-danger", dot: "bg-danger" };
  // PENDING, PENDING_ASSESSMENT, IN_REVIEW, SUBMITTED, etc.
  return { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" };
}

/** Translate a backend status value via the i18n system, falling back to a
 *  prettified version of the raw string. */
function getStatusLabel(status: string, t: (key: string) => string): string {
  const key = `registry.status_${status}`;
  const label = t(key);
  // If the key was returned as-is, the translation doesn't exist — format it.
  return label === key ? status.replace(/_/g, " ") : label;
}

export default function PeopleList() {
  const { t } = useI18n();
  const [people, setPeople] = useState<Person[]>([]);
  const [remotePeople, setRemotePeople] = useState<RegisteredPerson[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  // The person whose form is rendered (hidden) for the next PDF download.
  const [printPerson, setPrintPerson] = useState<Person | null>(null);
  // Subject id currently being prepared for download (fetching the preview).
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Search + filter controls.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusCategory>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");

  // Read from localStorage after mount to avoid SSR/client hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeople(loadPeople());

    async function fetchPeople() {
      try {
        const fetched = await getRegisteredPeople();
        setRemotePeople(fetched);
      } catch (err) {
        console.error(err);
        setFetchError(getErrorMessage(err, t("people.loadError")));
      } finally {
        setLoading(false);
      }
    }

    fetchPeople();
  }, [t]);

  const remoteLoaded = remotePeople !== null;
  const displayPeople: Array<Person | RegisteredPerson> = remoteLoaded
    ? remotePeople.filter((p) => !(p.status === "PENDING" && p.currentStage < 6))
    : people.filter((p) => p.status !== "in_progress");

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()} ${hh}:${min}`;
  }

  function isRemotePerson(person: Person | RegisteredPerson): person is RegisteredPerson {
    return "subjectId" in person;
  }

  /** Normalise either person shape into the fields the table/filters need. */
  function rowOf(p: Person | RegisteredPerson) {
    const remote = isRemotePerson(p);
    const rawStatus = remote ? p.status : p.status === "submitted" ? "SUBMITTED" : "PENDING";
    const createdRaw = remote ? p.createdAt : p.submittedDate;
    return {
      remote,
      name: remote ? p.fullName : p.name,
      id: remote ? p.subjectId : p.applicationId,
      rawStatus,
      registeredOn: remote ? formatDate(p.createdAt) : p.submittedDate,
      registeredAt: new Date(createdRaw),
    };
  }

  // Summary counts across all registered people (before search/filtering).
  const counts = displayPeople.reduce(
    (acc, p) => {
      acc.total += 1;
      acc[statusCategory(rowOf(p).rawStatus)] += 1;
      return acc;
    },
    { total: 0, completed: 0, pending: 0, rejected: 0 },
  );

  // Sort earliest-first: the first person registered under the account stays on
  // top. NaN dates (unparseable local drafts) sink to the bottom, keeping order.
  const sortedPeople = [...displayPeople].sort((a, b) => {
    const ta = rowOf(a).registeredAt.getTime();
    const tb = rowOf(b).registeredAt.getTime();
    return (Number.isNaN(ta) ? Infinity : ta) - (Number.isNaN(tb) ? Infinity : tb);
  });

  // Exactly ONE account holder: the registration that matches the profile name,
  // otherwise the earliest registrant. (The per-record isCreator flag could be
  // set on more than one row, so it can't be trusted on its own.)
  const accountHolderId = (() => {
    const profile = loadProfile();
    const profileName = profile
      ? [profile.firstName, profile.middleName, profile.lastName]
          .filter(Boolean)
          .join(" ")
          .trim()
          .toLowerCase()
      : "";
    if (profileName) {
      const match = sortedPeople.find((p) => rowOf(p).name.trim().toLowerCase() === profileName);
      if (match) return rowOf(match).id;
    }
    return sortedPeople.length ? rowOf(sortedPeople[0]).id : "";
  })();

  // Apply search + status + date-of-registration filters (keeping the sort).
  const filteredPeople = sortedPeople.filter((p) => {
    const { name, id, rawStatus, registeredAt } = rowOf(p);

    const q = search.trim().toLowerCase();
    if (q && !name.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return false;

    if (statusFilter !== "all" && statusCategory(rawStatus) !== statusFilter) return false;

    if (dateFilter !== "all") {
      if (Number.isNaN(registeredAt.getTime())) return false;
      const days = dateFilter === "today" ? 1 : dateFilter === "7d" ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      if (registeredAt.getTime() < cutoff) return false;
    }

    return true;
  });

  /** The account holder is a single, deterministic row (see accountHolderId). */
  function isAccountHolder(person: Person | RegisteredPerson): boolean {
    return rowOf(person).id === accountHolderId;
  }

  const handleDownloadRemote = async (rp: RegisteredPerson) => {
    if (downloadingId) return;
    setDownloadingId(rp.subjectId);
    try {
      const local = people.find((lp) => lp.applicationId === rp.subjectId);

      // Base: the local draft if we have it, else a minimal name/email/phone
      // fallback derived from the list row.
      const nameParts = rp.fullName.trim().split(/\s+/).filter(Boolean);
      const first = nameParts[0] || "";
      const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";
      const baseData: Record<string, string | boolean> = local?.data ?? {
        applicantFirst: first,
        applicantMiddle: middle,
        applicantLast: last,
        email: rp.email,
        phone: rp.phoneNumber,
      };

      // Fetch all stages from the server-compiled review and merge over the
      // base so the PDF reflects everything the user filled. Falls back to the
      // base data if the review is unavailable.
      let data = baseData;
      try {
        const review = await getRegistrationReview(rp.subjectId);
        if (review) data = { ...baseData, ...(await reviewToForm(review)) };
      } catch {
        // review unavailable — print the base data
      }

      const date = new Date(rp.createdAt);
      const formattedDate = Number.isNaN(date.getTime())
        ? rp.createdAt
        : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

      setPrintPerson({
        applicationId: rp.subjectId,
        submittedDate: local?.submittedDate ?? formattedDate,
        name: rp.fullName,
        isCreator: local?.isCreator ?? false,
        status: "submitted",
        data,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Once the chosen person's form is in the DOM, generate the PDF and reset.
  useEffect(() => {
    if (!printPerson) return;
    printRegistrationForm(
      document.getElementById("printable-form"),
      `${printPerson.name} Registration Form`,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrintPerson(null);
  }, [printPerson]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-surface">
        <DashboardTopbar />
        <div className="flex flex-1">
          <CitizenSidebar />
          <main className="flex-1 px-6 py-10 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-black tracking-tight text-navy-700">
                    {t("people.title")}
                  </h1>
                  <p className="mt-2 text-muted">{t("people.subtitle")}</p>
                </div>
                <Link
                  href="/registry"
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400"
                >
                  {t("people.startCta")}
                </Link>
              </div>

              {fetchError ? (
                <div className="mt-8 rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center text-sm text-danger">
                  {fetchError}
                </div>
              ) : loading ? (
                <div className="mt-8 rounded-2xl border border-line bg-card p-10 text-center text-muted">
                  Loading registered people…
                </div>
              ) : displayPeople.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-line bg-card p-10 text-center">
                  <p className="text-muted">{t("people.empty")}</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {([
                      { key: "total", label: t("people.statTotal"), value: counts.total, ring: "bg-navy-700 text-white" },
                      { key: "completed", label: t("people.statCompleted"), value: counts.completed, ring: "bg-success/15 text-success" },
                      { key: "pending", label: t("people.statPending"), value: counts.pending, ring: "bg-warning/15 text-warning" },
                      { key: "rejected", label: t("people.statRejected"), value: counts.rejected, ring: "bg-danger/15 text-danger" },
                    ] as const).map((card) => (
                      <div
                        key={card.key}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4"
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black ${card.ring}`}>
                          {card.value}
                        </span>
                        <span className="text-sm font-semibold text-muted">{card.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Search + filters */}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                        <SearchIcon />
                      </span>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("people.searchPlaceholder")}
                        className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-3 text-sm text-navy-700 outline-none transition focus:border-gold/50"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                      className="rounded-lg border border-line bg-card px-3 py-2.5 text-sm font-semibold text-navy-700 outline-none transition focus:border-gold/50"
                    >
                      <option value="all">{t("people.filterAllStatus")}</option>
                      <option value="completed">{t("people.statCompleted")}</option>
                      <option value="pending">{t("people.statPending")}</option>
                      <option value="rejected">{t("people.statRejected")}</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                      className="rounded-lg border border-line bg-card px-3 py-2.5 text-sm font-semibold text-navy-700 outline-none transition focus:border-gold/50"
                    >
                      <option value="all">{t("people.filterAllDates")}</option>
                      <option value="today">{t("people.filterToday")}</option>
                      <option value="7d">{t("people.filter7Days")}</option>
                      <option value="30d">{t("people.filter30Days")}</option>
                    </select>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
                    <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-line text-[15px] font-semibold uppercase tracking-wider text-muted">
                          <th className="px-4 py-3 font-semibold">{t("people.colApplicationId")}</th>
                          <th className="px-4 py-3 font-semibold">{t("people.colName")}</th>
                          <th className="px-4 py-3 font-semibold">{t("people.colStatus")}</th>
                          <th className="px-4 py-3 font-semibold">{t("people.colRegisteredOn")}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t("people.colActions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPeople.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted">
                              {t("people.noResults")}
                            </td> 
                          </tr>
                        ) : filteredPeople.map((p) => {
                          const remote = isRemotePerson(p);
                          const name = remote ? p.fullName : p.name;
                          const id = remote ? p.subjectId : p.applicationId;
                          const rawStatus = remote ? p.status : (p.status === "submitted" ? "SUBMITTED" : "PENDING");
                          const registeredOn = remote ? formatDate(p.createdAt) : p.submittedDate;
                          const sc = statusColor(rawStatus);

                          return (
                            <tr
                              key={id}
                              className="border-b border-line last:border-b-0 transition hover:bg-surface"
                            >
                              <td className="px-4 py-3 font-mono text-xs font-medium text-navy-500">
                                {id}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isAccountHolder(p) && (
                                    <span
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-700"
                                      title={t("people.creatorBadge")}
                                      aria-label={t("people.creatorBadge")}
                                    >
                                      <UserIcon />
                                    </span>
                                  )}
                                  <span className="text-[13px] font-medium text-navy-700">{name}</span>
                                  {isAccountHolder(p) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-700">
                                      {t("people.creatorBadge")}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                  {getStatusLabel(rawStatus, t)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted">
                                {registeredOn}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end">
                                  {remote ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadRemote(p)}
                                      disabled={downloadingId === p.subjectId}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-gold/40 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <DownloadIcon />
                                      {downloadingId === p.subjectId
                                        ? t("people.preparing")
                                        : t("people.download")}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setPrintPerson(p)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-gold/40 hover:bg-card"
                                    >
                                      <DownloadIcon />
                                      {t("people.download")}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Hidden form for the selected person — cloned into the PDF on download. */}
        {printPerson && (
          <PrintableForm
            data={printPerson.data}
            applicationId={printPerson.applicationId}
            submittedDate={printPerson.submittedDate}
          />
        )}
      </div>
    </AuthGuard>
  );
}
