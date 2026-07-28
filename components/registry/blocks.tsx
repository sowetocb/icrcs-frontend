"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FieldError, Select, TextInput, useWizard } from "./field";
import { useI18n } from "@/app/i18n/localeProvider";
import { localizeLookup } from "@/lib/i18n/lookupLabels";
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
  getForeignNationalTravelDocuments,
  getBorders,
  getCampNames,
  type LookupItem,
  type BorderItem,
  type PersonGroup,
} from "@/lib/api/lookup";
import { COUNTRIES } from "@/lib/countries";
import WardCascade from "./wardCascade";

type Opt = { value: string; label: string };
/** An occupation option plus its untranslated backend name (`en`), so callers
 * can match on English regardless of the active locale. */
export type OccupationOpt = Opt & { en: string };
export type LookupSelectState = { options: Opt[]; loading: boolean };
export type OccupationSelectState = { options: OccupationOpt[]; loading: boolean };
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
): LookupSelectState {
  const { t } = useI18n();
  const { options: items, loading } = useLookup(fetcher, []);
  const staticOpts = staticBuilder(t);
  if (loading) return { options: staticOpts, loading: true };
  if (!items.length) return { options: staticOpts, loading: false };
  // Match the static (translatable) label to the backend value ignoring case,
  // spaces and punctuation — so a code like "Self Employed" still resolves to
  // the "Self-employed" option's localized label instead of falling back to the
  // raw English name. (Numeric id values are unaffected.)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const labelFor = (value: string) =>
    staticOpts.find((o) => norm(o.value) === norm(value))?.label;
  return {
    loading: false,
    options: items.map((i) => {
      const value = valueKey === "id" ? String(i.id) : i.code ?? String(i.id);
      return { value, label: labelFor(value) ?? i.name };
    }),
  };
}

// Gender renders the exact label returned by the lookup API (e.g. "Ke (Female)",
// "Me (Male)"); the option value stays the M/F/O code the backend payload uses.
export const useGenderOptions = (): LookupSelectState => {
  const { t, locale } = useI18n();
  const { options: items, loading } = useLookup(getGenders, []);
  if (loading) return { options: genderOptions(t), loading: true };
  if (!items.length) return { options: genderOptions(t), loading: false };
  // Prefer the M/F/O code — the lookup name can be bilingual ("Ke (Female)").
  // Fall back to a name lookup for any gender outside those three codes.
  const byCode: Record<string, string> = {
    M: t("opt.male"),
    F: t("opt.female"),
    O: t("opt.other"),
  };
  return {
    loading: false,
    options: items.map((i) => {
      const value = i.code ?? String(i.id);
      return {
        value,
        label: byCode[value.toUpperCase()] ?? localizeLookup(i.name, "gender", locale),
      };
    }),
  };
};
// Marital status renders the exact label returned by the lookup API (e.g.
// "Sijaoa / Sijaolewa (Single)"); the option value stays the enum code the
// backend payload resolves to an id.
export const useMarriageOptions = (): LookupSelectState => {
  const { t, locale } = useI18n();
  const { options: items, loading } = useLookup(getMaritalStatuses, []);
  if (loading) return { options: marriageOptions(t), loading: true };
  if (!items.length) return { options: marriageOptions(t), loading: false };
  return {
    loading: false,
    options: items.map((i) => ({
      value: i.code ?? String(i.id),
      label: localizeLookup(i.name, "marital", locale),
    })),
  };
};
// Citizenship types and relationships come back as English names — localize by
// name (the option VALUE stays the backend id, so submissions are unaffected).
export const useCitizenshipTypeOptions = (): LookupSelectState => {
  const { t, locale } = useI18n();
  const { options: items, loading } = useLookup(getCitizenshipTypes, []);
  if (loading) return { options: citizenshipTypeIdOptions(t), loading: true };
  if (!items.length) return { options: citizenshipTypeIdOptions(t), loading: false };
  return {
    loading: false,
    options: items.map((i) => ({
      value: String(i.id),
      label: localizeLookup(i.name, "citizenship", locale),
    })),
  };
};
export const useRelationshipTypeOptions = (): LookupSelectState => {
  const { t, locale } = useI18n();
  const { options: items, loading } = useLookup(getRelationships, []);
  if (loading) return { options: relationshipTypeOptions(t), loading: true };
  if (!items.length) return { options: relationshipTypeOptions(t), loading: false };
  return {
    loading: false,
    options: items.map((i) => ({
      value: String(i.id),
      label: localizeLookup(i.name, "relationship", locale),
    })),
  };
};
// Occupations come from the backend as English names (no stable id→label map),
// so we localize by name: the option value stays the backend occupation id and
// the label is the Swahili term when the locale is `sw` (English name otherwise).
export const useOccupationTypeOptions = (): OccupationSelectState => {
  const { t, locale } = useI18n();
  const { options: items, loading } = useLookup(getOccupations, []);
  const staticOpts = occupationTypeOptions(t).map((o) => ({ ...o, en: o.label }));
  if (loading) return { options: staticOpts, loading: true };
  // `en` carries the untranslated backend name so callers can filter/match on it
  // (e.g. the narrowed occupation set in Stage 4) without depending on the
  // locale-dependent label.
  if (!items.length) return { options: staticOpts, loading: false };
  return {
    loading: false,
    options: items.map((i) => ({
      value: String(i.id),
      label: localizeLookup(i.name, "occupation", locale),
      en: i.name,
    })),
  };
};
// Employment status: value is the status name (used to gate occupation/employer
// and resolved to the lookup id in the Stage 4 payload).
export const useEmploymentStatusOptions = () =>
  useLocalizedOptions(getEmploymentStatuses, jobOptions, "code");

// Foreign-national travel-document types (migrant travel history). The option
// VALUE is the display name — sent straight through as the free-text
// `documentType` in the travel-history payload.
export const useTravelDocumentTypeOptions = (): LookupSelectState => {
  const { locale } = useI18n();
  const { options: items, loading } = useLookup(getForeignNationalTravelDocuments, []);
  if (loading) return { options: [], loading: true };
  // The VALUE stays the English name (it's submitted verbatim); only the visible
  // label is localized.
  return {
    loading: false,
    options: items.map((i) => ({
      value: i.name,
      label: localizeLookup(i.name, "travelDoc", locale),
    })),
  };
};

// Refugee / settlement camps from /v1/lookup/camps (migrant address block).
// The option VALUE is the camp NAME — it is sent verbatim as the free-text
// `campName` in the Stage 2 address payload, so the backend contract is
// unchanged by moving from a text input to a dropdown.
export const useCampNameOptions = (): LookupSelectState => {
  const { options: items, loading } = useLookup(getCampNames, []);
  if (loading) return { options: [], loading: true };
  return {
    loading: false,
    options: items.map((i) => ({ value: i.name, label: i.name })),
  };
};

// Sentinel select value for the "Others" border row — when picked, the border
// dropdown reveals a free-text field so the applicant can type an unofficial
// entry point that isn't listed. Kept distinct from any real border name.
export const OTHER_BORDER = "__OTHER_BORDER__";

// The `borderTo` value each of Tanzania's 8 land-border countries maps to in the
// borders lookup, keyed by ISO code. (DR Congo is "DRC" in the border data even
// though its country name differs.) International entries use "International".
const BORDER_TO_BY_CODE: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  RW: "Rwanda",
  BI: "Burundi",
  CD: "DRC",
  ZM: "Zambia",
  MW: "Malawi",
  MZ: "Mozambique",
};

/** Point-of-entry (border) picker. Fetches /v1/lookup/borders and filters it by
 * the applicant's route: a specific transit country shows only that country's
 * land crossings; the International route shows all air/sea ports. The "Others"
 * row is ALWAYS available (unofficial entry point) and, when picked, reveals a
 * free-text field. The resolved value is stored in `pointOfEntry` (the free-text
 * field the backend already expects); `pointOfEntrySel` holds the dropdown
 * selection only. */
export function PointOfEntryField() {
  const { t } = useI18n();
  const { data, set } = useWizard();
  const [borders, setBorders] = useState<BorderItem[]>([]);
  const [bordersLoading, setBordersLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setBordersLoading(true);
    getBorders()
      .then((b) => {
        if (alive) setBorders(b);
      })
      .finally(() => {
        if (alive) setBordersLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Which borders to show: International → every "International" port; a transit
  // country → only that country's crossings. "Others" is always kept.
  const intl = data.entryInternational === true;
  const transit = typeof data.transitCountry === "string" ? data.transitCountry.trim() : "";
  const transitCode = COUNTRIES.find((c) => c.name === transit)?.code ?? "";
  const targetBorderTo = intl ? "International" : BORDER_TO_BY_CODE[transitCode] ?? "";
  const norm = (s: string) => s.trim().toLowerCase();

  const options: Opt[] = borders
    .filter((b) => {
      if (b.code.toUpperCase() === "OTHERS") return true; // always available
      if (!targetBorderTo) return false; // no route chosen yet → only "Others"
      return norm(b.borderTo) === norm(targetBorderTo);
    })
    .map((b) => ({
      value: b.code.toUpperCase() === "OTHERS" ? OTHER_BORDER : b.name,
      label: b.name,
    }));

  const sel = typeof data.pointOfEntrySel === "string" ? data.pointOfEntrySel : "";
  const isOther = sel === OTHER_BORDER;

  // Rehydrate the dropdown from a resumed `pointOfEntry`: match a filtered border
  // by name, else fall back to "Others" (manual entry). Runs once borders load.
  useEffect(() => {
    if (sel || options.length === 0) return;
    const poe = typeof data.pointOfEntry === "string" ? data.pointOfEntry.trim() : "";
    if (!poe) return;
    const match = options.find((o) => o.value !== OTHER_BORDER && o.value === poe);
    set("pointOfEntrySel", match ? match.value : OTHER_BORDER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borders.length]);

  return (
    <div className="space-y-3">
      <Select
        name="pointOfEntrySel"
        placeholder={t("fields.phSelectBorder")}
        options={options}
        loading={bordersLoading}
        onValueChange={(v) => {
          // A specific border → store its name as pointOfEntry; "Others" or the
          // empty placeholder → clear it so the manual field (or nothing) drives
          // the submitted value.
          set("pointOfEntry", v === OTHER_BORDER || v === "" ? "" : v);
        }}
      />
      {isOther && (
        <TextInput
          name="pointOfEntry"
          placeholder={t("fields.phPointOfEntry")}
          maxLength={RULES.POINT_OF_ENTRY_MAX}
        />
      )}
    </div>
  );
}

/** Migrant-flow gate for skippable stages (e.g. education / family): a Yes/No
 * question shown before the form. Fields render only when the user answers
 * "Yes"; "No" leaves them hidden and the wizard skips on Save. `field` is the
 * boolean gate key (stored in wizard data), validated in the wizard's Save.
 *
 * When `forcedYes` is set (e.g. married/widowed migrants who must declare a
 * spouse), Yes is applied automatically and the radios are locked. */
export function MigrantStageGate({
  field,
  question,
  children,
  forcedYes = false,
  forcedNotice,
}: {
  field: string;
  question: string;
  children: ReactNode;
  /** Lock the gate to Yes — used when Stage 1 marital status requires spouse info. */
  forcedYes?: boolean;
  /** Optional explanation shown under the locked radios. */
  forcedNotice?: string;
}) {
  const { data, set, setQuiet, errors } = useWizard();
  const { t } = useI18n();
  const val = forcedYes ? true : data[field];
  const invalid = !forcedYes && errors.includes(field);

  useEffect(() => {
    if (forcedYes && data[field] !== true) setQuiet(field, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedYes, field]);

  return (
    <div className="space-y-6">
      <div>
        <span className="block text-base font-medium text-ink">{question}</span>
        <div
          className={`mt-2 flex flex-wrap gap-6 ${forcedYes ? "opacity-70" : ""}`}
          data-field={field}
        >
          {[
            { v: true, label: t("registry.yes") },
            { v: false, label: t("registry.no") },
          ].map(({ v, label }) => (
            <label
              key={String(v)}
              className={`flex items-center gap-2 text-sm font-medium text-ink ${
                forcedYes ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name={field}
                checked={val === v}
                disabled={forcedYes}
                readOnly={forcedYes}
                onChange={() => {
                  if (!forcedYes) set(field, v);
                }}
                className={`h-4 w-4 accent-navy-700 ${invalid ? "outline outline-2 outline-danger" : ""}`}
              />
              {label}
            </label>
          ))}
        </div>
        {forcedYes && forcedNotice ? (
          <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-sm font-medium text-navy-700">
            {forcedNotice}
          </p>
        ) : (
          <FieldError name={field} />
        )}
      </div>
      {val === true && children}
    </div>
  );
}

/** Identification document type options for a person group (applicant / father
 * / mother), fetched from /lookup/person-document-types. The option VALUE is the
 * backend documentTypeId — so picking e.g. NIDA stores its exact id, which is
 * sent straight through in documents[].documentTypeId. */
export function usePersonDocumentTypeOptions(group: PersonGroup | string): LookupSelectState {
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getPersonDocumentTypes()
      .then((d) => {
        if (!active) return;
        // Use the requested group's documents when available; fall back to the
        // father group for unrecognised groups (e.g. "guardian") so the dropdown
        // still renders the full set of document types.
        const items = d[group as PersonGroup] ?? d.father ?? [];
        setOptions(items.map((i) => ({ value: String(i.id), label: i.name })));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [group]);
  return { options, loading };
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
