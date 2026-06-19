"use client";

import { useState } from "react";
import { WizardProvider, Field, Select, TextInput } from "@/components/registry/field";
import CountrySelect from "@/components/registry/countrySelect";
import { travelDocumentOptions } from "@/components/registry/blocks";
import { useI18n } from "../i18n/localeProvider";
import { fetchForeignerDetails, type ForeignerDetails } from "@/lib/api/registration";

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
  onRegisterMinor,
  onExit,
}: {
  onCitizen: () => void;
  /** A verified non-citizen choosing to register a Tanzanian-origin minor. */
  onRegisterMinor: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<"yes" | "no" | "">("");
  const [data, setData] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "verifying" | "notfound" | "found">("idle");
  // The verified permit record + whether the user has a Tanzanian-origin minor.
  const [details, setDetails] = useState<ForeignerDetails | null>(null);
  const [hasMinor, setHasMinor] = useState<"yes" | "no" | "">("");

  const set = (name: string, value: string | boolean) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => e.filter((n) => n !== name));
  };

  function pick(value: "yes" | "no") {
    setChoice(value);
    setStatus("idle");
    setDetails(null);
    setHasMinor("");
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (choice === "yes") {
      onCitizen();
      return;
    }
    if (choice !== "no") return;

    // After a verified permit, the primary action depends on the minor answer.
    if (status === "found") {
      if (hasMinor === "yes") {
        onRegisterMinor();
        return;
      }
      if (hasMinor === "no") {
        onExit();
        return;
      }
      setErrors(["hasMinor"]);
      return;
    }

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
    const found = await fetchForeignerDetails({
      nationality: String(data.gateNationality || ""),
      documentTypeId: String(data.gateDocType || ""),
      documentNumber: String(data.gateDocNumber || ""),
    });
    if (found) {
      setDetails(found);
      setHasMinor("");
      setStatus("found");
    } else {
      setDetails(null);
      setStatus("notfound");
    }
  }

  const verifying = status === "verifying";
  const found = status === "found";
  // Label for the primary button: register the minor, finish, or verify.
  const primaryLabel =
    choice === "yes"
      ? t("gate.continue")
      : found
        ? hasMinor === "no"
          ? t("gate.done")
          : t("gate.registerMinor")
        : verifying
          ? t("gate.verifying")
          : t("gate.submit");

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

            {found && details && (
              <div className="mt-6 space-y-5">
                {/* Verified permit + immigration status */}
                <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                  <div className="flex items-center gap-2">
                    <svg className="text-success" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <p className="text-sm font-bold text-navy-700">{t("gate.foundTitle")}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{t("gate.foundBody")}</p>

                  <div className="mt-4 rounded-lg border border-success/20 bg-card px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("gate.statusLabel")}
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold text-success">
                      {details.immigrationStatus || "—"}
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {([
                      [t("gate.holderLabel"), details.fullName],
                      [t("gate.permitTypeLabel"), details.permitType],
                      [t("gate.permitNumberLabel"), details.permitNumber],
                      [t("gate.expiryLabel"), details.expiryDate],
                    ] as const)
                      .filter(([, v]) => !!v)
                      .map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 sm:block">
                          <dt className="text-muted">{label}</dt>
                          <dd className="font-semibold text-navy-700">{value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>

                {/* Minor registration question */}
                <div className="rounded-xl border border-line bg-surface/50 p-5">
                  <p className="text-sm font-semibold text-navy-700">{t("gate.minorQuestion")}</p>
                  <p className="mt-1 text-xs text-muted">{t("gate.minorHint")}</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {([
                      ["yes", t("fields.citizenYes")],
                      ["no", t("fields.citizenNo")],
                    ] as const).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium transition ${
                          hasMinor === value
                            ? "border-navy-700 bg-navy-50 text-navy-700"
                            : "border-line text-ink hover:border-navy-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hasMinor"
                          checked={hasMinor === value}
                          onChange={() => {
                            setHasMinor(value);
                            setErrors((e) => e.filter((n) => n !== "hasMinor"));
                          }}
                          className="h-4 w-4 shrink-0 accent-navy-700"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {errors.includes("hasMinor") && (
                    <p role="alert" className="mt-2 text-sm font-medium text-danger">
                      {t("gate.minorRequired")}
                    </p>
                  )}
                  {hasMinor === "no" && (
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {t("gate.noMinorNote")}
                    </p>
                  )}
                </div>
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
                {primaryLabel}
                {(choice === "yes" || (found && hasMinor === "yes")) && (
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
