import { apiGet, apiPost, apiPut } from "./client";
import { withFreshAuth } from "./auth";
import { loadSession } from "@/lib/auth/session";
import {
  getCountries,
  getMaritalStatuses,
  resolveGenderId,
  resolveEmploymentStatusId,
  getPersonDocumentTypes,
} from "./lookup";
import {
  uploadAttachment,
  PASSPORT_PHOTO_TYPE,
  type UploadedAttachment,
} from "./files";
import { COUNTRIES } from "@/lib/countries";
import { alpha2ToAlpha3 } from "@/lib/iso3";
import { RULES } from "@/lib/validation/rules";

/** Decode a base64 data URL into a Blob (for multipart upload). */
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), ext: mime === "image/png" ? "png" : "jpg" };
}

// Auth bypass also short-circuits registry submissions (UI works without a backend).
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Data = Record<string, string | boolean>;

/** A country value counts as Tanzania (the domestic flow) when it's empty or
 * explicitly "Tanzania"; anything else routes the stage to its `/foreign`
 * variant. */
const isTanzania = (country: string) => !country || country === "Tanzania";

const str = (data: Data, key: string) =>
  typeof data[key] === "string" ? (data[key] as string).trim() : "";

const intOrNull = (data: Data, key: string): number | null => {
  const n = Number(str(data, key));
  return Number.isFinite(n) && str(data, key) !== "" ? n : null;
};

// Reduce a stored phone ("+255 795 032 876") to E.164 ("+255795032876") by
// keeping only digits and the leading "+". NOTE: the class is [^\d+] — a single
// backslash; [^\\d+] would strip every digit and leave just "+".
const phone = (data: Data, key: string) => str(data, key).replace(/[^\d+]/g, "");

const wardId = (data: Data, key: string): number | null => {
  const n = Number(str(data, key));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Identifier fields (birth-cert / NIDA) the backend wants as a JSON number when
// numeric. Sent as a number only when it's all digits AND fits JS's safe-integer
// range; otherwise kept as a string so no digits are lost (alphanumeric values,
// or a 20-digit NIDA that exceeds 2^53) — and null when empty.
const numOrStr = (data: Data, key: string): number | string | null => {
  const v = str(data, key);
  if (!v) return null;
  if (/^\d+$/.test(v) && Number.isSafeInteger(Number(v))) return Number(v);
  return v;
};

/** Resolve a country name to its ISO alpha-3 code (e.g. "TZA"). Prefers the
 * backend lookup, but falls back to a local name → alpha-2 → alpha-3 mapping
 * because /v1/lookup/countries can return an empty list. */
async function resolveCountryCode(name: string): Promise<string | null> {
  if (!name) return null;
  try {
    const countries = await getCountries();
    const match = countries.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (match?.code) return match.code;
  } catch {
    // fall through to the local mapping
  }
  const local = COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return local ? alpha2ToAlpha3(local.code) : null;
}

/** Resolve a stored marital-status value (the form keeps the enum code, e.g.
 * "SINGLE", "WIDOW") to the marital-status lookup ID the backend expects.
 * Matches on code, name, or an already-stored id. Returns null when nothing
 * matches. */
async function resolveMaritalStatusId(value: string): Promise<number | null> {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  try {
    const statuses = await getMaritalStatuses();
    const match = statuses.find(
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

/** Non-citizen self-service lookup: verify a traveller by their travel
 * document before any registration. Returns the matched record, or null when
 * nothing is found (the caller then directs them to an immigration office).
 *
 * NOTE: the backend endpoint for this is not yet finalized — wire the real
 * path/field mapping here once available. Until then a missing/erroring
 * endpoint resolves to null so the UI shows the "visit the nearest immigration
 * office" guidance. */
export type ForeignerDetails = {
  fullName?: string;
  nationality?: string;
  documentNumber?: string;
  /** The traveller's current immigration status (e.g. "Resident Permit — Class A"). */
  immigrationStatus?: string;
  permitType?: string;
  permitNumber?: string;
  issueDate?: string;
  expiryDate?: string;
};

export async function fetchForeignerDetails(input: {
  nationality: string;
  documentTypeId: string;
  documentNumber: string;
}): Promise<ForeignerDetails | null> {
  if (BYPASS) {
    await delay(500);
    // Mock: a document number containing "notfound" returns no record (so the
    // not-found path stays testable); anything else returns a verified permit.
    if (input.documentNumber.trim().toLowerCase().includes("notfound")) return null;
    return {
      fullName: "Foreign Applicant",
      nationality: input.nationality,
      documentNumber: input.documentNumber,
      immigrationStatus: "Resident Permit — Class A",
      permitType: "Residence Permit",
      permitNumber: "RP-2026-004821",
      issueDate: "2024-03-01",
      expiryDate: "2027-02-28",
    };
  }
  try {
    const params = new URLSearchParams({
      documentTypeId: input.documentTypeId,
      documentNumber: input.documentNumber,
    });
    const raw = await apiGet(`/v1/registration/travel-document?${params.toString()}`);
    const record = (raw as { data?: ForeignerDetails | null })?.data ?? null;
    return record && Object.keys(record).length > 0 ? record : null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 1 — Personal Information
// ──────────────────────────────────────────────────────────────────────────────

type Stage1Response = {
  subjectId: string;
  applicationId?: string;
  /** Whether the passport photo uploaded successfully. When false, the user can
   * retry the upload at Stage 8 (which the backend gates on the photo). */
  photoUploaded: boolean;
  /** The uploaded photo's file metadata, so Stage 8 can include it in its
   * attachments (the backend requires the passport photo there). */
  photoAttachment?: UploadedAttachment;
};

/** Upload the passport-size photo against an existing registration. Decoupled
 * from Stage 1 so it can be retried (e.g. after a network failure) at Stage 8.
 * Returns the uploaded file metadata (so Stage 8 can register the photo in its
 * attachments — the backend requires it there), or null on any failure.
 *
 * Uses the shared `uploadAttachment` path (form fields, no query params) — the
 * same endpoint that works for every other attachment. */
export async function uploadPassportPhoto(
  subjectId: string,
  photoDataUrl: string,
): Promise<UploadedAttachment | null> {
  // Only a freshly-captured data: URL is uploaded here. An already-uploaded
  // photo (a re-hydrated http file URL) is NOT re-fetched — that would be a
  // cross-origin request the browser blocks; it's registered directly from its
  // existing URL by the caller instead.
  const photo = dataUrlToBlob(photoDataUrl);
  if (!photo || !subjectId) return null;
  const file = new File([photo.blob], `photo.${photo.ext}`, {
    type: photo.blob.type || "image/jpeg",
  });
  try {
    return await uploadAttachment(subjectId, PASSPORT_PHOTO_TYPE, file);
  } catch {
    return null;
  }
}

function extractStage1Response(raw: unknown): Stage1Response {
  const rawData =
    typeof raw === "object" && raw !== null && "data" in raw
      ? (raw as { data?: unknown }).data
      : raw;

  const payload =
    typeof rawData === "object" && rawData !== null
      ? (rawData as Record<string, unknown>)
      : {};

  const subjectId =
    typeof rawData === "string"
      ? rawData
      : String(
        payload.subjectId ??
        payload.registrationId ??
        payload.id ??
        payload.personId ??
        "",
      );

  const applicationId = String(
    payload.applicationId ??
    payload.applicationNumber ??
    payload.registrationNumber ??
    "",
  );

  return {
    subjectId,
    applicationId: applicationId || undefined,
    photoUploaded: false,
  };
}

async function buildStage1Payload(
  data: Data,
  isSelf: boolean,
): Promise<Record<string, unknown>> {
  const marriage = str(data, "marriage");
  const country = str(data, "pobCountry");
  const bornInTanzania = isTanzania(country);

  // Base fields shared by both domestic and foreign payloads. Names are always
  // sent (for self they are prefilled from the profile) to match the backend
  // payload contract.
  const base: Record<string, unknown> = {
    firstName: str(data, "applicantFirst"),
    middleName: str(data, "applicantMiddle") || null, // optional
    lastName: str(data, "applicantLast"),
    gender: await resolveGenderId(str(data, "gender")),
    dateOfBirth: str(data, "dob"),
    maritalStatus: await resolveMaritalStatusId(marriage),
    nationalityCode: await resolveCountryCode(str(data, "nationalityCountry")),
    citizenshipTypeId: intOrNull(data, "citizenshipTypeId"),
    countryOfBirthCode: await resolveCountryCode(country || "Tanzania"),
    birthCertificateNo: numOrStr(data, "birthCertNo"),
    // The dedicated NIDA field carries the NIDA document's number (if any); the
    // full identification list (all picked types) is sent via `documents`.
    nidaNo: await nidaNumberFromDocs(data),
    documents: idDocuments(data),
    // Physical characteristics — shared by citizen and migrant Stage 1 (v002).
    ...physicalCharacteristics(data),
  };

  if (bornInTanzania) {
    // Domestic: pin the birth location via the street cascade (no city field).
    base.placeOfBirthStreetId = wardId(data, "pobStreetId");
  } else {
    // Foreign: free-text city of birth (no street / ward).
    base.cityOfBirth = str(data, "pobCityVillage") || null;
  }

  return base;
}

/** Stage 1.5 — Naturalization details. The guide exposes this as a separate
 * conditional endpoint (POST /registration/{subjectId}/naturalization), not as
 * Stage 1 fields. Sent only when the applicant supplied a certificate number.
 * Non-fatal: a failure here doesn't undo the already-created registration.
 *
 * ⚠️ DORMANT (intentionally inactive): no UI collects `naturalizationCertNo` /
 * `naturalizationPlace` / `naturalizationDate` — there is no citizenship-type
 * picker on Stage 1 (citizenshipTypeId is hardcoded to 1/2), so this always
 * no-ops. The plumbing is kept ready for a future naturalized-citizen path.
 * TODO(naturalization): add a Stage-1 citizenship-type select (Birth / Descent /
 * Naturalization from the lookup) that, when Naturalization is chosen, reveals +
 * requires those three fields (caps: RULES.NATURALIZATION_CERT_NUMBER_MAX /
 * _ISSUE_PLACE_MAX; issueDate past-or-present). Then this fires with real data. */
async function submitNaturalization(subjectId: string, data: Data): Promise<void> {
  const certificateNumber = str(data, "naturalizationCertNo");
  if (!subjectId || !certificateNumber) return;
  const payload = {
    certificateNumber,
    issuePlace: str(data, "naturalizationPlace") || null,
    issueDate: str(data, "naturalizationDate") || null,
  };
  try {
    await withFreshAuth((at) =>
      apiPost(`/v1/registration/${subjectId}/naturalization`, payload, at),
    );
  } catch {
    // Non-fatal — surfaced via the registration's status, not by failing Stage 1.
  }
}

export async function submitStage1(
  data: Data,
  isSelf: boolean,
  photoDataUrl?: string,
): Promise<Stage1Response> {
  const payload = await buildStage1Payload(data, isSelf);
  if (BYPASS) {
    await delay(300);
    return {
      subjectId: "mock-subject-id",
      applicationId: "MOCK-CREG000000000000",
      photoUploaded: true,
    };
  }

  // Stage 1 (raw JSON) is submitted first to create the registration and obtain
  // the subjectId. The passport photo is then uploaded against that subjectId —
  // the /files/upload endpoint requires subjectId, so it can't precede Stage 1.
  // Stage 1 is split by place of birth: born in Tanzania → /domestic, born
  // abroad → /foreign. There is no bare /stage1 endpoint.
  const path = isTanzania(str(data, "pobCountry"))
    ? "/v1/registration/stage1/domestic"
    : "/v1/registration/stage1/foreign";
  const response = extractStage1Response(
    await withFreshAuth((at) => apiPost(path, payload, at)),
  );

  // Stage 1.5 — conditional naturalization details against the new subjectId.
  if (response.subjectId) await submitNaturalization(response.subjectId, data);

  // Decoupled photo upload: a failure here is NON-FATAL — the registration is
  // already created (re-submitting Stage 1 would duplicate it). The uploaded
  // file metadata is returned so the wizard can carry it into the Stage 8
  // attachments; on failure the wizard retries at the Stage 8 gate.
  const photo =
    photoDataUrl && response.subjectId
      ? await uploadPassportPhoto(response.subjectId, photoDataUrl)
      : null;
  response.photoUploaded = !!photo;
  response.photoAttachment = photo ?? undefined;

  return response;
}

export async function editStage1(
  subjectId: string,
  data: Data,
  isSelf: boolean,
): Promise<unknown> {
  const payload = await buildStage1Payload(data, isSelf);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const suffix = isTanzania(str(data, "pobCountry")) ? "/domestic" : "/foreign";
  const result = await withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage1${suffix}`, payload, at),
  );
  await submitNaturalization(subjectId, data);
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 2 — Address
// ──────────────────────────────────────────────────────────────────────────────

/** The current address country (the form copies the permanent one into it when
 * "same as permanent" is ticked). It drives the Stage 2 endpoint + which current
 * fields are sent. */
const stage2CurrentCountry = (data: Data) =>
  str(data, "curCountry") || str(data, "permCountry");

async function buildStage2Payload(data: Data): Promise<Record<string, unknown>> {
  const sameAsCurrent = data.sameAsPerm === true;
  const currentIsTz = isTanzania(stage2CurrentCountry(data));
  const permIsTz = isTanzania(str(data, "permCountry"));

  const payload: Record<string, unknown> = {};

  // Optional house number (≤20) / postal address (≤50) — domestic flow only.
  const cap = (v: string, max: number) => (v ? v.slice(0, max) : null);

  // ── Current address — Tanzania pins the location via the street id (+ optional
  // house number / postal address); abroad sends an ISO country code + city. ──
  if (currentIsTz) {
    payload.currentStreetId = wardId(data, "curStreetId");
    payload.currentHouseNo = cap(str(data, "curHouseNumber"), RULES.HOUSE_NO_MAX);
    payload.currentPostalAddress = cap(str(data, "curPostalCode"), RULES.POSTAL_ADDRESS_MAX);
  } else {
    payload.currentCountryCode = await resolveCountryCode(stage2CurrentCountry(data));
    payload.currentCity = str(data, "curCity") || null;
  }

  payload.permanentSameAsCurrent = sameAsCurrent;

  // ── Permanent address — only when it differs from the current one. Its own
  // country decides whether it's a TZ street id (+ house/postal) or country+city. ──
  if (!sameAsCurrent) {
    if (permIsTz) {
      payload.permanentStreetId = wardId(data, "permStreetId");
      payload.permanentHouseNo = cap(str(data, "permHouseNumber"), RULES.HOUSE_NO_MAX);
      payload.permanentPostalAddress = cap(str(data, "permPostalCode"), RULES.POSTAL_ADDRESS_MAX);
    } else {
      payload.permanentCountryCode = await resolveCountryCode(str(data, "permCountry"));
      payload.permanentCity = str(data, "permCity") || null;
    }
  }

  // ── Migrant-only: refugee/settlement camp + dwelling description. Only the
  // migrant track renders these fields, so for a citizen they are absent and
  // nothing is sent. ──
  const campName = cap(str(data, "campName"), RULES.CAMP_NAME_MAX);
  const properties = cap(str(data, "properties"), RULES.PROPERTIES_MAX);
  if (campName) payload.campName = campName;
  if (properties) payload.properties = properties;

  return payload;
}

/** Stage 2 is split by the CURRENT address country: in Tanzania → /domestic,
 * abroad → /foreign. There is no bare /stage2 endpoint. */
const stage2Suffix = (data: Data) =>
  isTanzania(stage2CurrentCountry(data)) ? "/domestic" : "/foreign";

// ──────────────────────────────────────────────────────────────────────────────
// Migrant registration (ICRCS API v002)
//
// Migrants / refugees / asylum-seekers share stages 2–9 with citizens (same
// endpoints, keyed by the returned subjectId). Only two calls are specific to
// this track: Stage 1 (POST /stage1/migrant, carries `registrationType` + the
// physical-characteristics fields) and an optional Travel-History call. Field
// REQUIREDNESS comes from the backend ENUM file and is enforced in the Zod
// schemas, not here — this layer only maps the flat form data to the payloads
// whose shapes are fixed by the v002 collection.
// ──────────────────────────────────────────────────────────────────────────────

/** `registrationType` sent to /stage1/migrant — the migrant-flow members of the
 * backend registration-type enum. The citizen flow uses the enum's DOMESTIC /
 * FOREIGN values instead and keeps /stage1/domestic and /stage1/foreign, so they
 * are deliberately NOT part of this union (submitStage1Migrant must only ever be
 * called with a migrant type). */
export type RegistrationType =
  | "ASYLUM_SEEKER"
  | "REFUGEE"
  | "ALIEN"
  | "UNDOCUMENTED_MIGRANT"
  | "VOLUNTARY_RETURNEE";

/** Physical-characteristics + otherNames block, shared by the v002 person model
 * (present on migrant Stage 1; also added to citizen Stage 1 in v002). Empty
 * strings collapse to null so optional fields aren't sent as "". */
function physicalCharacteristics(data: Data): Record<string, unknown> {
  return {
    otherNames: str(data, "otherNames") || null,
    tribe: str(data, "tribe") || null,
    eyeColor: str(data, "eyeColor") || null,
    hairColor: str(data, "hairColor") || null,
    heightCm: intOrNull(data, "heightCm"),
    specialMark: str(data, "specialMark") || null,
    languageSpoken: str(data, "languageSpoken") || null,
  };
}

/** Migrant Stage 1 payload — the shared base (names, sex, DOB, nationality,
 * citizenship, place of birth, documents) plus `registrationType` and the
 * physical-characteristics block. Migrants are foreign-born, so the base's
 * foreign branch (countryOfBirthCode + cityOfBirth) applies. */
async function buildMigrantStage1Payload(
  data: Data,
  registrationType: RegistrationType,
): Promise<Record<string, unknown>> {
  const base = await buildStage1Payload(data, true);
  // buildStage1Payload already includes the physical-characteristics block.
  return { ...base, registrationType };
}

export async function submitStage1Migrant(
  data: Data,
  registrationType: RegistrationType,
  photoDataUrl?: string,
): Promise<Stage1Response> {
  const payload = await buildMigrantStage1Payload(data, registrationType);
  if (BYPASS) {
    await delay(300);
    return { subjectId: "mock-migrant-id", applicationId: "MOCK-ALN000000000000", photoUploaded: true };
  }
  const response = extractStage1Response(
    await withFreshAuth((at) => apiPost("/v1/registration/stage1/migrant", payload, at)),
  );
  // Passport photo upload mirrors the citizen flow: non-fatal, keyed by subjectId.
  const photo =
    photoDataUrl && response.subjectId
      ? await uploadPassportPhoto(response.subjectId, photoDataUrl)
      : null;
  response.photoUploaded = !!photo;
  response.photoAttachment = photo ?? undefined;
  return response;
}

export async function editStage1Migrant(
  subjectId: string,
  data: Data,
  registrationType: RegistrationType,
): Promise<unknown> {
  const payload = await buildMigrantStage1Payload(data, registrationType);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage1/migrant`, payload, at),
  );
}

/** Travel history — one endpoint for both cases (`hasDocument` toggles the
 * document block). The two country fields are stored as country NAMES by the
 * form's CountrySelect and resolved to ISO alpha-3 codes for the API. */
export type TravelHistory = {
  hasDocument: boolean;
  firstDateOfEntry?: string | null;
  pointOfEntry?: string | null;
  transitCountry?: string | null;
  documentType?: string | null;
  documentNo?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  issueCountryCode?: string | null;
  issueAuthority?: string | null;
};

async function buildTravelHistoryPayload(data: Data): Promise<Record<string, unknown>> {
  const hasDocument = data.hasTravelDoc === true;
  const base: Record<string, unknown> = {
    hasDocument,
    firstDateOfEntry: str(data, "firstDateOfEntry") || null,
    pointOfEntry: str(data, "pointOfEntry") || null, // free text (e.g. "Namanga Border")
    transitCountry: (await resolveCountryCode(str(data, "transitCountry"))) || null,
  };
  if (hasDocument) {
    Object.assign(base, {
      documentType: str(data, "travelDocType") || null, // free text (e.g. "PASSPORT")
      documentNo: str(data, "travelDocNo") || null,
      issuedDate: str(data, "travelIssuedDate") || null,
      expiryDate: str(data, "travelExpiryDate") || null,
      issueCountryCode: (await resolveCountryCode(str(data, "travelIssueCountry"))) || null,
      issueAuthority: str(data, "travelIssueAuthority") || null,
    });
  }
  return base;
}

export async function submitTravelHistory(subjectId: string, data: Data): Promise<unknown> {
  const payload = await buildTravelHistoryPayload(data);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/travel-history`, payload, at),
  );
}

export async function editTravelHistory(subjectId: string, data: Data): Promise<unknown> {
  const payload = await buildTravelHistoryPayload(data);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/travel-history`, payload, at),
  );
}

export async function getTravelHistory(subjectId: string): Promise<TravelHistory | null> {
  if (BYPASS) {
    await delay(200);
    return null;
  }
  try {
    const raw = await withFreshAuth((at) =>
      apiGet(`/v1/registration/${subjectId}/travel-history`, at),
    );
    const d =
      typeof raw === "object" && raw !== null && "data" in raw
        ? (raw as { data?: unknown }).data
        : raw;
    return (d && typeof d === "object" ? (d as TravelHistory) : null);
  } catch {
    return null;
  }
}

export async function submitStage2(subjectId: string, data: Data): Promise<unknown> {
  const payload = await buildStage2Payload(data);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage2${stage2Suffix(data)}`, payload, at),
  );
}

export async function editStage2(subjectId: string, data: Data): Promise<unknown> {
  const payload = await buildStage2Payload(data);
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage2${stage2Suffix(data)}`, payload, at),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 3 — Parents (father + mother with expanded person details)
// ──────────────────────────────────────────────────────────────────────────────

// Parent object — exact Stage 3 shape. The identification documents repeater
// ({prefix}IdDoc1Type/Number, …) is converted to the backend's `documents`
// array using the same mapping as the applicant's Stage 4 documents.
async function buildParentPayload(data: Data, prefix: string): Promise<Record<string, unknown>> {
  const resTanzania = isTanzania(str(data, `${prefix}ResCountry`));
  return {
    firstName: str(data, `${prefix}First`),
    middleName: str(data, `${prefix}Middle`) || null, // optional
    lastName: str(data, `${prefix}Last`),
    dateOfBirth: str(data, `${prefix}Dob`) || null,
    phoneNumber: phone(data, `${prefix}Phone`),
    // API expects the ISO country CODE (e.g. "TZA"), not the lookup id.
    nationalityCode: await resolveCountryCode(str(data, `${prefix}NatCountry`)),
    residenceCountryCode: await resolveCountryCode(str(data, `${prefix}ResCountry`)),
    // Domestic residence pins the location via the street id; a foreign one via
    // the free-text city — only the relevant key is sent.
    ...(resTanzania
      ? { residenceStreetId: wardId(data, `${prefix}ResStreetId`) }
      : { residenceCity: str(data, `${prefix}ResCity`) || null }),
    // Identification documents from the per-parent repeater.
    documents: idDocuments(data, prefix),
    documentFileUrl: str(data, `${prefix}DocFileUrl`) || null,
    birthDetailId: null,
  };
}

async function buildStage3Payload(data: Data): Promise<Record<string, unknown>> {
  return {
    father: await buildParentPayload(data, "father"),
    mother: await buildParentPayload(data, "mother"),
  };
}

/** Stages 3/5/6 route to /foreign when any of the listed people reside outside
 * Tanzania (their residence carries a country code + city instead of a TZ
 * street id), else /domestic. There is no bare endpoint for these stages. */
const peopleSuffix = (data: Data, prefixes: string[]) =>
  prefixes.some((p) => !isTanzania(str(data, `${p}ResCountry`))) ? "/foreign" : "/domestic";

const stage3Suffix = (data: Data) => peopleSuffix(data, ["father", "mother"]);

export async function submitStage3(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage3Payload(data);
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage3${stage3Suffix(data)}`, payload, at),
  );
}

export async function editStage3(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage3Payload(data);
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage3${stage3Suffix(data)}`, payload, at),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 4 — Education & Employment
// ──────────────────────────────────────────────────────────────────────────────

/** Pull the NIDA document's number from the applicant's identification-documents
 * repeater for the dedicated `nidaNo` field. The repeater stores each document's
 * documentTypeId as its type value, so the NIDA id is resolved from the lookup. */
async function nidaNumberFromDocs(data: Data): Promise<string | null> {
  let nidaId: number | undefined;
  try {
    const types = await getPersonDocumentTypes();
    nidaId = types.applicant.find((d) => (d.code ?? "").toUpperCase() === "NIDA")?.id;
  } catch {
    nidaId = undefined;
  }
  if (!nidaId) return null;
  const count = Math.max(1, Number(str(data, "idDocCount")) || 1);
  for (let i = 1; i <= count; i++) {
    if (Number(str(data, `idDoc${i}Type`)) === nidaId) return str(data, `idDoc${i}Number`) || null;
  }
  return null;
}

/** Build the identification `documents` array from the repeater. The form stores
 * each document's documentTypeId (picked from the lookup) as its type value, so
 * it is sent straight through — no hardcoded type→id mapping.
 * @param prefix — empty string for the applicant (idDoc1Type), or a parent
 *   prefix like "father" / "mother" (fatherIdDoc1Type). */
function idDocuments(data: Data, prefix = ""): Record<string, unknown>[] {
  const countKey = prefix ? `${prefix}IdDocCount` : "idDocCount";
  const fieldPrefix = prefix ? `${prefix}IdDoc` : "idDoc";
  const count = Math.max(1, Number(str(data, countKey)) || 1);
  const docs: Record<string, unknown>[] = [];
  for (let i = 1; i <= count; i++) {
    const documentTypeId = Number(str(data, `${fieldPrefix}${i}Type`));
    const number = str(data, `${fieldPrefix}${i}Number`);
    if (!documentTypeId || !number) continue;
    docs.push({ documentTypeId, documentNumber: number, issuingAuthority: null });
  }
  return docs;
}

async function buildStage4Payload(data: Data, _isSelf: boolean): Promise<Record<string, unknown>> {
  const never = data.neverAttendedSchool === true;
  // jobStatus is the lookup CODE (e.g. "Employed", "Self-Employed"); compare
  // case-insensitively so casing differences don't drop occupation fields.
  const job = str(data, "jobStatus");
  // Normalize (drop spaces/hyphens) — the stored value is the backend status
  // name (e.g. "Self Employed"), not a fixed "self-employed" literal.
  const jobLower = job.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Build education list from the dynamic school repeater (edu1…eduN).
  const educationList: Record<string, unknown>[] = [];
  if (!never) {
    const count = Math.max(1, Number(str(data, "eduCount")) || 1);
    for (let i = 1; i <= count; i++) {
      const p = `edu${i}`;
      if (!str(data, `${p}School`)) continue;
      // "Completed" drives the year: a completed level carries its completion
      // year; a level still in progress sends null.
      // "Completed" is the default — an unset value counts as completed.
      const completed = data[`${p}Completed`] !== false;
      educationList.push({
        // No `?? 1` fallback: a missing level is a REQUIRED-field error (now
        // enforced per item in the wizard), not something to silently persist as
        // "level 1" — that wrote wrong data into the registry.
        educationLevelId: intOrNull(data, `${p}Level`),
        // Schools are captured as Tanzanian; the backend expects the ISO code.
        countryCode: "TZA",
        city: str(data, `${p}District`) || null,
        schoolName: str(data, `${p}School`),
        registrationNumber: str(data, `${p}IndexNo`) || null,
        isCompleted: completed,
        completionYear: completed ? intOrNull(data, `${p}Year`) : null,
      });
    }
  }

  return {
    hasAttendedSchool: !never,
    educationList,
    employmentStatus: await resolveEmploymentStatusId(job),
    // Occupation: Employed and Self-employed both pick from the occupation
    // lookup (sending its id). When "Other" (id 19) is chosen, the free-text
    // description rides along in otherOccupation.
    occupationTypeId:
      jobLower === "employed" || jobLower === "selfemployed"
        ? intOrNull(data, "occupation") ?? null
        : null,
    otherOccupation:
      (jobLower === "employed" || jobLower === "selfemployed") &&
      str(data, "occupation") === "19"
        ? str(data, "otherOccupation") || null
        : null,
    // Employer / organisation name applies only to the employed.
    organizationName:
      jobLower === "employed"
        ? str(data, "employer") || null
        : null,
  };
}

export async function submitStage4(
  subjectId: string,
  data: Data,
  isSelf: boolean,
): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage4Payload(data, isSelf);
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage4`, payload, at),
  );
}

export async function editStage4(
  subjectId: string,
  data: Data,
  isSelf: boolean,
): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage4Payload(data, isSelf);
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage4`, payload, at),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 5 — Emergency Contacts
// ──────────────────────────────────────────────────────────────────────────────

/** Shared "person" sub-object for emergency contacts, spouses and relatives —
 * exact Stage 5/6 shape (like the parent object, but with gender). */
async function buildPersonPayload(data: Data, prefix: string): Promise<Record<string, unknown>> {
  const resTanzania = isTanzania(str(data, `${prefix}ResCountry`));
  // Place of birth mirrors the applicant's convention: a Tanzanian birthplace
  // pins the street id; a foreign one carries the ISO country code + city.
  const pobTanzania = isTanzania(str(data, `${prefix}PobCountry`));
  return {
    firstName: str(data, `${prefix}First`),
    middleName: str(data, `${prefix}Middle`) || null, // optional
    lastName: str(data, `${prefix}Last`),
    gender: await resolveGenderId(str(data, `${prefix}Gender`)),
    dateOfBirth: str(data, `${prefix}Dob`) || null,
    phoneNumber: phone(data, `${prefix}Phone`),
    // The backend expects the ISO country CODE (e.g. "KEN"), not the lookup id.
    nationalityCode: await resolveCountryCode(str(data, `${prefix}NatCountry`)),
    residenceCountryCode: await resolveCountryCode(str(data, `${prefix}ResCountry`)),
    // Domestic persons pin their location with the street id; foreign persons
    // with the free-text city — only the relevant key is sent.
    ...(resTanzania
      ? { residenceStreetId: wardId(data, `${prefix}ResStreetId`) }
      : { residenceCity: str(data, `${prefix}ResCity`) || null }),
    // Place of birth — only the side matching the picked country is sent.
    ...(pobTanzania
      ? { placeOfBirthStreetId: wardId(data, `${prefix}PobStreetId`) }
      : {
          countryOfBirthCode: await resolveCountryCode(str(data, `${prefix}PobCountry`)),
          cityOfBirth: str(data, `${prefix}Village`) || null,
        }),
    documentFileUrl: str(data, `${prefix}DocFileUrl`) || null,
    birthDetailId: null,
  };
}

async function buildContactPayload(data: Data, prefix: string): Promise<Record<string, unknown>> {
  return {
    relationshipTypeId: intOrNull(data, `${prefix}RelType`),
    occupationTypeId: intOrNull(data, `${prefix}OccType`),
    person: await buildPersonPayload(data, prefix),
  };
}

async function buildStage5Payload(data: Data): Promise<Record<string, unknown>> {
  const contacts = [
    await buildContactPayload(data, "ec1"),
    await buildContactPayload(data, "ec2"),
  ].filter((c) => (c.person as Record<string, unknown>).firstName);
  return { contacts };
}

const stage5Suffix = (data: Data) => peopleSuffix(data, ["ec1", "ec2"]);

export async function submitStage5(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage5Payload(data);
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage5${stage5Suffix(data)}`, payload, at),
  );
}

export async function editStage5(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage5Payload(data);
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage5${stage5Suffix(data)}`, payload, at),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 6 — Family
// ──────────────────────────────────────────────────────────────────────────────

/** Stage 6 child — a dedicated flat shape (NOT a RelatedPersonRequest): name +
 * sexId + DOB + nationality + residence. The backend requires residenceCountryCode
 * in both cases; Tanzania children add residenceStreetId, foreign add residenceCity. */
async function buildChildPayload(data: Data, prefix: string): Promise<Record<string, unknown>> {
  const resTanzania = isTanzania(str(data, `${prefix}ResCountry`));
  return {
    firstName: str(data, `${prefix}First`),
    middleName: str(data, `${prefix}Middle`) || null,
    lastName: str(data, `${prefix}Last`),
    sexId: await resolveGenderId(str(data, `${prefix}Gender`)),
    dateOfBirth: str(data, `${prefix}Dob`) || null,
    nationalityCode: await resolveCountryCode(str(data, `${prefix}NatCountry`)),
    residenceCountryCode: await resolveCountryCode(str(data, `${prefix}ResCountry`)),
    ...(resTanzania
      ? { residenceStreetId: wardId(data, `${prefix}ResStreetId`) }
      : { residenceCity: str(data, `${prefix}ResCity`) || null }),
  };
}

async function buildStage6Payload(data: Data): Promise<Record<string, unknown>> {
  // The applicant can add any number of relatives (min 2 enforced in the UI).
  const count = Math.max(2, Number(str(data, "relativeCount")) || 2);
  const relatives = [];
  for (let i = 1; i <= count; i++) {
    if (str(data, `rel${i}First`)) {
      relatives.push(await buildContactPayload(data, `rel${i}`));
    }
  }

  // Spouses — only when married (min 1 enforced in the UI).
  const isMarried = data.isMarried === true;
  const spouses: unknown[] = [];
  if (isMarried) {
    const spouseCount = Math.max(1, Number(str(data, "spouseCount")) || 1);
    for (let i = 1; i <= spouseCount; i++) {
      const p = `sp${i}`;
      if (!str(data, `${p}First`)) continue;
      spouses.push({
        spouseSubjectId: null,
        occupationTypeId: intOrNull(data, `${p}OccType`),
        person: await buildPersonPayload(data, p),
      });
    }
  }

  // Children — only when "I have children" is ticked. Children use their own
  // dedicated shape (see buildChildPayload); the full list is always sent (the
  // backend replaces all children on each submit).
  const hasChildren = data.hasChildren === true;
  const children: unknown[] = [];
  if (hasChildren) {
    const childCount = Math.max(1, Number(str(data, "childCount")) || 1);
    for (let i = 1; i <= childCount; i++) {
      const p = `ch${i}`;
      if (!str(data, `${p}First`)) continue;
      children.push(await buildChildPayload(data, p));
    }
  }

  return {
    hasChildren,
    children,
    isMarried,
    spouses,
    relatives,
  };
}

/** Stage 6 foreign when any filled relative or spouse resides abroad. */
function stage6Suffix(data: Data): string {
  const prefixes: string[] = [];
  const relCount = Math.max(2, Number(str(data, "relativeCount")) || 2);
  for (let i = 1; i <= relCount; i++) {
    if (str(data, `rel${i}First`)) prefixes.push(`rel${i}`);
  }
  if (data.isMarried === true) {
    const spCount = Math.max(1, Number(str(data, "spouseCount")) || 1);
    for (let i = 1; i <= spCount; i++) {
      if (str(data, `sp${i}First`)) prefixes.push(`sp${i}`);
    }
  }
  if (data.hasChildren === true) {
    const chCount = Math.max(1, Number(str(data, "childCount")) || 1);
    for (let i = 1; i <= chCount; i++) {
      if (str(data, `ch${i}First`)) prefixes.push(`ch${i}`);
    }
  }
  return peopleSuffix(data, prefixes);
}

export async function submitStage6(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage6Payload(data);
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage6${stage6Suffix(data)}`, payload, at),
  );
}

export async function editStage6(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  const payload = await buildStage6Payload(data);
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage6${stage6Suffix(data)}`, payload, at),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 7 — Referees (GET only, print only)
// ──────────────────────────────────────────────────────────────────────────────

export async function submitStage7(subjectId: string): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiGet(`/v1/registration/${subjectId}/stage7`, at),
  );
}

/** Fetch the compiled, printable referees form (GET /stage7) through the
 * authenticated proxy and open it in a new tab for the applicant to download
 * and print. Returns false when it can't be opened. */
export async function openRefereesForm(subjectId: string): Promise<boolean> {
  if (BYPASS || !subjectId) return false;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const at = loadSession()?.accessToken;
  try {
    const res = await fetch(`${base}/v1/registration/${subjectId}/stage7`, {
      // The auth token is in an HttpOnly cookie — include it on this same-origin
      // proxy request and don't send the "__httponly__" stub as a Bearer header.
      credentials: "include",
      headers: at && at !== "__httponly__" ? { authorization: `Bearer ${at}` } : {},
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob.size) return false;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    // Revoke after the new tab has had time to load.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

/** Download the registration form as a server-rendered PDF via the backend
 * endpoint GET /v1/registration/{subjectId}/review/pdf (proxied). This replaces
 * the old client-side print/PDF mechanism (printRegistrationForm + the hidden
 * PrintableForm), so the downloaded document always matches what the backend
 * stored. Streams the PDF blob and triggers a browser download. Returns false
 * when the PDF can't be fetched (no subjectId, not submitted, backend error). */
/** Read a Blob into a base64 `data:` URL (used so downloads work over HTTP —
 * see downloadRegistrationReviewPdf). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function downloadRegistrationReviewPdf(
  subjectId: string,
  fileName = "Registration Form",
): Promise<boolean> {
  if (!subjectId) return false;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const at = loadSession()?.accessToken;
  try {
    const res = await fetch(`${base}/v1/registration/${subjectId}/review/pdf`, {
      // The auth token is in an HttpOnly cookie — include it on this same-origin
      // proxy request; never send the "__httponly__" stub as a Bearer header.
      credentials: "include",
      headers: {
        accept: "application/pdf",
        ...(at && at !== "__httponly__" ? { authorization: `Bearer ${at}` } : {}),
      },
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob.size) return false;
    // Download via a data: URL rather than a blob: URL. When the app is served
    // over plain HTTP, Chrome (desktop + Android) classifies a `blob:http://…`
    // download as an "insecure download" and blocks it ("File can't be
    // downloaded securely"). A `data:` URL is treated as part of the current
    // document — no network scheme to flag — so it isn't blocked. (Serving the
    // app over HTTPS is the proper end-state fix; this keeps downloads working
    // on the internal HTTP deployment.)
    const dataUrl = await blobToDataUrl(blob);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 8 — Uploads (finalise attachments)
// ──────────────────────────────────────────────────────────────────────────────

type StoredAttachment = {
  typeId: number;
  fileUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  fileHash?: string;
};

/** Parse the wizard's serialized attachments (see stepAttachments). */
function parseAttachments(raw: string | boolean | undefined): StoredAttachment[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAttachment[]) : [];
  } catch {
    return [];
  }
}

function buildStage8Payload(data: Data): Record<string, unknown> {
  const attachments = parseAttachments(data.attachments).map((a) => ({
    attachmentTypeId: a.typeId,
    fileUrl: a.fileUrl ?? "",
    mimeType: a.mimeType ?? "",
    fileSizeBytes: a.fileSizeBytes ?? 0,
    fileHash: a.fileHash ?? "",
  }));
  return { attachments };
}

export async function submitStage8(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage8`, buildStage8Payload(data), at),
  );
}

export async function editStage8(subjectId: string, data: Data): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPut(`/v1/registration/${subjectId}/stage8`, buildStage8Payload(data), at),
  );
}

/** GET /v1/registration/{subjectId}/stage{n} — the stored data for a single
 * stage, used to re-hydrate the form when the user navigates back to an
 * already-submitted stage (so their entries aren't lost). Returns the `data`
 * payload (or the raw response when there's no `data` wrapper), or null when
 * unavailable. Stages 7 (referees) and 9 (declaration) have no GET. */
export async function getStageData(subjectId: string, stage: number): Promise<unknown> {
  if (BYPASS || !subjectId || stage === 7 || stage === 9) return null;
  try {
    const raw = await withFreshAuth((at) =>
      apiGet<Record<string, unknown>>(`/v1/registration/${subjectId}/stage${stage}`, at),
    );
    return raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stage 9 — Preview & Declaration (final submit)
// ──────────────────────────────────────────────────────────────────────────────

/** GET /v1/registration/{subjectId}/review — the server-compiled summary of a
 * submitted registration (display-ready names + nested locations). Used to fill
 * the Preview & Declaration stage and the downloadable PDF. Returns the `data`
 * payload (or the raw response when there's no `data` wrapper). */
export async function getRegistrationReview(subjectId: string): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return null;
  }
  const raw = await withFreshAuth((at) =>
    apiGet<Record<string, unknown>>(`/v1/registration/${subjectId}/review`, at),
  );
  return raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
}

/** GET /v1/registration/{subjectId}/stage9/preview — the server-compiled summary
 * shown on the Preview & Declaration stage. Unlike /review (which only works
 * AFTER the declaration is submitted), this is available beforehand. Returns the
 * `data` payload (or the raw response when there's no `data` wrapper). */
export async function getStage9Preview(subjectId: string): Promise<unknown> {
  if (BYPASS || !subjectId) {
    await delay(300);
    return null;
  }
  const raw = await withFreshAuth((at) =>
    apiGet<Record<string, unknown>>(`/v1/registration/${subjectId}/stage9/preview`, at),
  );
  return raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
}

export async function submitStage9(subjectId: string): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage9?confirmed=true`, {}, at),
  );
}
