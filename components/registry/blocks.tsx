"use client";

import { useEffect, useState } from "react";
import { TextInput, useWizard } from "./field";
import { useI18n } from "@/app/i18n/localeProvider";
import { localizeOccupation } from "@/lib/i18n/occupations";
import { RULES } from "@/lib/validation/rules";
import { useLookup } from "@/components/lookup/useLookup";
import {
  getGenders,
  getMaritalStatuses,
  getCitizenshipTypes,
  getRelationships,
  getOccupations,
  getEmploymentStatuses,
  getPersonDocumentTypes,
  type LookupItem,
  type PersonGroup,
} from "@/lib/api/lookup";
import WardCascade from "./wardCascade";

type Opt = { value: string; label: string };
type Translate = (path: string) => string;

/** Option builders take the translator so dropdown labels follow the locale.
 * The stored `value`s never change, so existing submissions stay valid. */
export const genderOptions = (t: Translate): Opt[] => [
  { value: "M", label: t("opt.male") },
  { value: "F", label: t("opt.female") },
];
export const marriageOptions = (t: Translate): Opt[] => [
  { value: "SINGLE", label: t("opt.single") },
  { value: "MARRIED", label: t("opt.married") },
  { value: "DIVORCED", label: t("opt.divorced") },
  { value: "WIDOWED", label: t("opt.widowed") },
];
export const jobOptions = (t: Translate): Opt[] => [
  { value: "Employed", label: t("opt.employed") },
  { value: "Self-employed", label: t("opt.selfEmployed") },
  { value: "Unemployed", label: t("opt.unemployed") },
  { value: "Student", label: t("opt.student") },
  { value: "Retired", label: t("opt.retired") },
];
export const citizenshipTypeIdOptions = (t: Translate): Opt[] => [
  { value: "1", label: t("opt.citBirth") },
  { value: "2", label: t("opt.citDescent") },
  { value: "3", label: t("opt.citNaturalization") },
];
export const relationshipTypeOptions = (t: Translate): Opt[] => [
  { value: "1", label: t("opt.relParent") },
  { value: "2", label: t("opt.relSibling") },
  { value: "3", label: t("opt.relSpouse") },
  { value: "4", label: t("opt.relChild") },
  { value: "5", label: t("opt.relRelative") },
  { value: "6", label: t("opt.relGuardian") },
  { value: "7", label: t("opt.relFriend") },
  { value: "8", label: t("opt.relOther") },
];
export const occupationTypeOptions = (t: Translate): Opt[] => [
  { value: "1", label: t("opt.occGovernment") },
  { value: "2", label: t("opt.occPrivate") },
  { value: "3", label: t("opt.occSelfEmployed") },
  { value: "4", label: t("opt.occFarmer") },
  { value: "5", label: t("opt.occStudent") },
  { value: "6", label: t("opt.occRetired") },
  { value: "7", label: t("opt.occUnemployed") },
  { value: "8", label: t("opt.occOther") },
  { value: "14", label: t("opt.occBusiness") },
];
export const documentTypeOptions = (t: Translate): Opt[] => [
  { value: "1", label: t("opt.docNida") },
  { value: "2", label: t("opt.docPassport") },
  { value: "3", label: t("opt.docDriving") },
  { value: "4", label: t("opt.docVoter") },
];

// Travel documents a non-citizen identifies themselves with at the citizenship
// gate (distinct from the citizen ID documents above). NOTE: the values are the
// backend travel-document type ids — align them with the immigration backend's
// lookup once that endpoint is finalised.
export const travelDocumentOptions = (t: Translate): Opt[] => [
  {value: "1", label: t("opt.travelPassport")},
  { value: "2", label: t("opt.travelEtd") },
  { value: "3", label: t("opt.travelCoi") },
  { value: "4", label: t("opt.travelGeneva") },
  { value: "5", label: t("opt.travelLaissez") },
  { value: "6", label: t("opt.travelOther") },
];

/**
 * Lookup-driven option hooks: the available options and their stored values
 * come from the lookup API, while the visible label is taken from the local
 * translations ("backend value, local label"). When the API returns nothing
 * (AUTH_BYPASS mock empty / endpoint down) we fall back to the static list.
 */
function useLocalizedOptions(
  fetcher: () => Promise<LookupItem[]>,
  staticBuilder: (t: Translate) => Opt[],
  valueKey: "id" | "code",
): Opt[] {
  const { t } = useI18n();
  const { options: items } = useLookup(fetcher, []);
  const staticOpts = staticBuilder(t);
  if (!items.length) return staticOpts;
  // Match the static (translatable) label to the backend value ignoring case,
  // spaces and punctuation — so a code like "Self Employed" still resolves to
  // the "Self-employed" option's localized label instead of falling back to the
  // raw English name. (Numeric id values are unaffected.)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const labelFor = (value: string) =>
    staticOpts.find((o) => norm(o.value) === norm(value))?.label;
  return items.map((i) => {
    const value = valueKey === "id" ? String(i.id) : i.code ?? String(i.id);
    return { value, label: labelFor(value) ?? i.name };
  });
}

// Gender renders the exact label returned by the lookup API (e.g. "Ke (Female)",
// "Me (Male)"); the option value stays the M/F/O code the backend payload uses.
export const useGenderOptions = (): Opt[] => {
  const { t } = useI18n();
  const { options: items } = useLookup(getGenders, []);
  if (!items.length) return genderOptions(t);
  return items.map((i) => ({ value: i.code ?? String(i.id), label: i.name }));
};
// Marital status renders the exact label returned by the lookup API (e.g.
// "Sijaoa / Sijaolewa (Single)"); the option value stays the enum code the
// backend payload resolves to an id.
export const useMarriageOptions = (): Opt[] => {
  const { t } = useI18n();
  const { options: items } = useLookup(getMaritalStatuses, []);
  if (!items.length) return marriageOptions(t);
  return items.map((i) => ({ value: i.code ?? String(i.id), label: i.name }));
};
export const useCitizenshipTypeOptions = () =>
  useLocalizedOptions(getCitizenshipTypes, citizenshipTypeIdOptions, "id");
export const useRelationshipTypeOptions = () =>
  useLocalizedOptions(getRelationships, relationshipTypeOptions, "id");
// Occupations come from the backend as English names (no stable id→label map),
// so we localize by name: the option value stays the backend occupation id and
// the label is the Swahili term when the locale is `sw` (English name otherwise).
export const useOccupationTypeOptions = (): Opt[] => {
  const { t, locale } = useI18n();
  const { options: items } = useLookup(getOccupations, []);
  if (!items.length) return occupationTypeOptions(t);
  return items.map((i) => ({
    value: String(i.id),
    label: localizeOccupation(i.name, locale),
  }));
};
// Employment status: value is the status name (used to gate occupation/employer
// and resolved to the lookup id in the Stage 4 payload).
export const useEmploymentStatusOptions = () =>
  useLocalizedOptions(getEmploymentStatuses, jobOptions, "code");

/** Identification document type options for a person group (applicant / father
 * / mother), fetched from /lookup/person-document-types. The option VALUE is the
 * backend documentTypeId — so picking e.g. NIDA stores its exact id, which is
 * sent straight through in documents[].documentTypeId. */
export function usePersonDocumentTypeOptions(group: PersonGroup | string): Opt[] {
  const [options, setOptions] = useState<Opt[]>([]);
  useEffect(() => {
    let active = true;
    getPersonDocumentTypes()
      .then((d) => {
        if (!active) return;
        // Use the requested group's documents when available; fall back to the
        // father group for unrecognised groups (e.g. "guardian") so the dropdown
        // still renders the full set of document types.
        const items = d[group as PersonGroup] ?? d.father ?? [];
        setOptions(items.map((i) => ({ value: String(i.id), label: i.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [group]);
  return options;
}

/** Three-column First / Middle / Last name row, bound by prefix. */
export function NameRow({ prefix }: { prefix: string }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Each input is wrapped so its inline error renders directly below it
          (the TextInput fragment would otherwise spill into the next grid cell). */}
      <div>
        <TextInput name={`${prefix}First`} placeholder={t("fields.phFirstName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
      </div>
      <div>
        <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddleName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
      </div>
      <div>
        <TextInput name={`${prefix}Last`} placeholder={t("fields.phLastName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
      </div>
    </div>
  );
}

/** Full address block. WardCascade provides the country picker (with flags)
 * plus cascading Region→District→Ward. When a non-Tanzanian country is
 * selected, free-text address fields are shown instead of the cascade. */
export function AddressFields({
  prefix,
  disabled = false,
}: {
  prefix: string;
  disabled?: boolean;
}) {
  const { data } = useWizard();
  const { t } = useI18n();
  const country = data[`${prefix}Country`];
  const inTanzania = !country || country === "Tanzania";

  return (
    <div className="space-y-3">
      <WardCascade prefix={prefix} disabled={disabled} showStreet />
      {inTanzania && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput name={`${prefix}Pobox`} placeholder={t("fields.phPostal")} disabled={disabled} />
        </div>
      )}
      {!inTanzania && (
        // Foreign address — region/district/ward are entered manually.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput name={`${prefix}Region`} placeholder={t("fields.phRegion")} disabled={disabled} />
          <TextInput name={`${prefix}District`} placeholder={t("fields.phDistrict")} disabled={disabled} />
          <TextInput name={`${prefix}Ward`} placeholder={t("fields.phWard")} disabled={disabled} />
        </div>
      )}
    </div>
  );
}
