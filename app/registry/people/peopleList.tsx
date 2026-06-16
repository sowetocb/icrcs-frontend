"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import { useI18n } from "../../i18n/localeProvider";
import { clearPeople, loadPeople, type Person } from "../peopleStore";
import { getRegisteredPeople, type RegisteredPerson } from "../../../lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import { getStage9Preview } from "@/lib/api/registration";
import { previewToForm } from "@/lib/registry/previewToForm";
import PrintableForm from "../printableForm";
import { printRegistrationForm } from "../printRegistrationForm";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
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

  function stageLabel(stage: number) {
    if (stage >= 1 && stage <= 5) return t(`registry.stage${stage}`);
    return `Stage ${stage}`;
  }
  // Mirrors the 5-stage process timeline in statusResult.tsx:
  //   1 Submitted · 2 Enrolled · 3 Assessed · 4 Approved · 5 Status Issued
  function getPostSubmissionStageLabel(status: string): string {
    const s = status.toUpperCase();
    if (s === "COMPLETED" || s === "ACTIVE" || s === "ISSUED" || s === "STATUS_ISSUED")
      return t("registry.stage5");
    if (s === "APPROVED" || s === "PENDING_ISSUANCE") return t("registry.stage4");
    if (s === "ASSESSED" || s === "PENDING_APPROVAL" || s === "IN_REVIEW")
      return t("registry.stage3");
    if (s === "ENROLLED" || s === "PENDING_ASSESSMENT" || s === "BIOMETRICS")
      return t("registry.stage2");
    return t("registry.stage1");
  }

  function getRemoteStageLabel(p: RegisteredPerson): string {
    if (p.status === "PENDING" && p.currentStage < 6) {
      return stageLabel(p.currentStage);
    }
    return getPostSubmissionStageLabel(p.status);
  }

  function isRemotePerson(person: Person | RegisteredPerson): person is RegisteredPerson {
    return "subjectId" in person;
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

      // Fetch all stages from the server-compiled preview and merge over the
      // base so the PDF reflects everything the user filled. Falls back to the
      // base data if the preview is unavailable.
      let data = baseData;
      try {
        const preview = await getStage9Preview(rp.subjectId);
        if (preview) data = { ...baseData, ...(await previewToForm(preview)) };
      } catch {
        // preview unavailable — print the base data
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
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight text-navy-700">
                  {t("people.title")}
                </h1>
                <p className="mt-2 text-muted">{t("people.subtitle")}</p>
              </div>
              <div className="flex items-center gap-3">
                {people.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearPeople();
                      setPeople([]);
                    }}
                    className="rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
                  >
                    {t("people.clear")}
                  </button>
                )}
                <Link
                  href="/registry"
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400"
                >
                  {t("people.startCta")}
                </Link>
              </div>
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
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {displayPeople.map((p) => {
                  const remote = isRemotePerson(p);
                  const name = remote ? p.fullName : p.name;
                  const id = remote ? p.subjectId : p.applicationId;
                  const rawStatus = remote ? p.status : (p.status === "submitted" ? "SUBMITTED" : "PENDING");
                  const sc = statusColor(rawStatus);

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-line bg-card p-5 transition hover:border-gold/30 hover:shadow-sm"
                    >
                      {/* Header: Avatar + Name + Status badge */}
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-bold text-navy-700">
                          {initials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-navy-700">
                              {name}
                            </p>
                            {"isCreator" in p && p.isCreator && (
                              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                                {t("people.creatorBadge")}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-sm font-bold text-navy-500">
                            {id}
                          </p>
                        </div>
                        {/* Status badge with dynamic coloring */}
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {getStatusLabel(rawStatus, t)}
                        </span>
                      </div>

                      {/* Details section */}
                      <div className="mt-3 space-y-2 text-sm text-navy-600">
                        {remote ? (
                          <>
                            {/* Current stage */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-navy-700">{t("registry.checkCurrent")}:</span>
                              <span className="rounded-md bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700">
                                {getRemoteStageLabel(p)}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold">Email:</span> {p.email}
                            </div>
                            <div>
                              <span className="font-semibold">Phone:</span> {p.phoneNumber}
                            </div>
                            <div>
                              <span className="font-semibold">{t("registry.statusCreatedAt")}:</span> {formatDate(p.createdAt)}
                            </div>
                            {/* Check status link */}
                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/registry/status?id=${encodeURIComponent(p.subjectId)}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-gold/40 hover:bg-card"
                              >
                                <StatusIcon />
                                {t("registry.statusAction")}
                              </Link>
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
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">
                              {t("people.submittedOn").replace("{date}", p.submittedDate)}
                            </p>
                            <button
                              type="button"
                              onClick={() => setPrintPerson(p)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-gold/40 hover:bg-card"
                            >
                              <DownloadIcon />
                              {t("people.download")}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
