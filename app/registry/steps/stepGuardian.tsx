"use client";

import { useEffect } from "react";
import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import { usePersonDocumentTypeOptions } from "@/components/registry/blocks";
import type { PersonGroup } from "@/lib/api/lookup";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import { useI18n } from "@/app/i18n/localeProvider";
import { X, Plus } from "lucide-react";

// Identification document type suffixes cleared when removing the last entry.
const ID_DOC_SUFFIXES = ["Type", "Number"];

/**
 * Parent block matching the Stage 3 RelatedPersonRequest DTO:
 *   name, DOB, phone, nationality, residence, and identification documents.
 * Place of birth is NOT in the DTO — the backend ignores it for parents.
 */
function ParentBlock({ prefix, label }: { prefix: string; label: string }) {
  const { t } = useI18n();
  const { data, set } = useWizard();

  // Residence: the Region→District→Ward→Street cascade applies when Tanzania
  // is picked; the free-text city shows for any other country.
  const resCountry = typeof data[`${prefix}ResCountry`] === "string" ? (data[`${prefix}ResCountry`] as string).trim() : "";
  const resIsTz = resCountry === "Tanzania";
  const resIsForeign = resCountry !== "" && !resIsTz;

  // Identification documents repeater: {prefix}IdDoc1Type/Number, …
  const idDocCountKey = `${prefix}IdDocCount`;
  const idDocCount = Math.max(1, Number(data[idDocCountKey]) || 1);

  // Options come from the lookup for this parent; the value is the documentTypeId.
  const idDocTypeOptions = usePersonDocumentTypeOptions(prefix as PersonGroup);

  function addIdDoc() {
    set(idDocCountKey, String(idDocCount + 1));
  }
  /** Remove a specific document, shifting later ones up into its slot. */
  function removeIdDoc(target: number) {
    if (idDocCount <= 1) return;
    for (let n = target; n < idDocCount; n++) {
      for (const s of ID_DOC_SUFFIXES) {
        const nextVal = data[`${prefix}IdDoc${n + 1}${s}`];
        set(`${prefix}IdDoc${n}${s}`, typeof nextVal === "string" ? nextVal : "");
      }
    }
    for (const s of ID_DOC_SUFFIXES) set(`${prefix}IdDoc${idDocCount}${s}`, "");
    set(idDocCountKey, String(idDocCount - 1));
  }

  return (
    <div className="space-y-5">
      <h3 className="font-display text-base font-bold text-navy-700">{label}</h3>

      {/* Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} lettersOnly maxLength={100} />
        </Field>
        <Field label={t("fields.middleName")} required>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} lettersOnly maxLength={100} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} lettersOnly maxLength={100} />
        </Field>
      </div>

      {/* Date of Birth · Nationality — same row, both fill their column */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.dob")} required>
          <DateInput name={`${prefix}Dob`} />
        </Field>
        <Field label={t("fields.nationality")} required>
          <CountrySelect name={`${prefix}NatCountry`} placeholder={t("fields.phCountryNat")} />
        </Field>
      </div>

      {/* Identification documents — repeatable, just like Personal Information */}
      <div className="space-y-3">
        {Array.from({ length: idDocCount }, (_, i) => i + 1).map((n) => {
          const type = typeof data[`${prefix}IdDoc${n}Type`] === "string" ? (data[`${prefix}IdDoc${n}Type`] as string) : "";
          const isNida = !!idDocTypeOptions.find((o) => o.value === type)?.label.toUpperCase().includes("NIDA");
          // Hide a document type already chosen in another row (keep this row's own).
          const pickedElsewhere = new Set(
            Array.from({ length: idDocCount }, (_, m) => m + 1)
              .filter((m) => m !== n)
              .map((m) => (typeof data[`${prefix}IdDoc${m}Type`] === "string" ? (data[`${prefix}IdDoc${m}Type`] as string) : ""))
              .filter(Boolean),
          );
          const availableOptions = idDocTypeOptions.filter((o) => o.value === type || !pickedElsewhere.has(o.value));
          return (
            <div key={n} className="space-y-4 rounded-xl border border-line bg-card p-4">
              {idDocCount > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-700">
                    {t("fields.documentN").replace("{n}", String(n))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIdDoc(n)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-danger transition-all duration-200 hover:bg-danger hover:text-white active:scale-95"
                    aria-label={t("fields.remove")}
                  >
                    <X size={14} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.docType")} optional>
                  <Select name={`${prefix}IdDoc${n}Type`} placeholder={t("fields.phSelect")} options={availableOptions} />
                </Field>
                {type && (
                  <Field label={t("fields.docNumber")} required>
                    {/* NIDA is exactly 20 digits — numeric, capped; others free-form. */}
                    {isNida ? (
                      <TextInput name={`${prefix}IdDoc${n}Number`} placeholder="12345678901234567890" numeric maxLength={20} />
                    ) : (
                      <TextInput name={`${prefix}IdDoc${n}Number`} placeholder="e.g. AB123456" allowChars="A-Za-z0-9" maxLength={20} />
                    )}
                  </Field>
                )}
              </div>
            </div>
          );
        })}
        {/* Hide "Add" once every available document type has been used. */}
        {idDocTypeOptions.length > 0 && idDocCount < idDocTypeOptions.length && (
          <button
            type="button"
            onClick={addIdDoc}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            {t("fields.addDocument")}
          </button>
        )}
      </div>

      {/* Phone */}
      <Field label={t("fields.phone")} optional>
        <PhoneInput name={`${prefix}Phone`} />
      </Field>

      {/* Residence — its own full-width section, clearly separated from Place of Birth */}
      <Field label={t("fields.residence")} required>
        <div className="space-y-3">
          <WardCascade prefix={`${prefix}Res`} showStreet />
          {resIsForeign && (
            <Field label={t("fields.phCity")}>
              <TextInput name={`${prefix}ResCity`} placeholder={t("fields.phCity")} lettersOnly maxLength={30} />
            </Field>
          )}
        </div>
      </Field>
    </div>
  );
}

export default function StepGuardian() {
  const { data, setQuiet } = useWizard();
  const { t } = useI18n();

  // Pre-fill gender: father → Male, mother → Female (only if not already set).
  useEffect(() => {
    if (!data.fatherGender) setQuiet("fatherGender", "M");
    if (!data.motherGender) setQuiet("motherGender", "F");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <ParentBlock prefix="father" label={t("fields.fatherInfo")} />
      <hr className="border-line" />
      <ParentBlock prefix="mother" label={t("fields.motherInfo")} />
    </div>
  );
}

