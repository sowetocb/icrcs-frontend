"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import { useI18n } from "../../i18n/localeProvider";
import {
  getApplicationStatus,
  type ApplicationStatus,
} from "../../../lib/api/registry";
import { getErrorMessage } from "@/lib/api/client";
import StatusResult from "./statusResult";

export default function StatusChecker() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [id, setId] = useState("");
  // Inline field validation (bad format) vs. a failed lookup, which renders as a
  // card below the form to match how a fetched status is shown.
  const [formError, setFormError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicationStatus | null>(null);

  const autoLookedUp = useRef(false);

  useEffect(() => {
    const qid = searchParams.get("id");

    if (qid && !autoLookedUp.current) {
      autoLookedUp.current = true;
      setId(qid);
      void runLookup(qid);
    }
  }, [searchParams]);

  async function runLookup(value: string) {
    const appId = value.trim();

    if (!appId || appId.replace(/[^A-Z0-9]/gi, "").length < 6) {
      setFormError(t("registry.checkInvalid"));
      setLookupError("");
      setResult(null);
      return;
    }

    setFormError("");
    setLookupError("");
    setLoading(true);

    try {
      const payload = await getApplicationStatus(appId);
      setResult(payload);
    } catch (err) {
      setResult(null);
      setLookupId(appId);
      setLookupError(getErrorMessage(err, t("registry.checkFailed")));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void runLookup(id);
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-surface">
        <DashboardTopbar />

        <div className="flex flex-1">
          <CitizenSidebar />

          <main className="flex-1 px-6 py-10 lg:px-10">
            <div className="mx-auto w-full max-w-3xl">
              <h1 className="font-display text-3xl font-black tracking-tight text-navy-700">
                {t("registry.checkTitle")}
              </h1>

              <p className="mt-2 max-w-xl leading-relaxed text-muted">
                {t("registry.checkIntro")}
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-2xl border border-line bg-card p-6"
              >
                <label
                  htmlFor="appId"
                  className="block text-sm font-medium text-navy-700"
                >
                  {t("registry.checkIdLabel")}
                </label>

                <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="appId"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      if (formError) setFormError("");
                      if (lookupError) setLookupError("");
                    }}
                    placeholder="ICRCS-20260611-000003-77D162"
                    className="flex-1 rounded-lg border bg-surface px-3.5 py-2.5 font-mono text-sm uppercase tracking-wide text-ink outline-none"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-navy-700 px-6 py-2.5 text-sm font-semibold text-white"
                  >
                    {loading ? t("registry.checking") : t("registry.checkButton")}
                  </button>
                </div>

                {formError && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {formError}
                  </p>
                )}
              </form>

              {lookupError && (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-line bg-card p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {t("registry.checkResultTitle")}
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-navy-700">
                        {lookupId}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
                      <span className="h-2 w-2 rounded-full bg-danger" />
                      {t("registry.checkNotFoundBadge")}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
                    <p className="text-sm text-ink">{lookupError}</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="mt-6">
                  <StatusResult result={result} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}