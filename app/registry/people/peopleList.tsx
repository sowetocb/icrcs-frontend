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

  function isRemotePerson(person: Person | RegisteredPerson): person is RegisteredPerson {
    return "subjectId" in person;
  }

  /** Determine if a person is the account holder. For local people this is
   * the `isCreator` flag; for remote people we compare against the logged-in
   * profile's full name. */
  function isAccountHolder(person: Person | RegisteredPerson): boolean {
    if ("isCreator" in person && person.isCreator) return true;
    if (isRemotePerson(person)) {
      const local = people.find((lp) => lp.applicationId === person.subjectId);
      if (local?.isCreator) return true;
      // Fall back to matching the profile name.
      const profile = loadProfile();
      if (profile) {
        const profileName = [profile.firstName, profile.middleName, profile.lastName]
          .filter(Boolean)
          .join(" ")
          .trim()
          .toLowerCase();
        if (profileName && person.fullName.trim().toLowerCase() === profileName) return true;
      }
    }
    return false;
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
          <div className="mx-auto w-full max-w-6xl">
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
              <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-card">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="px-5 py-4">{t("people.colApplicationId")}</th>
                      <th className="px-5 py-4">{t("people.colName")}</th>
                      <th className="px-5 py-4">{t("people.colStatus")}</th>
                      <th className="px-5 py-4">{t("people.colRegisteredOn")}</th>
                      <th className="px-5 py-4 text-right">{t("people.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPeople.map((p) => {
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
                          <td className="px-5 py-4 font-mono text-sm font-bold text-navy-500">
                            {id}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-navy-700">{name}</span>
                              {isAccountHolder(p) && (
                                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                                  {t("people.creatorBadge")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                              {getStatusLabel(rawStatus, t)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-navy-600">
                            {registeredOn}
                          </td>
                          <td className="px-5 py-4">
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
