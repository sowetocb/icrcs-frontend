"use client";
import { useState, type ChangeEvent } from "react";
import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useMarriageOptions,
  usePersonDocumentTypeOptions,
  NameRow,
} from "@/components/registry/blocks";
import { useI18n } from "@/app/i18n/localeProvider";
import PhoneInput from "@/components/registry/phoneInput";
import WardCascade from "@/components/registry/wardCascade";
import CountrySelect from "@/components/registry/countrySelect";

/** Mandatory passport-style photo captured at Stage 1. Stored as a data URL so
 * it survives reloads and is rebuilt into the `photo` part on submission. */
function PhotoUpload() {
  const { data, set, errors } = useWizard();
  const { t } = useI18n();
  const invalid = errors.includes("stage1PhotoData");
  const preview = (data.stage1PhotoData as string) || "";
  const [error, setError] = useState("");
  

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError(t("fields.photoTypeError"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("fields.photoSizeError"));
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      set("stage1PhotoData", String(reader.result));
      set("stage1PhotoName", file.name);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Field label={t("fields.photo")} required>
      <div
        className={`flex items-center gap-5 rounded-xl border bg-card p-4 ${
          invalid ? "border-danger" : "border-line"
        }`}
      >
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500">
            {preview ? t("fields.changePhoto") : t("fields.uploadPhoto")}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handle}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-muted">{t("fields.photoHint")}</p>
          {error && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </Field>
  );
}



// Identification document types offered at Stage 1.
const ID_DOC_SUFFIXES = ["Type", "Number"];

export default function StepPersonal() {
  const { data, set } = useWizard();
  const { t } = useI18n();
  const genders = useGenderOptions();
  const maritalStatuses = useMarriageOptions();
  const currentYear = new Date().getFullYear();

  // Identification documents repeater (one or more): idDoc1Type/Number, …
  // Options come from the lookup; the option value is the backend documentTypeId.
  const idDocCount = Math.max(1, Number(data.idDocCount) || 1);
  const idDocTypeOptions = usePersonDocumentTypeOptions("applicant");
  function addIdDoc() {
    set("idDocCount", String(idDocCount + 1));
  }
  function removeLastIdDoc() {
    if (idDocCount <= 1) return;
    for (const s of ID_DOC_SUFFIXES) set(`idDoc${idDocCount}${s}`, "");
    set("idDocCount", String(idDocCount - 1));
  }

  // Place-of-birth logic: the Tanzania cascade (territory → ward → street)
  // renders only when Tanzania is explicitly picked. The free-text city field
  // renders only when a non-Tanzania country is explicitly picked. When no
  // country is selected yet, neither is shown — just the country picker.
  const pobCountry = typeof data.pobCountry === "string" ? (data.pobCountry as string).trim() : "";
  const bornInTanzania = pobCountry === "Tanzania";
  const bornAbroad = pobCountry !== "" && !bornInTanzania;

  return (
    <div className="space-y-5">
      <Field label={t("fields.fullName")} required>
        <NameRow prefix="applicant" />
      </Field>

      <PhotoUpload />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.gender")} required>
          <Select
            name="gender"
            placeholder={t("fields.phSelectGender")}
            options={genders}
          />
        </Field>

        <Field label={t("fields.dob")} required>
          <DateInput
          name="dob"
          minDate={`${currentYear - 120}-01-01`}
        />
        </Field>

        <Field label={t("fields.marriage")} required>
          <Select
            name="marriage"
            placeholder={t("fields.phSelectStatus")}
            options={maritalStatuses}
          />
        </Field>
      </div>

      {/* Nationality. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.nationality")} required>
          <CountrySelect name="nationalityCountry" placeholder={t("fields.phCountryNat")} />
        </Field>
      </div>

      {/* Identification documents — pick a type and enter its number; add more
          than one if needed. */}
      <div className="space-y-3">
        {Array.from({ length: idDocCount }, (_, i) => i + 1).map((n) => {
          const type = typeof data[`idDoc${n}Type`] === "string" ? (data[`idDoc${n}Type`] as string) : "";
          const isNida = idDocTypeOptions.find((o) => o.value === type)?.label.toUpperCase() === "NIDA";
          return (
            <div key={n} className="space-y-4 rounded-xl border border-line bg-card p-4">
              {idDocCount > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-700">
                    {t("fields.documentN").replace("{n}", String(n))}
                  </span>
                  {n === idDocCount && (
                    <button
                      type="button"
                      onClick={removeLastIdDoc}
                      className="text-xs font-semibold text-danger transition hover:underline"
                    >
                      {t("fields.remove")}
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.docType")} optional>
                  <Select name={`idDoc${n}Type`} placeholder={t("fields.phSelect")} options={idDocTypeOptions} />
                </Field>
                {type && (
                  <Field label={t("fields.docNumber")} optional>
                    {/* NIDA is exactly 20 digits — numeric, capped; others free-form. */}
                    {isNida ? (
                      <TextInput name={`idDoc${n}Number`} placeholder="12345678901234567890" numeric maxLength={20} />
                    ) : (
                      <TextInput name={`idDoc${n}Number`} placeholder="e.g. AB123456" />
                    )}
                  </Field>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addIdDoc}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("fields.addDocument")}
        </button>
      </div>

      <Field label={t("fields.placeOfBirth")} required>
        {/* Single country picker (lookup-connected, with flag). The Region/
          District/Ward cascade shows for Tanzania; for any other country only
          the free-text City/Village below is used. */}
        <div className="space-y-3">
          {/* Enable street selection internally inside the cascade helper */}
          <WardCascade prefix="pob" showStreet={bornInTanzania} />
          {/* Only show free-text when born abroad (not Tanzania) */}
          {bornAbroad && (
            <Field label={t("fields.phCityVillageBirth")}>
              <TextInput
                name="pobCityVillage"
                placeholder={t("fields.phCityVillageBirth")}
                lettersOnly
              />
            </Field>
          )}
        </div>
      </Field>

      {bornInTanzania && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.birthCertNo")} optional>
            <TextInput name="birthCertNo" placeholder="TZ1234567890" />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.phone")} required>
          <PhoneInput name="phone" />
        </Field>
        <Field label={t("fields.email")} required>
          <TextInput name="email" type="email" placeholder="test@test.com" />
        </Field>
      </div>
    </div>
  );
}