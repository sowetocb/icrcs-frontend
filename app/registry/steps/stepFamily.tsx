"use client";

import { useEffect, useState } from "react";

import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useMarriageOptions,
  useRelationshipTypeOptions,
  useOccupationTypeOptions,
} from "@/components/registry/blocks";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import { useI18n } from "@/app/i18n/localeProvider";

/**
 * Stage 6 — Family: hasChildren, children[], isMarried, spouses[], relatives[].
 * At least two relatives are required; if married, at least one spouse.
 */

const MIN_RELATIVES = 2;
const MIN_SPOUSES = 1;
const MIN_CHILDREN = 1;

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
// Children use the same inputs as spouses.
const CHILD_SUFFIXES = ["OccType", ...PERSON_SUFFIXES];

/** The common person inputs shared by relatives and spouses. */
function PersonFields({ prefix }: { prefix: string }) {
  const { t } = useI18n();
  const { data } = useWizard();
  const genders = useGenderOptions();

  // Place of birth / residence: the cascade only applies when Tanzania is
  // explicitly picked. City/village shows only for an explicit foreign country.
  const pobCountry = typeof data[`${prefix}PobCountry`] === "string" ? (data[`${prefix}PobCountry`] as string).trim() : "";
  const pobIsTz = pobCountry === "Tanzania";
  const pobIsForeign = pobCountry !== "" && !pobIsTz;

  const resCountry = typeof data[`${prefix}ResCountry`] === "string" ? (data[`${prefix}ResCountry`] as string).trim() : "";
  const resIsTz = resCountry === "Tanzania";
  const resIsForeign = resCountry !== "" && !resIsTz;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} lettersOnly maxLength={15} />
        </Field>
        <Field label={t("fields.middleName")} required>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} lettersOnly maxLength={15} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} lettersOnly maxLength={15} />
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
      </div>

      {/* Place of Birth and Residence are stacked (not side by side) so the two
          identical cascades can't be confused. */}
      <Field label={t("fields.placeOfBirth")} optional>
        <div className="space-y-3">
          <WardCascade prefix={`${prefix}Pob`} showStreet={pobIsTz} />
          {pobIsForeign && (
            <Field label={t("fields.phVillage")}>
              <TextInput name={`${prefix}Village`} placeholder={t("fields.phVillage")} lettersOnly maxLength={30} />
            </Field>
          )}
        </div>
      </Field>
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
    </>
  );
}

function PersonBlock({
  prefix,
  label,
  withRelationship,
  withOccupation = true,
  onRemove,
}: {
  prefix: string;
  label: string;
  withRelationship: boolean;
  /** Children don't have an occupation, so it's hidden for them. */
  withOccupation?: boolean;
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

      {(withRelationship || withOccupation) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {withRelationship && (
            <Field label={t("fields.relationship")} required>
              <Select name={`${prefix}RelType`} placeholder={t("fields.phSelect")} options={relationships} />
            </Field>
          )}
          {withOccupation && (
            <Field label={t("fields.occupation")} optional>
              <Select name={`${prefix}OccType`} placeholder={t("fields.phSelect")} options={occupations} />
            </Field>
          )}
        </div>
      )}

      <PersonFields prefix={prefix} />
    </div>
  );
}

export default function StepFamily() {
  const { data, set } = useWizard();
  const { t } = useI18n();
  const hasChildren = data.hasChildren === true;

  // A minor (subject under 18) cannot have children: "Do you have children?" is
  // forced to "No" and the "Yes" option is locked (mirrors the married lock).
  const isMinor = (() => {
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
  const [minorChildrenConflict, setMinorChildrenConflict] = useState(false);
  useEffect(() => {
    if (isMinor && data.hasChildren !== false) set("hasChildren", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinor]);

  // "Are you married?" is DERIVED from the Stage 1 marital status and locked:
  // a "Married" status forces Yes, anything else forces No. The user can't
  // change it here — attempting to does nothing and surfaces the locked notice.
  const maritalOptions = useMarriageOptions();
  const maritalCode = typeof data.marriage === "string" ? data.marriage : "";
  const marriedAtStage1 = maritalCode.toUpperCase().includes("MARRIED");
  const maritalLabel = maritalOptions.find((o) => o.value === maritalCode)?.label || maritalCode;
  const isMarried = marriedAtStage1;
  const [maritalConflict, setMaritalConflict] = useState(false);

  // Keep the stored flag in sync with the locked, derived answer so the payload
  // and the spouse validation see the right value.
  useEffect(() => {
    if (data.isMarried !== marriedAtStage1) set("isMarried", marriedAtStage1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marriedAtStage1]);
  const relativeCount = Math.max(MIN_RELATIVES, Number(data.relativeCount) || MIN_RELATIVES);
  const spouseCount = Math.max(MIN_SPOUSES, Number(data.spouseCount) || MIN_SPOUSES);
  const childCount = Math.max(MIN_CHILDREN, Number(data.childCount) || MIN_CHILDREN);

  // A child shares the account holder's phone number — pre-fill it (only when the
  // child's phone is still blank, so a manual edit is never overwritten).
  useEffect(() => {
    const holderPhone = typeof data.phone === "string" ? data.phone : "";
    if (!holderPhone || !hasChildren) return;
    for (let n = 1; n <= childCount; n++) {
      if (!data[`ch${n}Phone`]) set(`ch${n}Phone`, holderPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChildren, childCount, data.phone]);

  function addChild() {
    set("childCount", String(childCount + 1));
  }
  function removeLastChild() {
    if (childCount <= MIN_CHILDREN) return;
    for (const suffix of CHILD_SUFFIXES) set(`ch${childCount}${suffix}`, "");
    set("childCount", String(childCount - 1));
  }

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
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="mb-3 text-sm font-medium text-ink">{t("fields.haveChildren")}</p>
          {/* For a minor the "Yes" option is locked; clicking it explains why. */}
          <div className="flex gap-6" onClick={() => isMinor && setMinorChildrenConflict(true)}>
            <label className={`flex items-center gap-2 ${isMinor ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              <input
                type="radio"
                name="hasChildren"
                checked={hasChildren}
                disabled={isMinor}
                onChange={() => set("hasChildren", true)}
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioYes")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="hasChildren"
                checked={!hasChildren}
                onChange={() => set("hasChildren", false)}
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioNo")}</span>
            </label>
          </div>
          {isMinor && (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                minorChildrenConflict ? "bg-warning/10 text-warning" : "bg-navy-50 text-navy-700"
              }`}
            >
              {t("registry.childrenMinorLocked")}
            </p>
          )}
        </div>
        {hasChildren && (
          <div className="space-y-5">
            <p className="text-sm text-muted">{t("fields.childrenNote")}</p>

            {Array.from({ length: childCount }, (_, i) => i + 1).map((n) => (
              <PersonBlock
                key={n}
                prefix={`ch${n}`}
                label={t("fields.childN").replace("{n}", String(n))}
                withRelationship={false}
                withOccupation={false}
                onRemove={
                  n === childCount && childCount > MIN_CHILDREN ? removeLastChild : undefined
                }
              />
            ))}

            <button
              type="button"
              onClick={addChild}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("fields.addChild")}
            </button>
          </div>
        )}
      </div>

      <hr className="border-line" />

      {/* Marital status — locked, derived from Stage 1. */}
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="mb-3 text-sm font-medium text-ink">{t("fields.married")}</p>
          {/* The radios are disabled; clicking anywhere here explains why. */}
          <div className="flex gap-6" onClick={() => setMaritalConflict(true)}>
            <label className="flex cursor-not-allowed items-center gap-2 opacity-70">
              <input
                type="radio"
                name="isMarried"
                checked={isMarried}
                disabled
                readOnly
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioYes")}</span>
            </label>
            <label className="flex cursor-not-allowed items-center gap-2 opacity-70">
              <input
                type="radio"
                name="isMarried"
                checked={!isMarried}
                disabled
                readOnly
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioNo")}</span>
            </label>
          </div>

          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
              maritalConflict
                ? "bg-warning/10 text-warning"
                : "bg-navy-50 text-navy-700"
            }`}
          >
            {t("registry.marriageLocked").replace("{status}", maritalLabel)}
          </p>
        </div>

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
