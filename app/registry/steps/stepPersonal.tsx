"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useMarriageOptions,
  usePersonDocumentTypeOptions,
  useTravelDocumentTypeOptions,
} from "@/components/registry/blocks";
import { useI18n } from "@/app/i18n/localeProvider";
import PhoneInput from "@/components/registry/phoneInput";
import WardCascade from "@/components/registry/wardCascade";
import CountrySelect from "@/components/registry/countrySelect";
import { RULES, docNumberRuleFor } from "@/lib/validation/rules";
import { Camera, X, Plus } from "lucide-react";

/** Mandatory passport-style photo captured at Stage 1. Stored as a data URL so
 * it survives reloads and is rebuilt into the `photo` part on submission. */
function PhotoUpload() {
  const { data, set, errors } = useWizard();
  const { t } = useI18n();
  const invalid = errors.includes("stage1PhotoData");
  const preview = (data.stage1PhotoData as string) || "";
  // Store the error as a translation KEY (not the resolved string) so the
  // message re-translates when the user switches language — a resolved string
  // captured in state would stay in whatever locale was active at upload time.
  const [errorKey, setErrorKey] = useState<"" | "photoTypeError" | "photoSizeError">("");
  const error = errorKey ? t(`fields.${errorKey}`) : "";

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(RULES.PHOTO_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      setErrorKey("photoTypeError");
      return;
    }
    // Cap at 300KB to match the message and the app-wide photo/attachment limit.
    if (file.size > 300 * 1024) {
      setErrorKey("photoSizeError");
      return;
    }
    setErrorKey("");
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
        // The scroll-to-first-error effect targets [data-field] / [data-field-error];
        // this custom (non-input) field carries the marker so a missing photo is
        // scroll-targetable like every other field.
        data-field="stage1PhotoData"
        className={`flex items-center gap-5 rounded-xl border bg-card p-4 ${
          invalid ? "border-danger" : "border-line"
        }`}
      >
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera size={28} strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500">
            {preview ? t("fields.changePhoto") : t("fields.uploadPhoto")}
            <input
              type="file"
              accept={RULES.PHOTO_ALLOWED_MIME.join(",")}
              onChange={handle}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-muted">{t("fields.photoHint")}</p>
          {/* Upload error (type/size) takes precedence; otherwise show the
              required message when validation flagged a missing photo. */}
          {error ? (
            <p role="alert" className="mt-1 text-xs text-danger">
              {error}
            </p>
          ) : invalid ? (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              {t("fields.isRequired").replace("{field}", t("flabel.stage1PhotoData"))}
            </p>
          ) : null}
        </div>
      </div>
    </Field>
  );
}



// Identification document types offered at Stage 1.
const ID_DOC_SUFFIXES = ["Type", "Number"];


export default function StepPersonal() {
  const { data, set, setQuiet, isFirstPerson, isMigrant } = useWizard();
  const { t } = useI18n();
  const genders = useGenderOptions();
  const maritalStatuses = useMarriageOptions();
  const travelDocTypes = useTravelDocumentTypeOptions();
  const currentYear = new Date().getFullYear();

  // Identification documents repeater (one or more): idDoc1Type/Number, …
  // Options come from the lookup; the option value is the backend documentTypeId.
  const idDocCount = Math.max(1, Number(data.idDocCount) || 1);
  const idDocTypeOptions = usePersonDocumentTypeOptions("applicant");

  // Nationality is bound (and locked) from the profile captured at registration.
  // For the account holder's OWN registration it is their profile nationality
  // (migrants / refugees / asylum seekers keep their foreign nationality), seeded
  // by the wizard — leave it as-is. Dependents and Tanzanian-origin minors are
  // Tanzanian, so force Tanzania only for them. Migrant-track dependents (minors
  // of a migrant account holder) and officer-registered migrants keep an open
  // nationality picker — their nationality is NOT forced to Tanzania.
  useEffect(() => {
    if (isFirstPerson) return;
    if (isMigrant) return; // migrant-track: nationality is freely selectable
    if (data.nationalityCountry !== "Tanzania") setQuiet("nationalityCountry", "Tanzania");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marital status is forced to "Single" and locked for anyone who isn't the
  // account holder — every dependent registration (a citizen account holder's
  // dependents, or a foreign profile's Tanzanian minor) — and for any minor.
  // The account holder picks their own status.
  const isMinor = !isFirstPerson || (() => {
    const dob = typeof data.dob === "string" ? data.dob : "";
    if (!dob) return false;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();
  const forceSingle = !isFirstPerson || isMinor;
  const singleValue = maritalStatuses.find((o) => /single/i.test(o.label))?.value ?? "";
  useEffect(() => {
    if (forceSingle && singleValue && data.marriage !== singleValue) setQuiet("marriage", singleValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSingle, singleValue]);

  // Minors only carry a birth certificate — filter the lookup to that type only.
  const birthCertOptions = idDocTypeOptions.filter((o) => /birth/i.test(o.label));
  const effectiveDocOptions = isMinor ? birthCertOptions : idDocTypeOptions;

  // When switching to minor context (or when options first load), collapse extra
  // documents to 1 and clear any non-birth-cert selection on document 1.
  useEffect(() => {
    if (!isMinor || birthCertOptions.length === 0) return;
    const bcIds = new Set(birthCertOptions.map((o) => o.value));
    for (let n = 2; n <= idDocCount; n++) {
      for (const s of ID_DOC_SUFFIXES) set(`idDoc${n}${s}`, "");
    }
    if (idDocCount > 1) set("idDocCount", "1");
    const doc1Type = typeof data.idDoc1Type === "string" ? data.idDoc1Type : "";
    if (doc1Type && !bcIds.has(doc1Type)) {
      set("idDoc1Type", "");
      set("idDoc1Number", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinor, birthCertOptions.length]);

  function addIdDoc() {
    set("idDocCount", String(idDocCount + 1));
  }
  /** Remove a specific document, shifting later ones up into its slot. */
  function removeIdDoc(target: number) {
    if (idDocCount <= 1) return;
    for (let n = target; n < idDocCount; n++) {
      for (const s of ID_DOC_SUFFIXES) {
        const nextVal = data[`idDoc${n + 1}${s}`];
        set(`idDoc${n}${s}`, typeof nextVal === "string" ? nextVal : "");
      }
    }
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name="applicantFirst" placeholder={t("fields.phFirstName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.middleName")} optional>
          <TextInput name="applicantMiddle" placeholder={t("fields.phMiddleName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name="applicantLast" placeholder={t("fields.phLastName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
      </div>

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

        {/* Only the account holder chooses a marital status. Everyone else in
            scope is a minor: the field is hidden and "Single" is sent in the
            background (forced by the forceSingle effect above). */}
        {!forceSingle && (
          <Field label={t("fields.marriage")} required>
            <Select
              name="marriage"
              placeholder={t("fields.phSelectStatus")}
              options={maritalStatuses}
            />
          </Field>
        )}
      </div>

      {/* Nationality. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.nationality")} required>
          <CountrySelect name="nationalityCountry" placeholder={t("fields.phCountryNat")} disabled={!isMigrant} />
        </Field>
      </div>

      {/* Physical characteristics — collected for every registration category.
          v002 requires eye colour, hair colour and language spoken; the rest are
          optional. Shared across citizen and migrant tracks. */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-navy-700">
          {t("fields.physicalCharacteristics")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.otherNames")} optional>
            <TextInput name="otherNames" placeholder={t("fields.phOtherNames")} lettersOnly maxLength={RULES.OTHER_NAMES_MAX} />
          </Field>
          <Field label={t("fields.tribe")} optional>
            <TextInput name="tribe" placeholder={t("fields.phTribe")} lettersOnly maxLength={RULES.TRIBE_MAX} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t("fields.eyeColor")} required>
            <TextInput name="eyeColor" placeholder={t("fields.phEyeColor")} lettersOnly maxLength={RULES.EYE_COLOR_MAX} />
          </Field>
          <Field label={t("fields.hairColor")} required>
            <TextInput name="hairColor" placeholder={t("fields.phHairColor")} lettersOnly maxLength={RULES.HAIR_COLOR_MAX} />
          </Field>
          <Field label={t("fields.languageSpoken")} required>
            <TextInput name="languageSpoken" placeholder={t("fields.phLanguageSpoken")} lettersOnly maxLength={RULES.LANGUAGE_SPOKEN_MAX} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.heightCm")} optional>
            {/* Range (50–280) is enforced on blur from RULES.HEIGHT_CM_MIN/MAX. */}
            <TextInput name="heightCm" placeholder={t("fields.phHeightCm")} numeric maxLength={String(RULES.HEIGHT_CM_MAX).length} />
          </Field>
          <Field label={t("fields.specialMark")} optional>
            {/* ORG-class free text: letters, numbers and basic punctuation only —
                strip the symbol soup the backend's ORG validator rejects. */}
            <TextInput
              name="specialMark"
              placeholder={t("fields.phSpecialMark")}
              allowChars={RULES.ORG_ALLOWED_CHARS}
              mustStartWithLetter
              maxLength={RULES.SPECIAL_MARK_MAX}
            />
          </Field>
        </div>
      </div>

      {/* Identification documents — pick a type and enter its number; add more
          than one if needed. */}
      <div className="space-y-3">
        {Array.from({ length: idDocCount }, (_, i) => i + 1).map((n) => {
          const type = typeof data[`idDoc${n}Type`] === "string" ? (data[`idDoc${n}Type`] as string) : "";
          const docLabel = idDocTypeOptions.find((o) => o.value === type)?.label ?? "";
          const docRule = docNumberRuleFor(docLabel);
          // A document type already chosen in another row is hidden here so it
          // can't be picked twice (the current row keeps its own selection).
          const pickedElsewhere = new Set(
            Array.from({ length: idDocCount }, (_, m) => m + 1)
              .filter((m) => m !== n)
              .map((m) => (typeof data[`idDoc${m}Type`] === "string" ? (data[`idDoc${m}Type`] as string) : ""))
              .filter(Boolean),
          );
          const availableOptions = effectiveDocOptions.filter((o) => o.value === type || !pickedElsewhere.has(o.value));
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
                  {/* Changing the document type clears the number — a number
                      entered for one type must not carry over to another. */}
                  <Select
                    name={`idDoc${n}Type`}
                    placeholder={t("fields.phSelect")}
                    options={availableOptions}
                    onValueChange={() => set(`idDoc${n}Number`, "")}
                  />
                </Field>
                {type && (
                  <Field label={t("fields.docNumber")} required>
                    {/* Per-type format (NIDA 20 digits, TIN 9–10, others ranged). */}
                    {docRule.numeric ? (
                      <TextInput name={`idDoc${n}Number`} placeholder="1234567890" numeric maxLength={docRule.max} />
                    ) : (
                      <TextInput name={`idDoc${n}Number`} placeholder="e.g. AB123456" allowChars="A-Za-z0-9" maxLength={docRule.max} />
                    )}
                  </Field>
                )}
              </div>
            </div>
          );
        })}
        {/* Minors have only one document type (birth cert) — hide Add entirely. */}
        {!isMinor && effectiveDocOptions.length > 0 && idDocCount < effectiveDocOptions.length && (
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
                maxLength={RULES.UI_CITY_MAX}
              />
            </Field>
          )}
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.phone")} required>
          <PhoneInput name="phone" />
        </Field>
        <Field label={t("fields.email")} required>
          <TextInput name="email" type="email" placeholder="test@test.com" maxLength={RULES.UI_EMAIL_MAX} />
        </Field>
      </div>

      {/* Travel History — migrant track only (Migrant / Refugee / Asylum Seeker).
          Submitted with Stage 1 to /travel-history. All fields optional; the
          document details show only when the person has a travel document. */}
      {isMigrant && (
        <div className="space-y-4 rounded-xl border border-line bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-navy-700">{t("fields.travelHistory")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("fields.travelHistoryHint")}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("fields.firstDateOfEntry")} optional>
              <DateInput name="firstDateOfEntry" />
            </Field>
            <Field label={t("fields.pointOfEntry")} optional>
              <TextInput name="pointOfEntry" placeholder={t("fields.phPointOfEntry")} maxLength={RULES.POINT_OF_ENTRY_MAX} />
            </Field>
          </div>
          <Field label={t("fields.transitCountry")} optional>
            <CountrySelect name="transitCountry" placeholder={t("fields.phCountryNat")} />
          </Field>

          <div>
            <span className="block text-sm font-medium text-ink">{t("fields.hasTravelDoc")}</span>
            <div className="mt-2 flex gap-6">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="hasTravelDoc"
                    checked={data.hasTravelDoc === v}
                    onChange={() => set("hasTravelDoc", v)}
                    className="h-4 w-4 accent-navy-700"
                  />
                  {t(v ? "fields.yes" : "fields.no")}
                </label>
              ))}
            </div>
          </div>

          {data.hasTravelDoc === true && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelDocType")} required>
                  {/* Foreign National Travel Document lookup — the selected name
                      is sent as the free-text `documentType`. */}
                  <Select name="travelDocType" placeholder={t("fields.phTravelDocType")} options={travelDocTypes} />
                </Field>
                <Field label={t("fields.travelDocNo")} optional>
                  <TextInput name="travelDocNo" placeholder={t("fields.phDocNumber")} allowChars="A-Za-z0-9" maxLength={RULES.TRAVEL_DOC_NO_MAX} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelIssuedDate")} optional>
                  <DateInput name="travelIssuedDate" />
                </Field>
                <Field label={t("fields.travelExpiryDate")} optional>
                  {/* A travel document expires in the FUTURE, so the picker must
                      reach past today — the calendar's year grid ends at maxDate
                      (defaulting to the current year). Allow the next 10 years. */}
                  <DateInput name="travelExpiryDate" maxDate={`${currentYear + 10}-12-31`} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelIssueCountry")} optional>
                  <CountrySelect name="travelIssueCountry" placeholder={t("fields.phCountryNat")} />
                </Field>
                <Field label={t("fields.travelIssueAuthority")} optional>
                  <TextInput name="travelIssueAuthority" placeholder={t("fields.phTravelIssueAuthority")} maxLength={RULES.TRAVEL_ISSUE_AUTHORITY_MAX} />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}