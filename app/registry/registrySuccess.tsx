"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/localeProvider";
import { useToast } from "@/components/ui/toast";
import { registrationFormFileName } from "./printRegistrationForm";
import { downloadRegistrationReviewPdf, printRegistrationReviewPdf } from "@/lib/api/registration";
import { loadRegistration, loadRegistrationFor } from "./registrationStore";
import { CircleCheck, Download, Printer } from "lucide-react";
import { loadProfile } from "@/lib/auth/profile";
// ── OLD client-side print mechanism (replaced by the backend /review/pdf
//    endpoint). Kept commented for reference. ──
// import { useEffect, useRef } from "react";
// import PrintableForm from "./printableForm";
// import { printRegistrationForm } from "./printRegistrationForm";
// import { getRegistrationReview } from "@/lib/api/registration";
// import { reviewToForm } from "@/lib/registry/reviewToForm";

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
  const { notify } = useToast();
  const router = useRouter();

  const [busy, setBusy] = useState(false);

  // The backend compiles the form PDF from stored data (GET /review/pdf), so no
  // local print DOM is needed. Both actions pull the same PDF: Download saves the
  // file; Print opens the browser print dialog for it (never downloads).
  function currentSubjectId(): string {
    return (
      loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ??
      loadRegistration()?.subjectId ??
      applicationId ??
      ""
    );
  }

  async function downloadForm() {
    if (busy) return;
    setBusy(true);
    try {
      const fullName = ["applicantFirst", "applicantMiddle"]
        .map((k) => data[k])
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .join(" ");
      const ok = await downloadRegistrationReviewPdf(
        currentSubjectId(),
        registrationFormFileName(fullName),
      );
      notify(ok ? t("registry.downloadSuccess") : t("registry.downloadError"), ok ? "success" : "error");
    } catch {
      notify(t("registry.downloadError"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function printForm() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await printRegistrationReviewPdf(currentSubjectId());
      if (!ok) notify(t("registry.downloadError"), "error");
    } catch {
      notify(t("registry.downloadError"), "error");
    } finally {
      setBusy(false);
    }
  }

  // ── OLD client-side print mechanism (replaced by downloadRegistrationReviewPdf
  //    above). Printed a hidden #printable-form via window.print after merging
  //    the server review over local data. Kept commented for reference. ──
  // const [formData, setFormData] = useState(data);
  // const printPending = useRef(false);
  // async function doPrint() {
  //   const fullName = ["applicantFirst", "applicantMiddle"]
  //     .map((k) => formData[k])
  //     .filter((v): v is string => typeof v === "string" && v.trim() !== "")
  //     .join(" ");
  //   await printRegistrationForm(
  //     document.getElementById("printable-form"),
  //     registrationFormFileName(fullName),
  //   );
  // }
  // useEffect(() => {
  //   if (!printPending.current) return;
  //   printPending.current = false;
  //   (async () => {
  //     try { await doPrint(); } finally { setBusy(false); }
  //   })();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [formData]);

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-8 text-center shadow-[0_8px_40px_-12px_rgba(13,31,51,0.25)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CircleCheck size={32} aria-hidden="true" />
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
            onClick={downloadForm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} aria-hidden="true" />
            {t("registry.downloadPdf")}
          </button>
          <button
            type="button"
            onClick={printForm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer size={16} aria-hidden="true" />
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

      {/* OLD: hidden printable form used by the client-side window.print
          mechanism — replaced by the backend /review/pdf download.
      <PrintableForm
        data={formData}
        applicationId={applicationId}
        submittedDate={submittedDate}
      /> */}
    </main>
  );
}
