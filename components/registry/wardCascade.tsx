"use client";

import { useEffect, useRef, useState } from "react";
import { useWizard } from "./field";
import { useLookup } from "@/components/lookup/useLookup";
import {
  getCountries,
  getTerritories,
  getRegions,
  getDistricts,
  getWards,
  getStreets,
  type LookupItem,
} from "@/lib/api/lookup";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";
import CountryMenu from "./countryMenu";
import { useI18n } from "@/app/i18n/localeProvider";

const selectCls =
  "w-full appearance-none rounded-lg border border-line bg-card px-3.5 py-2.5 pr-9 text-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15 disabled:cursor-not-allowed disabled:bg-line/30 disabled:text-muted";

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CascadeSelect({
  value,
  label,
  options,
  disabled,
  invalid,
  onChange,
}: {
  value: string;
  label?: string;
  options: LookupItem[];
  disabled: boolean;
  invalid: boolean;
  onChange: (item: LookupItem | null) => void;
}) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      )}
      <div className="relative">
      <select
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const id = e.target.value;
          onChange(options.find((o) => String(o.id) === id) ?? null);
        }}
        className={`${selectCls} ${value ? "text-ink" : "text-muted/60"} ${invalid ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
      >
        <option value="" disabled>
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <Chevron />
      </div>
    </div>
  );
}

/**
 * Country picker with flag emojis and search, wired to the lookup API.
 * Uses CountryMenu for the dropdown and maps selections back to lookup IDs.
 */
function CountryPicker({
  countryName,
  placeholder,
  disabled,
  invalid,
  lookupCountries,
  onChange,
}: {
  countryName: string;
  placeholder: string;
  disabled: boolean;
  invalid: boolean;
  lookupCountries: LookupItem[];
  onChange: (lookupItem: LookupItem | null, country: Country | null) => void;
}) {
  const selected = COUNTRIES.find((c) => c.name === countryName);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/15"
            : "border-line focus:border-navy-500 focus:ring-navy-500/15"
        } ${disabled ? "cursor-not-allowed bg-line/30 text-muted" : ""}`}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate text-ink">
            <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted/60">{placeholder}</span>
        )}
        <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <CountryMenu
          onClose={() => setOpen(false)}
          onSelect={(c) => {
            // Find the matching lookup item by name to get the API id
            const lookupMatch = lookupCountries.find(
              (l) => l.name.toLowerCase() === c.name.toLowerCase() ||
                     l.code?.toLowerCase() === c.code.toLowerCase(),
            );
            onChange(lookupMatch ?? null, c);
          }}
        />
      )}
    </div>
  );
}

/**
 * Cascading Region → District → Ward picker (Tanzania) backed by the lookup API.
 * Writes both numeric ids (`<prefix>RegionId/DistrictId/WardId`, the ward id is
 * what Stage 1/2 send) and the display names (`<prefix>Region/District/Ward`,
 * used by the preview & printable form) to the wizard.
 */
export default function WardCascade({
  prefix,
  disabled = false,
  levels = "ward",
  showCountry = true,
  showStreet = false,
  alwaysCascade = false,
}: {
  prefix: string;
  disabled?: boolean;
  /** "district" stops the cascade at District (no Ward column). */
  levels?: "ward" | "district";
  /** Hide the country picker and force Tanzania (for domestic addresses). */
  showCountry?: boolean;
  /** Show a Street / Mtaa dropdown after Ward (for address forms). */
  showStreet?: boolean;
  /** Always show the Region/District/Ward cascade (even for non-Tanzania), so
   * Country + Region + District + Ward coexist (e.g. address forms). */
  alwaysCascade?: boolean;
}) {
  const { data, set, errors } = useWizard();
  const { t } = useI18n();

  // The Tanzania cascade is rooted at Territory (Mainland / Zanzibar), which
  // drives regions. The Country picker is a separate concern (nationality /
  // foreign place-of-birth); when the country is Tanzania the territory cascade
  // is shown.
  const countryName = (data[`${prefix}Country`] as string) || "";
  const territoryId = Number(data[`${prefix}TerritoryId`]) || 0;
  const regionId = Number(data[`${prefix}RegionId`]) || 0;
  const districtId = Number(data[`${prefix}DistrictId`]) || 0;
  const wardIdVal = String(data[`${prefix}WardId`] ?? "");
  const wardIdNum = Number(wardIdVal) || 0;
  const streetIdVal = String(data[`${prefix}StreetId`] ?? "");

  const { options: countries } = useLookup(() => getCountries(), []);
  const { options: territories } = useLookup(() => getTerritories(), []);
  const { options: regions } = useLookup(
    () => (territoryId ? getRegions(territoryId) : Promise.resolve([])),
    [territoryId],
  );
  const { options: districts } = useLookup(
    () => (regionId ? getDistricts(regionId) : Promise.resolve([])),
    [regionId],
  );
  const { options: wards, loading: wardsLoading } = useLookup(
    () => (districtId ? getWards(districtId) : Promise.resolve([])),
    [districtId],
  );
  const { options: streets, loading: streetsLoading } = useLookup(
    () => (showStreet && wardIdNum ? getStreets(wardIdNum) : Promise.resolve([])),
    [showStreet, wardIdNum],
  );

  const wardPlaceholder = !districtId
    ? t("fields.phSelectDistrictFirst")
    : wardsLoading
      ? t("fields.phLoadingWards")
      : wards.length === 0
        ? t("fields.phNoWards")
        : t("fields.phWard");

  const streetPlaceholder = !wardIdNum
    ? t("fields.phSelectWardFirst")
    : streetsLoading
      ? t("fields.phLoadingStreets")
      : streets.length === 0
        ? t("fields.phNoStreets")
        : t("fields.phMtaa");

  const clear = (...keys: string[]) => keys.forEach((k) => set(`${prefix}${k}`, ""));

  const cols =
    levels === "district" ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

  // Region/District/Ward only apply to Tanzania. The cascade is shown ONLY
  // when Tanzania is explicitly picked as the country. When no country has been
  // selected yet, neither the cascade nor the city field is rendered — just the
  // country picker. A foreign country hides the cascade entirely; the caller's
  // free-text City field is used instead.
  const explicitlyTanzania = countryName.trim().toLowerCase() === "tanzania";
  // Domestic-forced: no country picker (address) or alwaysCascade.
  const forceCascade = alwaysCascade || !showCountry;
  // Show cascade when Tanzania is explicitly chosen, or when the caller forces it.
  const showTzCascade = forceCascade || explicitlyTanzania;
  // Territory is enabled only once Tanzania is the chosen country; before any
  // country is picked it renders disabled.
  const territoryDisabled = disabled || (!forceCascade && !explicitlyTanzania);

  return (
    <div className="space-y-3">
      {/* Country — drives the regions below, with flag emoji + search */}
      {showCountry && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {t("fields.country")}
          </span>
          <CountryPicker
            countryName={countryName}
            placeholder={t("fields.phCountry")}
            disabled={disabled}
            invalid={errors.includes(`${prefix}Country`)}
            lookupCountries={countries}
            onChange={(lookupItem, country) => {
              set(`${prefix}CountryId`, lookupItem ? String(lookupItem.id) : "");
              set(`${prefix}Country`, country?.name ?? "");
              clear("TerritoryId", "Territory", "RegionId", "Region", "DistrictId", "District", "WardId", "Ward", "StreetId", "Street");
            }}
          />
        </div>
      )}

      {showTzCascade && (
      <div className={`grid grid-cols-1 gap-3 ${cols}`}>
        <CascadeSelect
          value={String(territoryId || "")}
          label={t("fields.phTerritory")}
          options={territories}
          disabled={territoryDisabled}
          invalid={errors.includes(`${prefix}Territory`)}
          onChange={(item) => {
            set(`${prefix}TerritoryId`, item ? String(item.id) : "");
            set(`${prefix}Territory`, item?.name ?? "");
            clear("RegionId", "Region", "DistrictId", "District", "WardId", "Ward", "StreetId", "Street");
          }}
        />
        <CascadeSelect
          value={String(regionId || "")}
          label={t("fields.phRegion")}
          options={regions}
          disabled={disabled || !territoryId}
          invalid={errors.includes(`${prefix}Region`)}
          onChange={(item) => {
            set(`${prefix}RegionId`, item ? String(item.id) : "");
            set(`${prefix}Region`, item?.name ?? "");
            clear("DistrictId", "District", "WardId", "Ward", "StreetId", "Street");
          }}
        />
      <CascadeSelect
        value={String(districtId || "")}
        label={t("fields.phDistrict")}
        options={districts}
        disabled={disabled || !regionId}
        invalid={errors.includes(`${prefix}District`)}
        onChange={(item) => {
          set(`${prefix}DistrictId`, item ? String(item.id) : "");
          set(`${prefix}District`, item?.name ?? "");
          clear("WardId", "Ward", "StreetId", "Street");
        }}
      />
      {levels === "ward" && (
        <CascadeSelect
          value={wardIdVal}
          label={t("fields.phWard")}
          options={wards}
          disabled={disabled || !districtId}
          invalid={errors.includes(`${prefix}Ward`)}
          onChange={(item) => {
            set(`${prefix}WardId`, item ? String(item.id) : "");
            set(`${prefix}Ward`, item?.name ?? "");
            clear("StreetId", "Street");
          }}
        />
      )}
      </div>
      )}

      {/* Street / Mtaa dropdown — shown after Ward when showStreet is enabled */}
      {showTzCascade && showStreet && levels === "ward" && (
        <CascadeSelect
          value={streetIdVal}
          label={t("fields.phMtaa")}
          options={streets}
          disabled={disabled || !wardIdNum}
          invalid={errors.includes(`${prefix}Street`)}
          onChange={(item) => {
            set(`${prefix}StreetId`, item ? String(item.id) : "");
            set(`${prefix}Street`, item?.name ?? "");
          }}
        />
      )}
    </div>
  );
}
