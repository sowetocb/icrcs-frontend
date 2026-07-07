# ICRCS Frontend ↔ Backend Validation Coverage Matrix

**Question answered:** for every backend `ErrorCode`, is the rule mirrored client-side,
is it server-only by nature, or is it a gap the frontend *could* check but doesn't?

**Date:** 2026-07-04 · **Backend source:** `ErrorCode.java` (233 codes) · **Client SSOT:** `lib/validation/rules.ts`

> Method: cross-referenced the enum against the registration wizard's validator
> (`app/registry/registryWizard.tsx` — `REQUIRED_FIELDS`, `validate()`, `validateDob()`,
> `validateNidaField()`, cross-field checks), the field primitives
> (`components/registry/field.tsx`, `countrySelect.tsx`, `wardCascade.tsx`), the auth
> forms, and the shared limits in `rules.ts`. Backend errors that *aren't* pre-checked
> are still surfaced to the user via `lib/api/errorMessagesSw.ts` + `lib/registry/errorFields.ts`.

## Legend
- 🟢 **Mirrored** — the frontend pre-validates this before submit.
- 🔵 **Server-only** — cannot be checked client-side (uniqueness, sequencing, state, correctness, existence, limits needing server counts). Frontend only *renders* the returned error.
- 🟡 **Gap** — client-checkable, but **not** enforced today (backend still catches it).
- ⚪ **Divergent** — mirrored, but the UI is deliberately *stricter* than the backend (see discrepancy report D1–D4).

## Bottom line (approximate)
| Category | ~Count | Meaning |
|---|---|---|
| 🔵 Server-only | ~120 | Correctly not in the frontend — never will be |
| 🟢 Mirrored | ~95 | Pre-validated client-side |
| 🟡 Gap | ~13 | Should be client-checked; listed in §Gaps |
| ⚪ Divergent | 4 groups | Stricter caps (names/email/city/file) |

So: **most field-level rules are mirrored; the ~120 server-only codes are handled only as rendered errors (by design); and ~13 real gaps remain.** It is *not* a total mirror, and shouldn't be.

---

## AUTH — mostly server-only (correctness / state)
| Code | Cat | Enforced by / note |
|---|---|---|
| AUTH_OTP_INVALID / _EXPIRED / _BLOCKED / _MAX_ATTEMPTS | 🔵 | OTP correctness/state — server. Client mirrors only the **6-digit shape** (`otpInput`, `RULES.OTP_LENGTH`) |
| AUTH_OTP_RESEND_LIMIT / _RESEND_COOLDOWN | 🔵 | Server counters. UI shows a cooldown timer (`stepOtp`, `forgotFlow`) but can't authorize |
| AUTH_INVALID_CREDENTIALS | 🔵 | Deliberately opaque — server only |
| AUTH_PASSWORD_REUSE | 🔵 | Last-5-password history — server only |
| AUTH_ACCOUNT_LOCKED / _INACTIVE / _ALREADY_ACTIVE | 🔵 | Account state — server |
| AUTH_PHONE_NOT_FOUND | 🔵 | Existence — server |
| AUTH_REFRESH_TOKEN_INVALID / TOKEN_INVALID / TOKEN_EXPIRED | 🔵 | Token state — server (drives redirect-to-login) |
| AUTH_LOCKED (deprecated) | 🔵 | Alias of ACCOUNT_LOCKED |

Login form does mirror **email format** + **password required** (`loginForm.tsx` `EMAIL_RE`).

## PROFILE
| Code | Cat | Enforced by / note |
|---|---|---|
| PROFILE_PHONE_EXISTS / EMAIL_EXISTS | 🔵 | Uniqueness — server |
| PROFILE_NOT_FOUND / ALREADY_ACTIVE | 🔵 | State — server |
| PROFILE_PHONE_FORMAT_INVALID / PHONE_TOO_SHORT | 🟢 | TZ phone regex (`RULES.TZ_PHONE_*`, phone inputs) |

## RATE / FILE
| Code | Cat | Enforced by / note |
|---|---|---|
| RATE_LIMIT_EXCEEDED | 🔵 | Server counter |
| FILE_TOO_LARGE | ⚪ | Mirrored but **stricter** (UI 300KB vs 500KB) — `stepPersonal`, `stepAttachments`, `profileView` |
| FILE_TYPE_NOT_ALLOWED | 🟢 | MIME check (`RULES.FILE_ALLOWED_MIME` / `PHOTO_ALLOWED_MIME`, `ATTACHMENT_ACCEPT`) |
| FILE_EMPTY | 🟡 | **Gap** — no explicit 0-byte guard before upload |
| FILE_STORAGE_FAILED | 🔵 | Server 500 |

## LOOKUP — all server-only (ID existence)
`LOOKUP_NOT_FOUND`, `LOOKUP_WARD/DISTRICT/REGION/DOC_TYPE/EDU_LEVEL/STREET_NOT_FOUND`, `LOOKUP_SERVICE_UNAVAILABLE`, and `REGISTRATION_COUNTRY_CODE_UNKNOWN` → 🔵. The client uses live lookups so it rarely sends a bad id, but it cannot *guarantee* existence.

## REGISTRATION — business rules / sequencing / ownership (server-only)
🔵 all of: `REGISTRATION_LIMIT_REACHED`, `NOT_OWNED`, `EMAIL_NOT_VERIFIED`, `OTP_EXPIRED/INVALID/RESEND_TOO_SOON`, `STAGE_ALREADY_SUBMITTED`, `PREVIOUS_STAGE_REQUIRED`, `PHONE_EXISTS`, `EMAIL_EXISTS`, `DUPLICATE_DOCUMENT`, `DOCUMENT_NUMBER_EXISTS`, `DOCUMENT_TYPE_NOT_ALLOWED`, `PARENT_NOT_APPROVED`, `CHILD_REQUIRES_PARENT`, `ADULT_CANNOT_HAVE_PARENT`, `SELF_ALREADY_EXISTS`, `NOT_YOUR_CHILD`, `NOT_FOUND`, all `CLAIM_*`, `NOT_A_CHILD_REGISTRATION`, deprecated `REG_*` aliases, `DECLARATION_NOT_FOUND`.

Client-mirrorable ones in this group:
| Code | Cat | Enforced by / note |
|---|---|---|
| REGISTRATION_NATURALIZATION_REQUIRED / _CERT / _PLACE / _DATE_REQUIRED / _DATE_FUTURE | 🟢 | Naturalization branch required when citizenship type = 3 (`registryWizard` conditional + `stepCitizenship`) |
| REGISTRATION_PERMANENT_ADDRESS_REQUIRED | 🟢 | Stage-2 conditional (`stage2`/`stepCitizenship`, cascade) |
| REGISTRATION_DECLARATION_REQUIRED | 🟢 | Declaration checkbox required (`stepPreviewDeclaration`) |
| REGISTRATION_ORGANIZATION_REQUIRED | 🟢 | Employed ⇒ organization required (`registryWizard` step-4 conditional) |
| REGISTRATION_PASSPORT_PHOTO_REQUIRED | 🟢 | Mandatory attachment pre-ticked/locked (`stepAttachments` `mandatory`) |
| REGISTRATION_BIRTH_OR_AFFIDAVIT_REQUIRED / BIRTH_CERT_REQUIRED / DOCUMENTS_REQUIRED / ATTACHMENTS_REQUIRED | 🟡/🟢 | Passport photo enforced; **birth-proof / adult-ID "at least one of" logic is not fully mirrored** — partial |
| REGISTRATION_DOCUMENT_NUMBER_INVALID | 🟢/🟡 | NIDA format mirrored (`validateNidaField`); other doc-type formats **unconfirmed** (report D5) |
| REGISTRATION_CHILD_INFO_REQUIRED | 🟢 | hasChildren ⇒ child fields required (`registryWizard` step-6 conditional) |
| REGISTRATION_MINOR_CANNOT_HAVE_CHILDREN | 🟢 | Minor ⇒ "has children" disabled (`stepFamily`) |
| REGISTRATION_CHILD_DOB_INVALID | 🟡 | **Gap** — "child born after applicant turned 16" not checked client-side |
| REGISTRATION_INVALID_DATE | 🟢 | Date format `YYYY-MM-DD` enforced by date input |

## VALIDATION (generic)
| Code | Cat | Note |
|---|---|---|
| VALIDATION_DOB_FUTURE | 🟢 | `isFutureDate` / `validateDob` |
| VALIDATION_FAILED / VALIDATION_BLANK_FIELD | 🔵 | Server aggregate/generic |

## STAGE 1 — Personal (field required/format) → mostly 🟢
`FIRST/MIDDLE/LAST_NAME_REQUIRED`, `SEX_REQUIRED`, `DATE_OF_BIRTH_REQUIRED`, `NATIONALITY_CODE_REQUIRED`, `CITIZENSHIP_TYPE_REQUIRED`, `PLACE_OF_BIRTH_STREET_REQUIRED`, `COUNTRY_OF_BIRTH_REQUIRED`, `CITY_OF_BIRTH_REQUIRED`, `PHONE_REQUIRED`, `EMAIL_REQUIRED` → 🟢 (`REQUIRED_FIELDS[0]` + conditional birth branch).
`PHONE_INVALID/_TOO_SHORT`, `EMAIL_INVALID`, `NATIONALITY/COUNTRY_OF_BIRTH_INVALID`, `NAME_INVALID_CHARACTERS`, `INVALID_DATE`, `DOB_TOO_OLD` → 🟢 (regex/`lettersOnly`/`validateDob`; nationality is a picker so always shape-valid).
`*_NAME_TOO_LONG`, `EMAIL_TOO_LONG`, `CITY_OF_BIRTH_TOO_LONG` → ⚪ (mirrored but **stricter** UI caps: names 30, email 50, city 50).
`REGISTRATION_COUNTRY_CODE_UNKNOWN` → 🔵 (existence).

## STAGE 2 — Address → 🟢
`CURRENT/PERMANENT_STREET/COUNTRY/CITY_REQUIRED`, `*_COUNTRY_INVALID`, `CURRENT_ADDRESS_REQUIRED` → 🟢 (`stage2` conditional refine, `wardCascade`). Duplicate address type (`REG_ADDRESS_TYPE_EXISTS`) → 🔵.

## STAGE 3 — Parents → 🟢 (with one note)
`FATHER/MOTHER_INFO_REQUIRED`, parent `FIRST/MIDDLE/LAST_NAME_REQUIRED/_TOO_LONG`, `NATIONALITY_REQUIRED`, `RESIDENCE_COUNTRY/STREET/CITY_REQUIRED`, `PHONE_INVALID` → 🟢 (`REQUIRED_FIELDS[2]`, `blocks`, cascade). Middle name **required** for parents — mirrored.
`REGISTRATION_PARENT_AGE_INVALID` → 🟢 (`atLeastYearsOlder(parentDob, applicantDob, 16)`, `registryWizard:1531`).
Parent name `TOO_LONG` → ⚪ (UI cap 30).

## STAGE 4 — Education & Employment → 🟢 (with gaps)
`EDUCATION_LEVEL/COUNTRY/CITY/SCHOOL/YEAR_REQUIRED`, `EMPLOYMENT_STATUS_REQUIRED`, `OCCUPATION_TYPE_REQUIRED` → 🟢 (conditional required).
`EDUCATION_YEAR_INVALID` → 🟢 (year range check); `EDUCATION_YEAR_BEFORE_BIRTH` → 🟢 (birth-year check).
`DUPLICATE_EDUCATION_LEVEL` → 🟢 (UI de-dup makes it unpickable).
`REGISTRATION_PRIMARY_EDUCATION_REQUIRED` → 🟡 **Gap** — not enforced that at least one entry is Primary.
`*_LEVEL_INVALID / _STATUS_INVALID / _OCCUPATION_INVALID` → 🔵 (lookup id).

## STAGE 5 — Documents → partial
`ATTACHMENT_TYPE/URL_REQUIRED/_INVALID`, `MANDATORY_MISSING` → 🟢/🟡 (mandatory passport photo enforced; full mandatory-set logic partial).
`ATTACHMENT_LIMIT_EXCEEDED` (>20) → 🟡 **Gap** (no client max). `DUPLICATE_ATTACHMENT_TYPE` → 🟢 (UI prevents re-selecting a type). `ATTACHMENT_URL_INVALID` → 🔵 (server file-server origin).

## STAGE 6 — Family → 🟢 (with gaps)
`MARITAL_STATUS_REQUIRED/_INVALID`, `EMERGENCY_CONTACTS_REQUIRED` (min 1), `CONTACT_*_REQUIRED`, `RELATIVE_*_REQUIRED`, `SPOUSE_*_REQUIRED`, `CHILD_*_REQUIRED`, residence fields → 🟢 (`REQUIRED_FIELDS[4/5]`, conditional).
`CONTACT_UNDERAGE` (≥18) → 🟢 (`isAtLeast18`); `SPOUSE_UNDERAGE` (≥16) → 🟢 (`isAtLeast16`); `RELATIVE_COUNT_INVALID` (min 2) → 🟢 (`MIN_RELATIVES = RULES.RELATIVES_MIN`).
`RELATIVE_DOB_INVALID` (range) → 🟢 (`validate` dob rules).
**Gaps:**
- `REGISTRATION_SPOUSE_GENDER_MISMATCH` (spouse must be opposite gender) → 🟡
- `REGISTRATION_SPOUSE_GENDER_REQUIRED` → 🟢 (gender required in spouse block)
- `CONTACT_LIMIT_EXCEEDED` (≤10), `RELATIVES_LIMIT_EXCEEDED` (≤20), `SPOUSES_LIMIT_EXCEEDED` (≤4), `CHILDREN_LIMIT_EXCEEDED` (≤30) → 🟡 **Gaps** (no client max — this is next-step #3)
`SEX_INVALID / GENDER_INVALID / RELATIONSHIP_TYPE_INVALID` → 🔵 (lookup id).

## NATURALIZATION / ADMIN / SYSTEM
`NATURALIZATION_*` → 🟢 (see Stage 1 branch). `ADMIN_*` → 🔵 (officer app, N/A here). `SYSTEM_*` → 🔵.

---

## §Gaps — the client-checkable rules not yet enforced (~13)
1. `REGISTRATION_SPOUSE_GENDER_MISMATCH` — spouse opposite-gender check.
2. `REGISTRATION_CHILD_DOB_INVALID` — child born after applicant turned 16.
3. `REGISTRATION_PRIMARY_EDUCATION_REQUIRED` — at least one Primary entry.
4. `REGISTRATION_CONTACT_LIMIT_EXCEEDED` (≤10)
5. `REGISTRATION_RELATIVES_LIMIT_EXCEEDED` (≤20)
6. `REGISTRATION_SPOUSES_LIMIT_EXCEEDED` (≤4)
7. `REGISTRATION_CHILDREN_LIMIT_EXCEEDED` (≤30)
8. `REGISTRATION_ATTACHMENT_LIMIT_EXCEEDED` (≤20)
9. `FILE_EMPTY` — 0-byte guard.
10. `REGISTRATION_BIRTH_OR_AFFIDAVIT_REQUIRED` / `DOCUMENTS_REQUIRED` — "at least one of" mandatory-doc logic (partial).
11. `REGISTRATION_DOCUMENT_NUMBER_INVALID` — per-doc-type formats beyond NIDA (needs backend rules, report D5).

Items 4–8 are exactly **next-step #3** (disable "Add" at the collection max); items 1–3 are three small cross-field checks; the rest need backend confirmation.

## §Divergences — mirrored but intentionally stricter (report D1–D4)
Names 30 (<100), email 50 (<255), city 50 (<100), file 300KB (<500KB). Safe (never looser than backend); pending backend confirmation to widen.
