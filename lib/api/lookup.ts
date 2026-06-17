// Public reference data (no auth), from two upstreams via the proxy:
//   • Lookup microservice (/lookup/*) — geographic cascade plus demographic
//     enums. Hierarchy: Territory → Region → District → Ward → Street.
//   • Main backend (/v1/lookup/*) — countries (id + ISO code, needed to resolve
//     residenceCountryId / nationalityCode) and document/attachment types.
//
// NOTE: ids from the Lookup service (ward/street/relationship/occupation/
// citizenship/education) are submitted to the registration backend. They must
// match that backend's dataset, or stored values will be mis-mapped.
//
// Results are cached per session so each list is fetched once.

import { apiGet } from "./client";

export type LookupItem = { id: number; name: string; code?: string };

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

// Per-session cache keyed by request path.
const cache = new Map<string, Promise<LookupItem[]>>();

function listEnvelope(raw: unknown): Row[] {
  const data = (raw as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as Row[]) : [];
}

/** Fetch + map a lookup list, caching the in-flight promise by path. */
function getList(path: string, map: (o: Row) => LookupItem): Promise<LookupItem[]> {
  const cached = cache.get(path);
  if (cached) return cached;
  const p = apiGet(path)
    .then((raw) => listEnvelope(raw).map(map))
    .catch((err) => {
      cache.delete(path); // allow a retry after a failure
      throw err;
    });
  cache.set(path, p);
  return p;
}

// ──────────────────────────────────────────────────────────────────────────
// Countries — main backend (/v1/lookup/countries → { countryId, isoCode,
// countryName }). id = countryId (residenceCountryId), code = isoCode
// (nationalityCode "TZA"). Kept here because the Lookup service's countries
// list has no numeric id.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_COUNTRIES: LookupItem[] = [{ id: 147, name: "Tanzania", code: "TZA" }];

/** GET /v1/lookup/countries */
export function getCountries(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_COUNTRIES);
  return getList("/v1/lookup/countries", (o) => ({
    id: num(o.countryId),
    name: str(o.countryName),
    code: str(o.isoCode),
  })).catch(() => MOCK_COUNTRIES);
}

// ──────────────────────────────────────────────────────────────────────────
// Geographic cascade — Lookup service. Territory → Region → District → Ward →
// Street. Verified shapes: each level is { <entity>Name, id }.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_TERRITORIES: LookupItem[] = [
  { id: 1, name: "Mainland", code: "UHM001" },
  { id: 2, name: "Zanzibar", code: "UHM002" },
];
const MOCK_REGIONS: LookupItem[] = [
  { id: 1, name: "ARUSHA" },
  { id: 2, name: "DAR ES SALAAM" },
  { id: 3, name: "DODOMA" },
];
const MOCK_DISTRICTS: LookupItem[] = [
  { id: 1, name: "ARUSHA" },
  { id: 5, name: "MONDULI" },
];
const MOCK_WARDS: LookupItem[] = [
  { id: 1, name: "THEMI" },
  { id: 6, name: "DARAJA II" },
];
const MOCK_STREETS: LookupItem[] = [
  { id: 1, name: "AICC FLATS" },
  { id: 45, name: "CORRIDOR AREA" },
];

/** GET /lookup/territories */
export function getTerritories(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_TERRITORIES);
  return getList("/lookup/territories", (o) => ({
    id: num(o.id),
    name: str(o.territoryName),
    code: str(o.territoryCode),
  })).catch(() => MOCK_TERRITORIES);
}

/** GET /lookup/regions/{territoryId} */
export function getRegions(territoryId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_REGIONS);
  return getList(`/lookup/regions/${territoryId}`, (o) => ({
    id: num(o.id),
    name: str(o.regionName),
  }));
}

/** GET /lookup/districts/{regionId} */
export function getDistricts(regionId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_DISTRICTS);
  return getList(`/lookup/districts/${regionId}`, (o) => ({
    id: num(o.id),
    name: str(o.districtName),
  }));
}

/** GET /lookup/district-councils/{districtId} */
export function getDistrictCouncils(districtId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve([]);
  return getList(`/lookup/district-councils/${districtId}`, (o) => ({
    id: num(o.id),
    name: str(o.districtCouncilName),
  }));
}

/** GET /lookup/wards/by-district/{districtId} */
export function getWards(districtId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_WARDS);
  return getList(`/lookup/wards/by-district/${districtId}`, (o) => ({
    id: num(o.id),
    name: str(o.wardName),
  }));
}

/** GET /lookup/wards/by-district-council/{councilId} */
export function getWardsByCouncil(councilId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_WARDS);
  return getList(`/lookup/wards/by-district-council/${councilId}`, (o) => ({
    id: num(o.id),
    name: str(o.wardName),
  }));
}

/** GET /lookup/streets/{wardId} */
export function getStreets(wardId: number): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_STREETS);
  return getList(`/lookup/streets/${wardId}`, (o) => ({
    id: num(o.id),
    name: str(o.streetName),
  }));
}

// Upward hierarchy from a street id (territory → street).

export type StreetHierarchy = {
  streetId: number;
  streetName: string;
  wardId: number;
  wardName: string;
  districtId: number;
  districtName: string;
  regionId: number;
  regionName: string;
  territoryId: number;
  territoryName: string;
};

/** GET /lookup/street-info/{streetId} — full hierarchy from a street id. */
export async function getStreetInfo(streetId: number): Promise<StreetHierarchy | null> {
  if (BYPASS || !streetId) return null;
  try {
    const raw = await apiGet(`/lookup/street-info/${streetId}`);
    const d = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
    if (!d || typeof d !== "object") return null;
    const territory = (d.territory ?? {}) as Record<string, unknown>;
    const region = (d.region ?? {}) as Record<string, unknown>;
    const district = (d.district ?? {}) as Record<string, unknown>;
    const ward = (d.ward ?? {}) as Record<string, unknown>;
    const street = (d.street ?? {}) as Record<string, unknown>;
    return {
      streetId: num(street.id),
      streetName: str(street.streetName),
      wardId: num(ward.id),
      wardName: str(ward.wardName),
      districtId: num(district.id),
      districtName: str(district.districtName),
      regionId: num(region.id),
      regionName: str(region.regionName),
      territoryId: num(territory.id),
      territoryName: str(territory.territoryName),
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Demographic enums — Lookup service. Verified shapes noted per endpoint.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_GENDERS: LookupItem[] = [
  { id: 1, name: "MALE", code: "M" },
  { id: 2, name: "FEMALE", code: "F" },
];
const MOCK_MARITAL_STATUSES: LookupItem[] = [
  { id: 1, name: "SINGLE", code: "SINGLE" },
  { id: 2, name: "MARRIED", code: "MARRIED" },
  { id: 3, name: "DIVORCED", code: "DIVORCED" },
  { id: 4, name: "WIDOWED", code: "WIDOWED" },
  { id: 5, name: "SEPARATED", code: "SEPARATED" },
];
const MOCK_EDUCATION: LookupItem[] = [
  { id: 4, name: "Primary Education" },
  { id: 5, name: "Secondary Education" },
  { id: 6, name: "Certificate" },
  { id: 7, name: "Diploma" },
];
const MOCK_OCCUPATIONS: LookupItem[] = [
  { id: 2, name: "Government Employee" },
  { id: 3, name: "Private Sector Employee" },
  { id: 4, name: "Self Employed / Business Owner" },
];
const MOCK_RELATIONSHIPS: LookupItem[] = [
  { id: 2, name: "Father" },
  { id: 3, name: "Mother" },
  { id: 4, name: "Brother" },
  { id: 5, name: "Sister" },
];
const MOCK_CITIZENSHIP_TYPES: LookupItem[] = [
  { id: 2, name: "Birth" },
  { id: 3, name: "Naturalization" },
  { id: 4, name: "Decent" },
];

/** Map a gender name ("MALE"/"FEMALE") to the M/F/O code the backend expects
 * everywhere. The lookup itself doesn't return a code, so we derive it. */
function genderCodeFromName(name: string): string {
  const n = name.trim().toUpperCase();
  if (n.startsWith("M")) return "M";
  if (n.startsWith("F")) return "F";
  return "O";
}

/** GET /lookup/genders → { genderName, id }. We attach a `code` (M/F/O) so the
 * option `value` submitted to the backend is the code, not the lookup id. */
export function getGenders(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_GENDERS);
  return getList("/lookup/genders", (o) => {
    const name = str(o.genderName);
    return { id: num(o.id), name, code: genderCodeFromName(name) };
  }).catch(() => MOCK_GENDERS);
}

/** GET /lookup/marital-statuses → { statusName, id }.
 * The backend stores statuses without a separate code field — derive the
 * canonical uppercase name so the registration payload can use it directly
 * ("SINGLE", "MARRIED", etc.). */
export function getMaritalStatuses(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_MARITAL_STATUSES);
  return getList("/lookup/marital-statuses", (o) => {
    const name = str(o.statusName);
    return {
      id: num(o.id),
      name,
      code: name.toUpperCase().replace(/\s+/g, "_"),
    };
  }).catch(() => MOCK_MARITAL_STATUSES);
}

/** GET /lookup/educations → { levelName, id } */
export function getEducationLevels(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_EDUCATION);
  return getList("/lookup/educations", (o) => ({
    id: num(o.id),
    name: str(o.levelName),
  })).catch(() => MOCK_EDUCATION);
}

/** GET /lookup/occupations → { occupationName, id } */
export function getOccupations(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_OCCUPATIONS);
  return getList("/lookup/occupations", (o) => ({
    id: num(o.id),
    name: str(o.occupationName),
  })).catch(() => MOCK_OCCUPATIONS);
}

/** GET /lookup/relationships → { relation, id } */
export function getRelationships(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_RELATIONSHIPS);
  return getList("/lookup/relationships", (o) => ({
    id: num(o.id),
    name: str(o.relation),
  })).catch(() => MOCK_RELATIONSHIPS);
}

/** GET /lookup/citizenship → { name, id } */
export function getCitizenshipTypes(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_CITIZENSHIP_TYPES);
  return getList("/lookup/citizenship", (o) => ({
    id: num(o.id),
    name: str(o.name),
  })).catch(() => MOCK_CITIZENSHIP_TYPES);
}

// ──────────────────────────────────────────────────────────────────────────
// Document / attachment types — main backend (/v1/lookup/*); not served by the
// Lookup service.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_DOCUMENT_TYPES: LookupItem[] = [
  { id: 1, name: "National ID (NIDA)", code: "NATIONAL_ID" },
  { id: 2, name: "Passport", code: "PASSPORT" },
  { id: 3, name: "Birth Certificate", code: "BIRTH_CERT" },
];
const MOCK_ATTACHMENT_TYPES: LookupItem[] = [
  { id: 1, name: "Applicant Birth Certificate / Birth Affidavit", code: "BIRTH_CERTIFICATE" },
  { id: 2, name: "Father Birth Certificate / Affidavit", code: "FATHER_BIRTH_CERT" },
];

/** GET /v1/lookup/document-types */
export function getDocumentTypes(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_DOCUMENT_TYPES);
  return getList("/v1/lookup/document-types", (o) => ({
    id: num(o.documentTypeId),
    name: str(o.documentName),
    code: str(o.code),
  })).catch(() => MOCK_DOCUMENT_TYPES);
}

/** GET /v1/lookup/attachment-types */
export function getAttachmentTypes(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_ATTACHMENT_TYPES);
  return getList("/v1/lookup/attachment-types", (o) => ({
    id: num(o.attachmentTypeId),
    name: str(o.typeName),
    code: str(o.code),
  })).catch(() => MOCK_ATTACHMENT_TYPES);
}

/** Maps lookup items to the registry Select's option shape. */
export function toOptions(
  items: LookupItem[],
  value: "id" | "code" = "code",
): { value: string; label: string }[] {
  return items.map((i) => ({
    value: value === "id" ? String(i.id) : i.code ?? String(i.id),
    label: i.name,
  }));
}
