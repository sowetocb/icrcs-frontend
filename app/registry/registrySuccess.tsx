"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/localeProvider";
import PrintableForm from "./printableForm";
import { printRegistrationForm, registrationFormFileName } from "./printRegistrationForm";
import { getRegistrationReview } from "@/lib/api/registration";
import { reviewToForm } from "@/lib/registry/reviewToForm";
import { loadRegistration, loadRegistrationFor } from "./registrationStore";
import { loadProfile } from "@/lib/auth/profile";

export default function RegistrySuccess({
  applicationId,
  submittedDate,
  data,
}: {
  applicationId: string;
  submittedDate: string;
  data: Record<string, string | boolean>;
}) {
  const { t } = useI18n();
  const router = useRouter();

  // The form is printed from `formData`. It starts as the locally-entered data
  // and is refreshed from the server-compiled preview when the user downloads.
  const [formData, setFormData] = useState(data);
  const [busy, setBusy] = useState(false);
  // Set once the (preview-merged) formData is committed and the DOM should be
  // printed on the next paint.
  const printPending = useRef(false);

  function doPrint() {
    const fullName = ["applicantFirst", "applicantMiddle", "applicantLast"]
      .map((k) => formData[k])
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .join(" ");
    printRegistrationForm(
      document.getElementById("printable-form"),
      registrationFormFileName(fullName),
    );
  }

  // Print after the preview-merged data has rendered into the hidden form.
  useEffect(() => {
    if (!printPending.current) return;
    printPending.current = false;
    doPrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  async function printForm() {
    if (busy) return;
    setBusy(true);
    try {
      // Pull all stages from the server-compiled preview so the printout
      // reflects exactly what the backend stored. Falls back to local data.
      const subjectId =
        loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ??
        loadRegistration()?.subjectId ??
        "";
      if (subjectId) {
        const review = await getRegistrationReview(subjectId);
        if (review) {
          const mapped = await reviewToForm(review);
          // Merge server data over local (local keeps cascade names/photo the
          // preview doesn't carry); printing is triggered by the effect above.
          printPending.current = true;
          setFormData((prev) => ({ ...prev, ...mapped }));
          return;
        }
      }
      doPrint();
    } catch {
      doPrint(); // preview unavailable — print what we have locally
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-8 text-center shadow-[0_8px_40px_-12px_rgba(13,31,51,0.25)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </span>

        <h1 className="mt-5 font-display text-2xl font-bold text-navy-700">
          {t("registry.submittedTitle")}
        </h1>

        <div className="mt-6 rounded-xl bg-navy-700 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-200">
            {t("registry.applicationId")}
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wide text-gold">
            {applicationId}
          </p>
          <p className="mt-2 text-xs text-navy-200">
            {t("registry.submittedOn").replace("{date}", submittedDate)}
          </p>
        </div>

        <hr className="my-6 border-line" />

        <p className="text-sm leading-relaxed text-muted">
          {t("registry.submittedHelp")}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={printForm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("registry.downloadPdf")}
          </button>
          <button
            type="button"
            onClick={printForm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            {t("registry.printForm")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 text-sm font-semibold text-muted transition hover:text-navy-700"
        >
          {t("registry.returnDashboard")}
        </button>
      </div>

      <PrintableForm
        data={formData}
        applicationId={applicationId}
        submittedDate={submittedDate}
      />
    </main>
  );
}
