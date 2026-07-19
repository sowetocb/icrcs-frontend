/**
 * lib/validation/rules.ts
 *
 * SINGLE SOURCE OF TRUTH for every numeric/pattern limit that mirrors the
 * Spring Boot backend contract (ErrorCode.java). Values here are the BACKEND
 * limits — verify each against the backend via Postman (see
 * icrcs-form-validation-plan.md, Part C) before trusting it.
 *
 * IMPORTANT — frontend divergences (kept intentionally until Postman Phase 0):
 *   • Name inputs currently cap at maxLength=15 in the wizard (see
 *     app/registry/steps/stepPersonal.tsx) — STRICTER than the backend's 100.
 *   • The Stage-1 email input caps at maxLength=20 — STRICTER than 255.
 *   • File uploads enforce 300KB in the UI (profileView / stepPersonal /
 *     stepAttachments) — STRICTER than the backend's 500KB.
 *   • lib/countries.ts stores ISO-3166-1 alpha-2 codes; the backend contract
 *     below (and the country schemas) use alpha-3. Reconcile via the live
 *     getCountries() lookup before wiring ISO3_SHAPE anywhere.
 * These are annotated inline as FRONTEND-DIVERGES so a later wiring pass knows
 * not to silently overwrite a deliberate UI choice.
 */

export const RULES = {
  // ---- Frontend input caps (UI maxLength) — the single place every name/email/
  // city input reads its maxLength from, so they never drift apart again.
  // These are deliberately STRICTER than the backend *_MAX limits below (a UX
  // choice); the backend still enforces the real limit. Change here => changes
  // everywhere. ----
  UI_NAME_MAX: 30,
  UI_EMAIL_MAX: 50,
  UI_CITY_MAX: 50,

  // ---- Names (REGISTRATION_*_NAME_REQUIRED / *_TOO_LONG / NAME_INVALID_CHARACTERS) ----
  NAME_MIN: 1,
  NAME_MAX: 100, // backend contract; UI enforces UI_NAME_MAX (30)
  NAME_PATTERN: /^[\p{L}][\p{L}'\- ]*$/u, // letters, spaces, hyphens, apostrophes

  // ---- ORG-class free text (schoolName, organizationName, specialMark, issue
  // place). Must CONTAIN at least one letter and START with a letter or digit —
  // so a string of only punctuation/digits (e.g. "-----''''999000") is rejected,
  // not just the symbol soup. Interior chars: letters, digits, spaces and the
  // common punctuation of org/place names + mark descriptions. ----
  ORG_PATTERN: /^(?=.*\p{L})[\p{L}\p{N}][\p{L}\p{N} .,'()/&-]*$/u,
  // Character class (no anchors) for the live input filter — strips anything not
  // in the ORG interior set as the user types. The "≥1 letter / no leading
  // punctuation" rules above are enforced on blur (a filter can't check those).
  ORG_ALLOWED_CHARS: "\\p{L}\\p{N} .,'()/&-",

  // ---- Email (REGISTRATION_EMAIL_REQUIRED / _INVALID / _TOO_LONG, PROFILE_EMAIL_EXISTS) ----
  EMAIL_MAX: 255, // backend contract; UI enforces UI_EMAIL_MAX (50)
  // Canonical email FORMAT — the single source of truth for every email input
  // (login, create-profile, forgot-password, registry wizard). This is the exact
  // pattern used at authentication, so an address accepted to sign in is accepted
  // everywhere. Length is capped separately (UI_EMAIL_MAX / EMAIL_MAX).
  EMAIL_PATTERN: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  // Characters that can never appear in an email — used by the live input filter
  // to strip disallowed keystrokes. Global flag: use ONLY with String.replace.
  EMAIL_DISALLOWED: /[^A-Za-z0-9._%+\-@]/g,

  // ---- Phone (REGISTRATION_PHONE_REQUIRED / _INVALID / _TOO_SHORT, PROFILE_PHONE_*) ----
  // Accepts 07XXXXXXXX or +2557XXXXXXXX (Tanzania mobile, network prefixes 6/7).
  TZ_PHONE_LOCAL: /^0[67]\d{8}$/,
  TZ_PHONE_INTL: /^\+255[67]\d{8}$/,

  // ---- Country / nationality codes (ISO-3166-1 alpha-3) ----
  ISO3_SHAPE: /^[A-Z]{3}$/, // shape check -> *_INVALID codes
  // NOTE: shape-valid but non-existent codes (e.g. "ZZZ") are rejected server-side
  // with REGISTRATION_COUNTRY_CODE_UNKNOWN. Validate against the live
  // getCountries() lookup, not just this regex. FRONTEND-DIVERGES: lib/countries.ts
  // is alpha-2 today.
  TANZANIA_ISO3: 'TZA',

  // ---- Password (Reset Password UI Requirements checklist) ----
  // Backend PASSWORD class: min 8 + uppercase + lowercase + digit + special.
  PASSWORD_MIN: 8,
  PASSWORD_HAS_CAPITAL: /[A-Z]/,
  PASSWORD_HAS_LOWER: /[a-z]/,
  PASSWORD_HAS_DIGIT: /[0-9]/,
  PASSWORD_HAS_SPECIAL: /[^A-Za-z0-9]/,

  // ---- OTP ----
  OTP_LENGTH: 6,
  OTP_PATTERN: /^\d{6}$/,

  // ---- Dates (VALIDATION_DOB_FUTURE, REGISTRATION_DOB_TOO_OLD, REGISTRATION_INVALID_DATE) ----
  MAX_AGE_YEARS: 130,
  MIN_APPLICANT_AGE_FOR_DECLARING_CHILDREN: 16, // REGISTRATION_MINOR_CANNOT_HAVE_CHILDREN
  PARENT_MIN_AGE_GAP_YEARS: 16, // REGISTRATION_PARENT_AGE_INVALID
  SPOUSE_MIN_AGE: 16, // REGISTRATION_SPOUSE_UNDERAGE
  CONTACT_MIN_AGE: 18, // REGISTRATION_CONTACT_UNDERAGE
  CLAIM_MIN_AGE: 18, // REGISTRATION_CLAIM_AGE_REQUIRED
  EDU_YEAR_MIN: 1900, // REGISTRATION_EDUCATION_YEAR_INVALID

  // ---- Files (FILE_EMPTY / FILE_TOO_LARGE / FILE_TYPE_NOT_ALLOWED) ----
  FILE_MAX_BYTES: 500 * 1024, // 500KB. FRONTEND-DIVERGES: UI enforces 300KB
  FILE_ALLOWED_MIME: ['image/jpeg', 'image/png', 'application/pdf'] as const,
  // Photo-only fields (passport photo, profile picture) intentionally accept
  // images only (no PDF) — use this, not FILE_ALLOWED_MIME.
  PHOTO_ALLOWED_MIME: ['image/jpeg', 'image/png'] as const,

  // ---- Collection sizes ----
  ATTACHMENTS_MAX: 20, // REGISTRATION_ATTACHMENT_LIMIT_EXCEEDED
  EMERGENCY_CONTACTS_MIN: 1, // REGISTRATION_EMERGENCY_CONTACTS_REQUIRED
  EMERGENCY_CONTACTS_MAX: 10, // REGISTRATION_CONTACT_LIMIT_EXCEEDED
  RELATIVES_MIN: 2, // REGISTRATION_RELATIVE_COUNT_INVALID
  RELATIVES_MAX: 20, // REGISTRATION_RELATIVES_LIMIT_EXCEEDED
  SPOUSES_MAX: 4, // REGISTRATION_SPOUSES_LIMIT_EXCEEDED
  CHILDREN_MAX: 30, // REGISTRATION_CHILDREN_LIMIT_EXCEEDED
  REGISTRATIONS_PER_PROFILE_MAX: 10, // REGISTRATION_LIMIT_REACHED

  // ---- Per-field limits from the v002 backend validation reference ----
  // Every input `maxLength` and every payload cap MUST read from here. Do NOT
  // hardcode these numbers in a step component: that is exactly how the frontend
  // silently drifted from the contract (v002 made eyeColor/hairColor/
  // languageSpoken required and nobody noticed until the backend 400'd).
  // Grouped by stage so a contract change maps to one obvious place.

  // Stage 1 — physical characteristics (shared by citizen + migrant).
  OTHER_NAMES_MAX: 30, // NAME
  TRIBE_MAX: 50, // NAME
  EYE_COLOR_MAX: 30, // NAME
  HAIR_COLOR_MAX: 30, // NAME
  LANGUAGE_SPOKEN_MAX: 30, // NAME
  SPECIAL_MARK_MAX: 100, // ORG
  HEIGHT_CM_MIN: 50,
  HEIGHT_CM_MAX: 280,

  // Identification documents (DocumentItemRequest).
  DOC_NUMBER_MAX: 50, // DOC_NUM
  NIDA_EXACT_DIGITS: 20,
  // Per-document-type number formats (Tanzania), keyed by a keyword found in the
  // document-type label/code. `numeric` = digits only; else alphanumeric.
  // min/max are character counts (min===max means an exact length).
  // NIDA (20) and TIN (9/10) match the backend; Driving Licence / Voter's ID /
  // Certificate are best-effort ranges — CONFIRM the official formats and
  // tune here (this is the single source of truth for both the input cap and the
  // blur-time length check).
  DOC_NUMBER_RULES: {
    NIDA:    { numeric: true,  min: 20, max: 20 },
    TIN:     { numeric: true,  min: 9,  max: 10 },
    DRIVING: { numeric: false, min: 8,  max: 16 },
    VOTERS:  { numeric: false, min: 6,  max: 15 },
    BIRTH:   { numeric: false, min: 5,  max: 20 },
    DEFAULT: { numeric: false, min: 3,  max: 50 },
  },

  // Naturalization certificate.
  NATURALIZATION_CERT_NUMBER_MAX: 100, // DOC_NUM
  NATURALIZATION_ISSUE_PLACE_MAX: 100, // ORG

  // Travel history (migrant track only). All fields optional.
  POINT_OF_ENTRY_MAX: 50,
  TRANSIT_COUNTRY_MAX: 50,
  TRAVEL_DOC_TYPE_MAX: 30,
  TRAVEL_DOC_NO_MAX: 30,
  TRAVEL_ISSUE_AUTHORITY_MAX: 100,

  // Stage 2 — address.
  HOUSE_NO_MAX: 20,
  POSTAL_ADDRESS_MAX: 50,
  CAMP_NAME_MAX: 50, // migrant only
  PROPERTIES_MAX: 200, // migrant only

  // Stage 4 — education & employment.
  SCHOOL_NAME_MAX: 200, // ORG
  ORGANIZATION_NAME_MAX: 200, // ORG
  OTHER_OCCUPATION_MAX: 50,

  // Shared RelatedPersonRequest.
  PERSON_PHONE_MAX: 30,

  // ---- Enumerated lookup IDs (confirm exact values with the live lookup API) ----
  // NOTE: the app fetches these live (getGenders / getCitizenshipTypes /
  // getEducationLevels / getAttachmentTypes). Prefer the lookup over hardcoding;
  // these are fallbacks / contract references only.
  SEX: { FEMALE: 1, MALE: 2 } as const, // REGISTRATION_SEX_INVALID
  CITIZENSHIP_TYPE: { BIRTH: 1, DESCENT: 2, NATURALIZATION: 3 } as const, // REGISTRATION_CITIZENSHIP_TYPE_INVALID
} as const;

export type SexId = (typeof RULES.SEX)[keyof typeof RULES.SEX];
export type CitizenshipTypeId = (typeof RULES.CITIZENSHIP_TYPE)[keyof typeof RULES.CITIZENSHIP_TYPE];

export type DocNumberRule = { numeric: boolean; min: number; max: number };

/** Map an identification-document TYPE (its label or code) to its number rule.
 * Central classifier used by both the input cap and the blur-time length check,
 * so a document number can't be an arbitrary long blob (e.g. a 28-digit "birth
 * certificate"). Unknown types fall back to DEFAULT. */
export function docNumberRuleFor(labelOrCode: string): DocNumberRule {
  const s = (labelOrCode ?? "").toUpperCase();
  const R = RULES.DOC_NUMBER_RULES;
  if (s.includes("NIDA")) return R.NIDA;
  if (/\bTIN\b/.test(s)) return R.TIN;
  if (s.includes("DRIV") || s.includes("LICEN")) return R.DRIVING;
  if (s.includes("VOTER") || s.includes("VOTE")) return R.VOTERS;
  if (s.includes("BIRTH")) return R.BIRTH;
  return R.DEFAULT;
}
