// Maps backend validation errors onto the wizard's form fields so each message
// is shown inline at exactly the field it originated from (not just a generic
// banner). The backend may return field errors in several shapes; we normalise
// them, then translate the API field names to the form field names.

import { ApiError } from "@/lib/api/client";

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Pull a flat `{ apiField: message }` map out of whatever error shape the API
 * returned: an object map (`{ field: "msg" }` / `{ field: ["msg"] }`), an array
 * of `{ field, message }`, or Spring-style violations (`propertyPath`/
 * `defaultMessage`). */
export function parseBackendFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data || typeof data !== "object") return out;
  const d = data as Record<string, unknown>;
  const sources = [d.errors, d.fieldErrors, d.violations, d.validationErrors, d.details, d.fields];
  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src)) {
      for (const item of src) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const field = str(o.field ?? o.propertyPath ?? o.path ?? o.name ?? o.param);
        const message = str(o.message ?? o.defaultMessage ?? o.error ?? o.reason);
        if (field && message) out[field] = message;
      }
    } else if (typeof src === "object") {
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        const message = Array.isArray(v) ? str(v[0]) : str(v);
        if (k && message) out[k] = message;
      }
    }
  }
  return out;
}

// Top-level (applicant / Stage 1-2) API field → form field name.
const TOP_LEVEL: Record<string, string> = {
  firstName: "applicantFirst",
  middleName: "applicantMiddle",
  lastName: "applicantLast",
  gender: "gender",
  sexId: "gender",
  maritalStatus: "marriage",
  maritalStatusId: "marriage",
  dateOfBirth: "dob",
  citizenshipTypeId: "citizenshipTypeId",
  nationalityCode: "nationalityCountry",
  countryOfBirthCode: "pobCountry",
  placeOfBirthStreetId: "pobStreetId",
  cityOfBirth: "pobCityVillage",
  villageOfBirth: "pobCityVillage",
  nidaNo: "nidaNumber",
  nidaNumber: "nidaNumber",
  birthCertificateNo: "birthCertNo",
  phoneNumber: "phone",
  email: "email",
  // Stage 2 — Address
  currentStreetId: "curStreetId",
  currentWardId: "curWardId",
  currentCountryCode: "curCountry",
  currentCity: "curCity",
  permanentStreetId: "permStreetId",
  permanentWardId: "permWardId",
  permanentCountryCode: "permCountry",
  permanentCity: "permCity",
};

// Leaf field (inside a parent / family-member object) → form field suffix.
const LEAF_SUFFIX: Record<string, string> = {
  firstName: "First",
  middleName: "Middle",
  lastName: "Last",
  dateOfBirth: "Dob",
  gender: "Gender",
  sexId: "Gender",
  phoneNumber: "Phone",
  nationalityCode: "NatCountry",
  residenceCountryCode: "ResCountry",
  residenceStreetId: "ResStreetId",
  residenceCity: "ResCity",
  placeOfBirthStreetId: "PobStreetId",
  countryOfBirthCode: "PobCountry",
  villageOfBirth: "Village",
  documentTypeId: "DocType",
  documentNumber: "DocNumber",
  occupationTypeId: "OccType",
  relationshipTypeId: "RelType",
};

// API container (object/array) name → form field prefix.
const CONTAINER_PREFIX: Record<string, string> = {
  father: "father",
  mother: "mother",
  relatives: "rel",
  spouses: "sp",
  children: "ch",
  emergencyContacts: "ec",
};

/** Translate a single API field path (e.g. "firstName", "father.dateOfBirth",
 * "relatives[0].firstName", "spouses[1].person.firstName") to its form field
 * name, or "" when it can't be mapped. */
function toFormField(apiField: string): string {
  const path = apiField.trim();
  if (!path) return "";

  // Plain top-level field.
  if (TOP_LEVEL[path]) return TOP_LEVEL[path];

  // Split a dotted / bracketed path into segments: container(+index) … leaf.
  const segments = path.split(".").filter(Boolean);
  const leaf = segments[segments.length - 1];
  const container = segments[0] ?? "";

  // Indexed array container, e.g. "relatives[0]" or "relatives" + "[0]".
  const m = container.match(/^([a-zA-Z]+)(?:\[(\d+)\])?$/);
  const containerName = m?.[1] ?? "";
  const index = m?.[2] != null ? Number(m[2]) : null;
  const basePrefix = CONTAINER_PREFIX[containerName];

  if (basePrefix && LEAF_SUFFIX[leaf]) {
    // Array members are 1-indexed in the form (rel1, sp1, ch1, ec1); fixed
    // single-object containers (father/mother) carry no index.
    const prefix = index != null ? `${basePrefix}${index + 1}` : basePrefix;
    return `${prefix}${LEAF_SUFFIX[leaf]}`;
  }

  // Last resort: a leaf that already matches a top-level field name.
  if (TOP_LEVEL[leaf]) return TOP_LEVEL[leaf];
  return "";
}

/** Build a `{ formField: message }` map from an API error, ready to feed into
 * the wizard's `fieldErrors`. Returns `{}` when the error carries no
 * field-level detail (the caller then falls back to a generic message). */
export function mapApiFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const raw = parseBackendFieldErrors(err.data);
  const out: Record<string, string> = {};
  for (const [apiField, message] of Object.entries(raw)) {
    const formField = toFormField(apiField);
    if (formField) out[formField] = message;
  }
  return out;
}
