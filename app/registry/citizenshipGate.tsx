"use client";

import { useState } from "react";
import { WizardProvider, Field, Select, TextInput } from "@/components/registry/field";
import CountrySelect from "@/components/registry/countrySelect";
import { travelDocumentOptions } from "@/components/registry/blocks";
import { useI18n } from "../i18n/localeProvider";
import { fetchForeignerDetails } from "@/lib/api/registration";

/**
 * Independent citizenship gate shown before the registration wizard.
 *  - Tanzanian citizens continue to the normal wizard.
 *  - Non-citizens supply only Nationality + Travel Document Type + Document
 *    Number, then we look them up. If nothing is found they are directed to the
 *    nearest immigration office (e.g. adopted Tanzanian minors, or a child of a
 *    Tanzanian spouse, who must be registered in person).
 */
export default function CitizenshipGate({
  onCitizen,
  onExit,
}: {
  onCitizen: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<"yes" | "no" | "">("");
  const [data, setData] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "verifying" | "notfound">("idle");

  const set = (name: string, value: string | boolean) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => e.filter((n) => n !== name));
  };

  function pick(value: "yes" | "no") {
    setChoice(value);
    setStatus("idle");
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (choice === "yes") {
      onCitizen();
      return;
    }
    if (choice !== "no") return;

    const required = ["gateNationality", "gateDocType", "gateDocNumber"];
    const missing = required.filter(
      (n) => !(typeof data[n] === "string" && (data[n] as string).trim()),
    );
    if (missing.length > 0) {
      setErrors(missing);
      setStatus("idle");
      return;
    }
    setErrors([]);
    setStatus("verifying");
    const details = await fetchForeignerDetails({
      nationality: String(data.gateNationality || ""),
      documentTypeId: String(data.gateDocType || ""),
      documentNumber: String(data.gateDocNumber || ""),
    });
    // No backend record → guide them to an immigration office. (When the lookup
    // later returns a record, this is where the matched flow would continue.)
    setStatus(details ? "idle" : "notfound");
  }

  const verifying = status === "verifying";

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold text-success">{t("gate.title")}</p>
        <h1 className="mt-1 font-display text-4xl font-black tracking-tight text-navy-700">
          {t("fields.citizenQuestion")}
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t("gate.intro")}</p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                ["yes", t("fields.citizenYes")],
                ["no", t("fields.citizenNo")],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm font-medium transition ${
                    choice === value
                      ? "border-navy-700 bg-navy-50 text-navy-700"
                      : "border-line text-ink hover:border-navy-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="isTanzanian"
                    checked={choice === value}
                    onChange={() => pick(value)}
                    className="h-4 w-4 shrink-0 accent-navy-700"
                  />
                  {label}
                </label>
              ))}
            </div>

            {choice === "no" && (
              <WizardProvider
                data={data}
                set={set}
                errors={errors}
                locked={[]}
                isFirstPerson
              >
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label={t("fields.nationality")} required>
                    <CountrySelect name="gateNationality" placeholder={t("fields.phCountryNat")} />
                  </Field>
                  <Field label={t("gate.travelDocType")} required>
                    <Select name="gateDocType" placeholder={t("fields.phSelectType")} options={travelDocumentOptions(t)} />
                  </Field>
                  <Field label={t("fields.docNumberReq")} required>
                    <TextInput name="gateDocNumber" placeholder={t("fields.phDocNumber")} />
                  </Field>
                </div>
              </WizardProvider>
            )}

            {status === "notfound" && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4"
              >
                <p className="text-sm font-bold text-navy-700">{t("gate.notFoundTitle")}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t("gate.notFoundBody")}
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 transition hover:text-gold-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                {t("gate.back")}
              </button>

              <button
                type="submit"
                disabled={!choice || verifying}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying && (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                )}
                {choice === "no"
                  ? verifying
                    ? t("gate.verifying")
                    : t("gate.submit")
                  : t("gate.continue")}
                {choice === "yes" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
