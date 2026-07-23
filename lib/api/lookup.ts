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
import { apiGet } from "./client";

export type LookupItem = { id: number; name: string; code?: string };

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

function listEnvelope(raw: unknown): Row[] {
  const data = (raw as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as Row[]) : [];
}

/** Fetch + map a lookup list. No caching — always fetches fresh data. */
function getList(path: string, map: (o: Row) => LookupItem): Promise<LookupItem[]> {
  return apiGet(path).then((raw) => listEnvelope(raw).map(map));
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
const MOCK_EMPLOYMENT_STATUSES: LookupItem[] = [
  { id: 1, name: "Employed", code: "Employed" },
  { id: 2, name: "Self-Employed", code: "Self-Employed" },
  { id: 3, name: "Unemployed", code: "Unemployed" },
  { id: 4, name: "Retired", code: "Retired" },
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

/** Map a gender name to the M/F/O code used internally. The lookup returns
 * bilingual names like "Ke (Female)" / "Me (Male)", so match the English keyword
 * (FEMALE before MALE — "female" contains "male") rather than the first letter,
 * which would mis-map the Swahili prefix "Ke" to "O". This drives the option
 * value + display code only; the visible label still renders the exact API name. */
function genderCodeFromName(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("FEMALE")) return "F";
  if (n.includes("MALE")) return "M";
  const trimmed = n.trim();
  if (trimmed.startsWith("F")) return "F";
  if (trimmed.startsWith("M")) return "M";
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

/** Resolve a stored gender value (the app keeps the M/F/O code) to the gender
 * lookup ID the backend expects. Matches on code, name, or an already-stored id.
 * Returns null when nothing matches. */
export async function resolveGenderId(value: string): Promise<number | null> {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  try {
    const genders = await getGenders();
    const match = genders.find(
      (g) =>
        (g.code ?? "").toUpperCase() === v ||
        g.name.toUpperCase() === v ||
        String(g.id) === value.trim(),
    );
    if (match) return match.id;
  } catch {
    // lookup unavailable — fall through
  }
  return null;
}

/** Inverse of {@link resolveGenderId}: normalise a gender value coming from the
 * backend (lookup id like "1", a name like "MALE", or already an M/F/O code) to
 * the M/F/O code the app uses everywhere. Falls back to a first-letter heuristic
 * when the lookup is unavailable. */
export async function resolveGenderCode(value: string): Promise<string> {
  if (!value) return "";
  const v = value.trim().toUpperCase();
  try {
    const genders = await getGenders();
    const match = genders.find(
      (g) =>
        String(g.id) === value.trim() ||
        (g.code ?? "").toUpperCase() === v ||
        g.name.toUpperCase() === v,
    );
    if (match?.code) return match.code;
  } catch {
    // lookup unavailable — fall through to the heuristic
  }
  if (v.startsWith("M")) return "M";
  if (v.startsWith("F")) return "F";
  return value;
}

/** Derive the canonical marital-status enum the backend payload expects from the
 * lookup's bilingual `statusName` (e.g. "Sijaoa / Sijaolewa (Single)" → SINGLE,
 * "Mjane / Mgane (Widowed)" → WIDOW). */
function maritalCodeFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("single")) return "SINGLE";
  if (n.includes("married")) return "MARRIED";
  if (n.includes("divorc")) return "DIVORCED";
  if (n.includes("widow")) return "WIDOW";
  if (n.includes("separat")) return "SEPARATED";
  // Fallback: canonical uppercase of the raw name.
  return name.toUpperCase().replace(/\s+/g, "_");
}

/** GET /lookup/marital-statuses → { statusName, id }.
 * The backend stores statuses without a separate code field — derive the
 * canonical enum ("SINGLE", "MARRIED", "DIVORCED", "WIDOW", "SEPARATED") so the
 * registration payload can use it directly. */
export function getMaritalStatuses(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_MARITAL_STATUSES);
  return getList("/lookup/marital-statuses", (o) => {
    const name = str(o.statusName);
    return {
      id: num(o.id),
      name,
      code: maritalCodeFromName(name),
    };
  }).catch(() => MOCK_MARITAL_STATUSES);
}

/** GET /v1/lookup/employment-statuses → { statusName, id }. The statusName is
 * stable enough to use as the option value (code); the backend payload sends the
 * id, resolved via {@link resolveEmploymentStatusId}. */
export function getEmploymentStatuses(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_EMPLOYMENT_STATUSES);
  return getList("/v1/lookup/employment-statuses", (o) => {
    const name = str(o.statusName);
    return { id: num(o.id), name, code: name };
  }).catch(() => MOCK_EMPLOYMENT_STATUSES);
}

/** Resolve a stored employment-status value (the form keeps the status name) to
 * the lookup ID the Stage 4 payload expects. Matches on code, name, or an
 * already-stored id. Returns null when nothing matches. */
export async function resolveEmploymentStatusId(value: string): Promise<number | null> {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  try {
    const items = await getEmploymentStatuses();
    const match = items.find(
      (s) =>
        (s.code ?? "").toUpperCase() === v ||
        s.name.toUpperCase() === v ||
        String(s.id) === value.trim(),
    );
    if (match) return match.id;
  } catch {
    // lookup unavailable — fall through
  }
  return null;
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

// Foreign-national travel-document types (migrant Stage 1 travel history). Sent
// back as the free-text `documentType`, so options carry the display name.
const MOCK_FN_TRAVEL_DOCS: LookupItem[] = [
  { id: 1, name: "Passport", code: "PASSPORT" },
  { id: 2, name: "Travel Document", code: "TRAVEL_DOCUMENT" },
  { id: 3, name: "Refugee Convention Travel Document", code: "CONVENTION_TRAVEL_DOCUMENT" },
  { id: 4, name: "Emergency Travel Document", code: "EMERGENCY_TRAVEL_DOCUMENT" },
  { id: 5, name: "Laissez-Passer", code: "LAISSEZ_PASSER" },
  { id: 6, name: "Certificate of Identity", code: "CERTIFICATE_OF_IDENTITY" },
];

/** GET /v1/lookup/foreign-national-travel-documents — travel-document types for
 * the migrant travel-history block. NOTE: confirm the exact endpoint path; the
 * mock fallback keeps the dropdown usable if it 404s. */
export function getForeignNationalTravelDocuments(): Promise<LookupItem[]> {
  if (BYPASS) return Promise.resolve(MOCK_FN_TRAVEL_DOCS);
  return getList("/v1/lookup/foreign-national-travel-documents", (o) => ({
    id: num(o.documentTypeId ?? o.id),
    name: str(o.documentName ?? o.name ?? o.typeName),
    code: str(o.code),
  })).catch(() => MOCK_FN_TRAVEL_DOCS);
}

// A border / point-of-entry post. `borderTo` is the country the crossing leads
// to ("Kenya", "Zambia", "DRC", …) or "International" for air/sea ports; the
// "Others" row has borderTo "N/A". Used to filter the point-of-entry dropdown by
// the applicant's transit country (or International route).
export type BorderItem = { id: number; name: string; code: string; borderTo: string };

/** GET /v1/lookup/borders → { borderId, borderName, code, transportModeCategory,
 * territory, borderTo }. Public (no auth), like every other lookup. The "Others"
 * row (code OTHERS) lets the applicant type an unofficial entry point. Data comes
 * ONLY from the endpoint — no mock fallback; an error yields an empty list. */
export function getBorders(): Promise<BorderItem[]> {
  return apiGet("/v1/lookup/borders")
    .then((raw) =>
      listEnvelope(raw).map((o) => ({
        id: num(o.borderId ?? o.id),
        name: str(o.borderName ?? o.name),
        code: str(o.code),
        borderTo: str(o.borderTo),
      })),
    )
    .catch(() => []);
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

// Identification document types grouped by person (applicant / father / mother).
// Each entry's `id` is the documentTypeId sent in `documents[].documentTypeId`.
export type PersonGroup = "applicant" | "father" | "mother";
export type PersonDocumentTypes = Record<PersonGroup, LookupItem[]>;

const MOCK_PERSON_DOCUMENT_TYPES: PersonDocumentTypes = {
  applicant: [
    { id: 1, name: "NIDA", code: "NIDA" },
    { id: 3, name: "Birth Certificate", code: "BIRTH_CERT" },
    { id: 4, name: "Driving Licence", code: "DRIVING_LIC" },
    { id: 5, name: "TIN", code: "TIN" },
    { id: 7, name: "Voters ID", code: "VOTERS_ID" },
  ],
  father: [
    { id: 9, name: "NIDA", code: "FATHER_NIDA" },
    { id: 10, name: "Birth Certificate", code: "FATHER_BIRTH_CERT" },
    { id: 11, name: "Driving Licence", code: "FATHER_DRIVING_LIC" },
    { id: 12, name: "TIN", code: "FATHER_TIN" },
    { id: 13, name: "Voters ID", code: "FATHER_VOTERS_ID" },
  ],
  mother: [
    { id: 14, name: "NIDA", code: "MOTHER_NIDA" },
    { id: 15, name: "Birth Certificate", code: "MOTHER_BIRTH_CERT" },
    { id: 16, name: "Driving Licence", code: "MOTHER_DRIVING_LIC" },
    { id: 17, name: "TIN", code: "MOTHER_TIN" },
    { id: 18, name: "Voters ID", code: "MOTHER_VOTERS_ID" },
  ],
};

/** GET /v1/lookup/person-document-types — document types grouped by person. */
export function getPersonDocumentTypes(): Promise<PersonDocumentTypes> {
  if (BYPASS) return Promise.resolve(MOCK_PERSON_DOCUMENT_TYPES);
  const mapGroup = (rows: unknown): LookupItem[] =>
    (Array.isArray(rows) ? (rows as Row[]) : []).map((o) => ({
      id: num(o.documentTypeId),
      name: str(o.documentName),
      code: str(o.code),
    }));
  return apiGet("/v1/lookup/person-document-types")
    .then((raw) => {
      const d = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
      return {
        applicant: mapGroup(d.applicant),
        father: mapGroup(d.father),
        mother: mapGroup(d.mother),
      };
    })
    .catch(() => MOCK_PERSON_DOCUMENT_TYPES);
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
