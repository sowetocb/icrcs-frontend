import { apiGet, apiPost, apiPut } from "./client";
import { withFreshAuth } from "./auth";
import { loadSession } from "@/lib/auth/session";
import {
  getCountries,
  getMaritalStatuses,
  resolveGenderId,
  resolveEmploymentStatusId,
} from "./lookup";
import {
  uploadAttachment,
  PASSPORT_PHOTO_TYPE,
  type UploadedAttachment,
} from "./files";
import { COUNTRIES } from "@/lib/countries";
import { alpha2ToAlpha3 } from "@/lib/iso3";

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
    middleName: str(data, "applicantMiddle"),
    lastName: str(data, "applicantLast"),
    gender: await resolveGenderId(str(data, "gender")),
    dateOfBirth: str(data, "dob"),
    maritalStatus: await resolveMaritalStatusId(marriage),
    nationalityCode: await resolveCountryCode(str(data, "nationalityCountry")),
    citizenshipTypeId: intOrNull(data, "citizenshipTypeId"),
    countryOfBirthCode: await resolveCountryCode(country || "Tanzania"),
    birthCertificateNo: numOrStr(data, "birthCertNo"),
    nidaNo: numOrStr(data, "nidaNumber"),
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
 * Non-fatal: a failure here doesn't undo the already-created registration. */
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

async function buildStage2Payload(data: Data): Promise<Record<string, unknown>> {
  const sameAsCurrent = data.sameAsPerm === true;

  // Foreign address: the /stage2/foreign endpoint takes just ISO country codes +
  // a free-text city (no house number / postal code). When the current address
  // mirrors the permanent one, only the current side is sent.
  if (!isTanzania(str(data, "permCountry"))) {
    const payload: Record<string, unknown> = {
      currentCountryCode: await resolveCountryCode(
        str(data, "curCountry") || str(data, "permCountry"),
      ),
      currentCity: str(data, "curCity") || str(data, "permCity") || null,
      permanentSameAsCurrent: sameAsCurrent,
    };
    if (!sameAsCurrent) {
      payload.permanentCountryCode = await resolveCountryCode(str(data, "permCountry"));
      payload.permanentCity = str(data, "permCity") || null;
    }
    return payload;
  }

  const payload: Record<string, unknown> = {
    currentWardId: wardId(data, "curWardId"),
    // Street / Mtaa id from the cascade (guide: `currentStreetId`).
    currentStreetId: wardId(data, "curStreetId"),
    currentHouseNumber: str(data, "curHouseNumber") || str(data, "curStreet") || null,
    currentPostalCode: str(data, "curPostalCode") || str(data, "curPostal") || null,
    permanentSameAsCurrent: sameAsCurrent,
  };
  if (!sameAsCurrent) {
    payload.permanentWardId = wardId(data, "permWardId");
    payload.permanentStreetId = wardId(data, "permStreetId");
    payload.permanentHouseNumber = str(data, "permHouseNumber") || str(data, "permStreet") || null;
    payload.permanentPostalCode = str(data, "permPostalCode") || str(data, "permPostal") || null;
  }
  return payload;
}

/** Stage 2 is split by the permanent address country: in Tanzania → /domestic,
 * abroad → /foreign. There is no bare /stage2 endpoint. */
const stage2Suffix = (data: Data) =>
  isTanzania(str(data, "permCountry")) ? "/domestic" : "/foreign";

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

// Parent object — exact Stage 3 shape (residence only; no gender/DOB/place of
// birth — the backend derives parent gender and doesn't store those here).
async function buildParentPayload(data: Data, prefix: string): Promise<Record<string, unknown>> {
  const resTanzania = isTanzania(str(data, `${prefix}ResCountry`));
  return {
    firstName: str(data, `${prefix}First`),
    middleName: str(data, `${prefix}Middle`),
    lastName: str(data, `${prefix}Last`),
    phoneNumber: phone(data, `${prefix}Phone`),
    // API expects the ISO country CODE (e.g. "TZA"), not the lookup id.
    nationalityCode: await resolveCountryCode(str(data, `${prefix}NatCountry`)),
    residenceCountryCode: await resolveCountryCode(str(data, `${prefix}ResCountry`)),
    // Domestic residence pins the location via the street id; a foreign one via
    // the free-text city — only the relevant key is sent.
    ...(resTanzania
      ? { residenceStreetId: wardId(data, `${prefix}ResStreetId`) }
      : { residenceCity: str(data, `${prefix}ResCity`) || null }),
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

function idDocuments(data: Data): Record<string, unknown>[] {
  const nida = str(data, "nidaNumber");
  if (!nida) return [];
  return [
    { documentTypeId: 1, documentNumber: nida, issuingAuthority: "NIDA Tanzania" },
  ];
}

async function buildStage4Payload(data: Data, isSelf: boolean): Promise<Record<string, unknown>> {
  const never = data.neverAttendedSchool === true;
  const job = str(data, "jobStatus");

  // Build education list from the dynamic school repeater (edu1…eduN).
  const educationList: Record<string, unknown>[] = [];
  if (!never) {
    const count = Math.max(1, Number(str(data, "eduCount")) || 1);
    for (let i = 1; i <= count; i++) {
      const p = `edu${i}`;
      if (!str(data, `${p}School`)) continue;
      educationList.push({
        educationLevelId: intOrNull(data, `${p}Level`) ?? 1,
        // Schools are captured as Tanzanian; the backend expects the ISO code.
        countryCode: "TZA",
        city: str(data, `${p}District`) || null,
        schoolName: str(data, `${p}School`),
        registrationNumber: str(data, `${p}IndexNo`) || null,
        isCompleted: true,
        completionYear: intOrNull(data, `${p}Year`),
      });
    }
  }

  return {
    educationList,
    employmentStatus: await resolveEmploymentStatusId(job),
    // Occupation & employer apply only to the employed (hidden in the UI for
    // every other status), so null them out otherwise.
    organizationName: job === "Employed" ? str(data, "employer") || null : null,
    occupationTypeId: job === "Employed" ? intOrNull(data, "occupation") ?? null : null,
    // Child (under 18) is the "no documents" variant — omit the key entirely.
    ...(isSelf ? { documents: idDocuments(data) } : {}),
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
  return {
    firstName: str(data, `${prefix}First`),
    middleName: str(data, `${prefix}Middle`),
    lastName: str(data, `${prefix}Last`),
    gender: await resolveGenderId(str(data, `${prefix}Gender`)),
    phoneNumber: phone(data, `${prefix}Phone`),
    // The backend expects the ISO country CODE (e.g. "KEN"), not the lookup id.
    nationalityCode: await resolveCountryCode(str(data, `${prefix}NatCountry`)),
    residenceCountryCode: await resolveCountryCode(str(data, `${prefix}ResCountry`)),
    // Domestic persons pin their location with the street id; foreign persons
    // with the free-text city — only the relevant key is sent.
    ...(resTanzania
      ? { residenceStreetId: wardId(data, `${prefix}ResStreetId`) }
      : { residenceCity: str(data, `${prefix}ResCity`) || null }),
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

  // Children — only when "I have children" is ticked. Same person shape as
  // spouses (the UI reuses the spouse block).
  const hasChildren = data.hasChildren === true;
  const children: unknown[] = [];
  if (hasChildren) {
    const childCount = Math.max(1, Number(str(data, "childCount")) || 1);
    for (let i = 1; i <= childCount; i++) {
      const p = `ch${i}`;
      if (!str(data, `${p}First`)) continue;
      children.push({
        childSubjectId: null,
        occupationTypeId: intOrNull(data, `${p}OccType`),
        person: await buildPersonPayload(data, p),
      });
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
      headers: at ? { authorization: `Bearer ${at}` } : {},
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

export async function submitStage9(subjectId: string): Promise<unknown> {
  if (BYPASS) {
    await delay(300);
    return { mock: true };
  }
  return withFreshAuth((at) =>
    apiPost(`/v1/registration/${subjectId}/stage9?confirmed=true`, {}, at),
  );
}
