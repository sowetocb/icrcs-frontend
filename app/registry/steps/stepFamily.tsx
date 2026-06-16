"use client";

import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useRelationshipTypeOptions,
  useOccupationTypeOptions,
  documentTypeOptions,
} from "@/components/registry/blocks";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import DocumentUpload from "@/components/registry/documentUpload";
import { useI18n } from "@/app/i18n/localeProvider";

/**
 * Stage 6 — Family: hasChildren, children[], isMarried, spouses[], relatives[].
 * At least two relatives are required; if married, at least one spouse.
 */

const MIN_RELATIVES = 2;
const MIN_SPOUSES = 1;

// Shared person field suffixes — used to clear a removed block.
const PERSON_SUFFIXES = [
  "First", "Middle", "Last", "Dob", "Gender", "Phone", "NatCountry",
  "PobCountry", "PobCountryId", "PobRegionId", "PobRegion", "PobDistrictId",
  "PobDistrict", "PobWardId", "PobWard", "Village", "ResCountry", "ResCountryId",
  "ResRegionId", "ResRegion", "ResDistrictId", "ResDistrict", "ResWardId",
  "ResWard", "ResCity", "ResStreet", "DocType", "DocNumber", "DocFileUrl",
];
const RELATIVE_SUFFIXES = ["RelType", "OccType", ...PERSON_SUFFIXES];
const SPOUSE_SUFFIXES = ["OccType", ...PERSON_SUFFIXES];

/** The common person inputs shared by relatives and spouses. */
function PersonFields({ prefix }: { prefix: string }) {
  const { t } = useI18n();
  const { data } = useWizard();
  const genders = useGenderOptions();

  // Place of birth / residence: the Region→District→Ward→Street cascade only
  // applies to Tanzania. For any other country the cascade is hidden and a
  // free-text village/city is collected instead. An unset country is Tanzania.
  const pobIsTz =
    !data[`${prefix}PobCountry`] || data[`${prefix}PobCountry`] === "Tanzania";
  const resIsTz =
    !data[`${prefix}ResCountry`] || data[`${prefix}ResCountry`] === "Tanzania";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} />
        </Field>
        <Field label={t("fields.middleName")} required>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.dob")} optional>
          <DateInput name={`${prefix}Dob`} />
        </Field>
        <Field label={t("fields.gender")} required>
          <Select name={`${prefix}Gender`} placeholder={t("fields.phSelect")} options={genders} />
        </Field>
        <Field label={t("fields.phone")} required>
          <PhoneInput name={`${prefix}Phone`} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.nationality")} required>
          <CountrySelect name={`${prefix}NatCountry`} placeholder={t("fields.phCountry")} />
        </Field>
        <Field label={t("fields.docType")} optional>
          <Select name={`${prefix}DocType`} placeholder={t("fields.phSelect")} options={documentTypeOptions(t)} />
        </Field>
        <Field label={t("fields.docNumber")} optional>
          <TextInput name={`${prefix}DocNumber`} placeholder={t("fields.phDocNumber")} />
        </Field>
      </div>

      <DocumentUpload prefix={prefix} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Field label={t("fields.placeOfBirth")} optional>
          <div className="space-y-3">
            <WardCascade prefix={`${prefix}Pob`} showStreet={pobIsTz} />
            {!pobIsTz && (
              <Field label={t("fields.phVillage")}>
                <TextInput name={`${prefix}Village`} placeholder={t("fields.phVillage")} />
              </Field>
            )}
          </div>
        </Field>
        <Field label={t("fields.residence")} required>
          <div className="space-y-3">
            <WardCascade prefix={`${prefix}Res`} showStreet />
            {!resIsTz && (
              <Field label={t("fields.phCity")}>
                <TextInput name={`${prefix}ResCity`} placeholder={t("fields.phCity")} />
              </Field>
            )}
          </div>
        </Field>
      </div>
    </>
  );
}

function PersonBlock({
  prefix,
  label,
  withRelationship,
  onRemove,
}: {
  prefix: string;
  label: string;
  withRelationship: boolean;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const relationships = useRelationshipTypeOptions();
  const occupations = useOccupationTypeOptions();
  return (
    <div className="space-y-5 rounded-xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-700">{label}</h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-danger transition hover:underline"
          >
            {t("fields.remove")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {withRelationship && (
          <Field label={t("fields.relationship")} required>
            <Select name={`${prefix}RelType`} placeholder={t("fields.phSelect")} options={relationships} />
          </Field>
        )}
        <Field label={t("fields.occupation")} optional>
          <Select name={`${prefix}OccType`} placeholder={t("fields.phSelect")} options={occupations} />
        </Field>
      </div>

      <PersonFields prefix={prefix} />
    </div>
  );
}

export default function StepFamily() {
  const { data, set } = useWizard();
  const { t } = useI18n();
  const hasChildren = data.hasChildren === true;
  const isMarried = data.isMarried === true;
  const relativeCount = Math.max(MIN_RELATIVES, Number(data.relativeCount) || MIN_RELATIVES);
  const spouseCount = Math.max(MIN_SPOUSES, Number(data.spouseCount) || MIN_SPOUSES);

  function addRelative() {
    set("relativeCount", String(relativeCount + 1));
  }
  function removeLastRelative() {
    if (relativeCount <= MIN_RELATIVES) return;
    for (const suffix of RELATIVE_SUFFIXES) set(`rel${relativeCount}${suffix}`, "");
    set("relativeCount", String(relativeCount - 1));
  }

  function addSpouse() {
    set("spouseCount", String(spouseCount + 1));
  }
  function removeLastSpouse() {
    if (spouseCount <= MIN_SPOUSES) return;
    for (const suffix of SPOUSE_SUFFIXES) set(`sp${spouseCount}${suffix}`, "");
    set("spouseCount", String(spouseCount - 1));
  }

  return (
    <div className="space-y-8">
      {/* Children */}
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-4">
          <input
            type="checkbox"
            checked={hasChildren}
            onChange={(e) => set("hasChildren", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-navy-700"
          />
          <span className="text-sm font-medium text-ink">{t("fields.haveChildren")}</span>
        </label>
        {hasChildren && (
          <p className="text-sm text-muted px-1">
            {t("fields.childrenNote")}
          </p>
        )}
      </div>

      <hr className="border-line" />

      {/* Marital status */}
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-4">
          <input
            type="checkbox"
            checked={isMarried}
            onChange={(e) => set("isMarried", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-navy-700"
          />
          <span className="text-sm font-medium text-ink">{t("fields.married")}</span>
        </label>

        {isMarried && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              {t("fields.spouseNote")}
            </p>

            {Array.from({ length: spouseCount }, (_, i) => i + 1).map((n) => (
              <PersonBlock
                key={n}
                prefix={`sp${n}`}
                label={t("fields.spouseN").replace("{n}", String(n))}
                withRelationship={false}
                onRemove={
                  n === spouseCount && spouseCount > MIN_SPOUSES ? removeLastSpouse : undefined
                }
              />
            ))}

            <button
              type="button"
              onClick={addSpouse}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("fields.addSpouse")}
            </button>
          </div>
        )}
      </div>

      <hr className="border-line" />

      {/* Relatives */}
      <div className="space-y-5">
        <h3 className="font-display text-base font-bold text-navy-700">{t("fields.relativesTitle")}</h3>
        <p className="text-sm text-muted">
          {t("fields.relativesNote")}
        </p>

        {Array.from({ length: relativeCount }, (_, i) => i + 1).map((n) => (
          <PersonBlock
            key={n}
            prefix={`rel${n}`}
            label={t("fields.relativeN").replace("{n}", String(n))}
            withRelationship
            onRemove={
              n === relativeCount && relativeCount > MIN_RELATIVES ? removeLastRelative : undefined
            }
          />
        ))}

        <button
          type="button"
          onClick={addRelative}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("fields.addRelative")}
        </button>
      </div>
    </div>
  );
}
