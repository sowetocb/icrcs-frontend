"use client";

import { useState } from "react";
import { WizardProvider, Field, Select, TextInput } from "@/components/registry/field";
import CountrySelect from "@/components/registry/countrySelect";
import { travelDocumentOptions } from "@/components/registry/blocks";
import { useI18n } from "../i18n/localeProvider";
import { fetchForeignerDetails, type ForeignerDetails } from "@/lib/api/registration";
import { ShieldCheck, ArrowLeft, LoaderCircle } from "lucide-react";

/**
 * Foreign-national gate shown before the registration wizard. A verified
 * non-citizen supplies their travel-document details (nationality is bound from
 * their create-profile record and locked). On a successful lookup they may
 * register a Tanzanian-origin minor — choosing their relationship (Guardian /
 * Parent) in a dialog before landing on Stage 1 of the minor's registration.
 */
export default function CitizenshipGate({
  nationality,
  onRegisterMinor,
  onExit,
}: {
  /** The registrant's country of nationality (a country NAME), bound from their
   *  create-profile record and shown locked in the travel-document form. */
  nationality: string;
  /** Register a Tanzanian-origin minor, carrying the chosen relationship. */
  onRegisterMinor: (relationship: "guardian" | "parent") => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<Record<string, string | boolean>>({
    gateNationality: nationality,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "verifying" | "notfound" | "found">("idle");
  const [details, setDetails] = useState<ForeignerDetails | null>(null);
  const [showRelationship, setShowRelationship] = useState(false);
  const [relationship, setRelationship] = useState<"guardian" | "parent" | "">("");

  const set = (name: string, value: string | boolean) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => e.filter((n) => n !== name));
  };

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      setStatus("found");
    } else {
      setDetails(null);
      setStatus("notfound");
    }
  }

  function confirmRelationship() {
    if (!relationship) return;
    setShowRelationship(false);
    onRegisterMinor(relationship);
  }

  const verifying = status === "verifying";
  const found = status === "found";

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold text-success">{t("gate.title")}</p>
        <h1 className="mt-1 font-display text-4xl font-black tracking-tight text-navy-700">
          {t("gate.fillInfoTitle")}
        </h1>

        <div className="mt-6 rounded-2xl border border-line bg-card p-6 sm:p-8">
          {!found ? (
            <form onSubmit={handleVerify}>
              <WizardProvider
                data={data}
                set={set}
                setQuiet={set}
                blur={() => {}}
                errors={errors}
                locked={["gateNationality"]}
                isFirstPerson
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label={t("fields.nationality")} required>
                    <CountrySelect name="gateNationality" placeholder={t("fields.phCountryNat")} disabled />
                  </Field>
                  <Field label={t("gate.travelDocType")} required>
                    <Select name="gateDocType" placeholder={t("fields.phSelectType")} options={travelDocumentOptions(t)} />
                  </Field>
                  <Field label={t("fields.docNumberReq")} required>
                    <TextInput name="gateDocNumber" placeholder={t("fields.phDocNumber")} allowChars="A-Za-z0-9" maxLength={15} />
                  </Field>
                </div>
              </WizardProvider>

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
                  <ArrowLeft size={18} aria-hidden="true" />
                  {t("gate.back")}
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
                  {verifying ? t("gate.verifying") : t("gate.submit")}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Verified permit + immigration status */}
              {details && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-success" size={18} strokeWidth={2.5} aria-hidden="true" />
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
              )}

              {/* Minor-registration invitation shown just below the retrieved info. */}
              <div className="rounded-xl border border-navy-200 bg-navy-50 p-5">
                <p className="text-sm font-semibold text-navy-700">
                  {t("gate.canRegisterMinor")}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={onExit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface"
                  >
                    {t("gate.noMinorBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRelationship(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400"
                  >
                    {t("gate.continueRegistration")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Relationship dialog — asked before entering the minor's Stage 1. */}
      {showRelationship && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("gate.relationshipQuestion")}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label={t("gate.back")}
            onClick={() => setShowRelationship(false)}
            className="absolute inset-0 cursor-default bg-navy-900/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-navy-700">
              {t("gate.relationshipQuestion")}
            </h3>
            <div className="mt-4 space-y-3">
              {([
                ["guardian", t("gate.relationshipGuardian")],
                ["parent", t("gate.relationshipParent")],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm font-medium transition ${
                    relationship === value
                      ? "border-navy-700 bg-navy-50 text-navy-700"
                      : "border-line text-ink hover:border-navy-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="minorRelationship"
                    checked={relationship === value}
                    onChange={() => setRelationship(value)}
                    className="h-4 w-4 shrink-0 accent-navy-700"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRelationship(false)}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-line hover:text-navy-700"
              >
                {t("gate.back")}
              </button>
              <button
                type="button"
                disabled={!relationship}
                onClick={confirmRelationship}
                className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("gate.relationshipContinue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
