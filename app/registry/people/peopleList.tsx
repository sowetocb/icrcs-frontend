"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import { useI18n } from "../../i18n/localeProvider";
import { useToast } from "@/components/ui/toast";
import { Download, User, Search } from "lucide-react";
import { loadPeople, type Person } from "../peopleStore";
import { getRegisteredPeople, type RegisteredPerson } from "../../../lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import { downloadRegistrationReviewPdf } from "@/lib/api/registration";
import { loadProfile } from "@/lib/auth/profile";
import { loadSession } from "@/lib/auth/session";
import { registrationFormFileName } from "../printRegistrationForm";
// ── OLD client-side print mechanism (replaced by the backend /review/pdf
//    endpoint via downloadRegistrationReviewPdf). Kept commented for reference. ──
// import { getRegistrationReview } from "@/lib/api/registration";
// import { reviewToForm } from "@/lib/registry/reviewToForm";
// import PrintableForm from "../printableForm";
// import { printRegistrationForm } from "../printRegistrationForm";

function DownloadIcon() {
  return <Download size={15} aria-hidden="true" />;
}

function UserIcon() {
  return <User size={13} aria-hidden="true" />;
}

function SearchIcon() {
  return <Search size={16} aria-hidden="true" />;
}

type StatusCategory = "approved" | "assessed" | "enrolled" | "pending" | "rejected";

/** Collapse the many raw backend status values into the buckets used by the
 *  summary cards and the status filter. */
function statusCategory(status: string): StatusCategory {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED" || s === "ACTIVE") return "approved";
  if (s === "ASSESSED") return "assessed";
  if (s === "ENROLLED") return "enrolled";
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
  const { notify } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [remotePeople, setRemotePeople] = useState<RegisteredPerson[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  // The person whose form is rendered (hidden) for the next PDF download.
  // OLD: drove the hidden PrintableForm for client-side printing — replaced by
  // the backend /review/pdf download (handleDownloadPdf).
  // const [printPerson, setPrintPerson] = useState<Person | null>(null);
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
      // AuthGuard gates the rendered UI, not this parent component's effects, so
      // this runs even when logged out. Skip the protected fetch when there's no
      // session — otherwise it hits the proxy with no cookie, gets a 403, and
      // surfaces a spurious "session expired" while AuthGuard redirects to login.
      if (!loadSession()) {
        setLoading(false);
        return;
      }
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
    { total: 0, approved: 0, assessed: 0, enrolled: 0, pending: 0, rejected: 0 },
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

  // Download the server-rendered registration PDF from the backend /review/pdf
  // endpoint. The backend compiles the form from stored data, so we no longer
  // fetch the review, map it to form fields, or render a hidden printable DOM.
  const handleDownloadPdf = async (subjectId: string, fullName: string) => {
    if (downloadingId) return;
    setDownloadingId(subjectId);
    try {
      await downloadRegistrationReviewPdf(
        subjectId,
        registrationFormFileName(fullName),
      );
      notify(t("registry.downloadSuccess"), "success");
    } catch {
      notify(t("registry.downloadError"), "error");
    } finally {
      setDownloadingId(null);
    }
  };
  const handleDownloadRemote = (rp: RegisteredPerson) =>
    handleDownloadPdf(rp.subjectId, rp.fullName);

  // ── OLD client-side print mechanism (replaced by handleDownloadRemote above).
  //    Built form data from the server review + local draft, then printed a
  //    hidden #printable-form via window.print. Kept commented for reference. ──
  // const handleDownloadRemoteOld = async (rp: RegisteredPerson) => {
  //   if (downloadingId) return;
  //   setDownloadingId(rp.subjectId);
  //   try {
  //     const local = people.find((lp) => lp.applicationId === rp.subjectId);
  //     const nameParts = rp.fullName.trim().split(/\s+/).filter(Boolean);
  //     const first = nameParts[0] || "";
  //     const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  //     const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";
  //     const baseData: Record<string, string | boolean> = local?.data ?? {
  //       applicantFirst: first, applicantMiddle: middle, applicantLast: last,
  //       email: rp.email, phone: rp.phoneNumber,
  //     };
  //     let data = baseData;
  //     try {
  //       const review = await getRegistrationReview(rp.subjectId);
  //       if (review) data = { ...baseData, ...(await reviewToForm(review)) };
  //     } catch { /* review unavailable — print the base data */ }
  //     const date = new Date(rp.createdAt);
  //     const formattedDate = Number.isNaN(date.getTime())
  //       ? rp.createdAt
  //       : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  //     setPrintPerson({
  //       applicationId: rp.subjectId, submittedDate: local?.submittedDate ?? formattedDate,
  //       name: rp.fullName, isCreator: local?.isCreator ?? false, status: "submitted", data,
  //     });
  //   } finally { setDownloadingId(null); }
  // };
  // useEffect(() => {
  //   if (!printPerson) return;
  //   (async () => {
  //     const fullName = ["applicantFirst", "applicantMiddle"]
  //       .map((k) => printPerson.data[k])
  //       .filter((v): v is string => typeof v === "string" && v.trim() !== "")
  //       .join(" ");
  //     await printRegistrationForm(
  //       document.getElementById("printable-form"),
  //       registrationFormFileName(fullName || printPerson.name),
  //     );
  //     // eslint-disable-next-line react-hooks/set-state-in-effect
  //     setPrintPerson(null);
  //   })();
  // }, [printPerson]);

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
                  <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {([
                      { key: "total", label: t("people.statRegistered"), value: counts.total, ring: "bg-navy-700 text-white" },
                      { key: "approved", label: t("people.statApproved"), value: counts.approved, ring: "bg-success/15 text-success" },
                      { key: "assessed", label: t("people.statAssessed"), value: counts.assessed, ring: "bg-navy-500/15 text-navy-700" },
                      { key: "enrolled", label: t("people.statEnrolled"), value: counts.enrolled, ring: "bg-gold/20 text-gold-700" },
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
                      <option value="approved">{t("people.statApproved")}</option>
                      <option value="assessed">{t("people.statAssessed")}</option>
                      <option value="enrolled">{t("people.statEnrolled")}</option>
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
                                      onClick={() => handleDownloadPdf(p.applicationId, p.name)}
                                      disabled={downloadingId === p.applicationId}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-gold/40 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <DownloadIcon />
                                      {downloadingId === p.applicationId
                                        ? t("people.preparing")
                                        : t("people.download")}
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

        {/* OLD: hidden printable form for the client-side print mechanism —
            replaced by the backend /review/pdf download.
        {printPerson && (
          <PrintableForm
            data={printPerson.data}
            applicationId={printPerson.applicationId}
            submittedDate={printPerson.submittedDate}
          />
        )} */}
      </div>
    </AuthGuard>
  );
}
