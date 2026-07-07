# ICRCS Frontend ↔ Backend Validation Discrepancy Report

**For:** Backend dev · **From:** Frontend (icrcs-frontend) · **Date:** 2026-07-04
**Contract source:** `ErrorCode.java` enum, mirrored in `lib/validation/rules.ts`.

## Resolution (2026-07-04) — frontend UX caps set
Product decision: the frontend now enforces **names ≤ 30, email ≤ 50, city ≤ 50**
uniformly, driven from `lib/validation/rules.ts` (`UI_NAME_MAX` / `UI_EMAIL_MAX` /
`UI_CITY_MAX`). This resolved the internal 15-vs-100 name inconsistency and lifted
the email cap off 20 (which was blocking normal addresses). These UI caps are still
*stricter* than the backend contract below (30<100, 50<255, 50<100), which is safe
(never looser than the backend). The questions to the backend dev below remain open
only to confirm the backend's own limits — not to change these UI caps.

## Purpose
The frontend currently enforces several input limits that are **stricter than
the backend contract** — i.e. the UI blocks input the backend would accept.
Per the validation plan (Part A1: "frontend must never be stricter than the
backend"), each item below needs the **actual** backend limit confirmed in
Postman. Once you confirm a value, the frontend caps will be widened/standardized
to match (tracked as next-step #1).

Nothing here has been changed yet — this is the flag, per "verify before encoding."

---

## D1 — Name length: frontend **15** (inconsistent) vs backend **100**

The frontend is inconsistent with itself: applicant/parent/profile name inputs
cap at 15, but emergency-contact/family/guardian name inputs already cap at 100.

| Form | Field(s) | Current cap | Evidence |
|---|---|---|---|
| Stage 1 – Personal | applicantFirst/Middle/Last | **15** | `app/registry/steps/stepPersonal.tsx:187,190,193` |
| Registry person blocks (parents, etc.) | `${prefix}First/Middle/Last` | **15** | `components/registry/blocks.tsx:172,175,178` |
| Create Profile | firstName/middleName/lastName | **15** | `app/create-profile/stepDetails.tsx:206,226,246` |
| Edit Profile | first/middle/last | **15** | `app/dashboard/profile/profileView.tsx:332,344,356` |
| Emergency contacts | `${prefix}First/Middle/Last` | 100 ✅ | `app/registry/steps/stepEmergency.tsx:56,59,62` |
| Family | `${prefix}First/Middle/Last` | 100 ✅ | `app/registry/steps/stepFamily.tsx:68,71,74` |
| Guardian | `${prefix}First/Middle/Last` | 100 ✅ | `app/registry/steps/stepGuardian.tsx:61,64,67` |

- **Backend contract:** `REGISTRATION_*_NAME_TOO_LONG`, `RULES.NAME_MAX = 100`.
- **Postman test:** R-03 (`"A".repeat(16)` and `"A".repeat(101)`).
- **Question:** Is the real limit **100**? (The old UI spec mock said ≤15; the enum says 100 — which is authoritative?)
- **Recommended fix once confirmed:** standardize **all** name inputs to the confirmed value (100), removing the 15/100 split.

---

## D2 — Email length: frontend **20–30** vs backend **255**  ⚠️ HIGH IMPACT

| Form | Field | Current cap | Evidence |
|---|---|---|---|
| Stage 1 – Personal | email | **20** | `app/registry/steps/stepPersonal.tsx:324` |
| Login | email | 30 | `app/login/loginForm.tsx:131` |
| Create Profile | email | 30 | `app/create-profile/stepDetails.tsx:296` |
| Forgot password | identifier (email/phone) | 30 | `app/forgot/forgotFlow.tsx:178` |

- **Backend contract:** `REGISTRATION_EMAIL_TOO_LONG`, `RULES.EMAIL_MAX = 255`.
- **Postman test:** R-12 (256-char email must fail; 255 must pass).
- **Impact:** A 20/30-char cap rejects ordinary addresses — e.g.
  `johngastone11@gmail.com` is **21 characters**, so it cannot be fully typed
  into the Stage 1 email field today. This is very likely blocking real users.
- **Recommended fix once confirmed:** set every email input to **255**.

---

## D3 — City / place-of-birth length: frontend **30** vs backend **100**

| Form | Field(s) | Current cap | Evidence |
|---|---|---|---|
| Stage 1 – Personal | pobCityVillage (place of birth) | **30** | `app/registry/steps/stepPersonal.tsx:313` |
| Address | curCity / permCity | **30** | `app/registry/steps/stepCitizenship.tsx:116,85` |
| Emergency / Family / Guardian | ResCity | **30** | `stepEmergency.tsx:86`, `stepFamily.tsx:109`, `stepGuardian.tsx:153` |

- **Backend contract:** `REGISTRATION_CITY_OF_BIRTH_TOO_LONG` (and residence-city
  equivalents), `CITY_MAX = 100`.
- **Postman test:** S1-13 (101-char city fails; 100 passes).
- **Question:** Is the limit **100** for all city fields (birth + residence)?
- **Recommended fix once confirmed:** widen to **100**.

---

## D4 — File upload size: frontend **300KB** vs backend **500KB**

| Location | Cap | Evidence |
|---|---|---|
| Profile photo | 300KB | `app/dashboard/profile/profileView.tsx:28` |
| Stage 1 passport photo | 300KB | `app/registry/steps/stepPersonal.tsx:37` |
| Stage 5 attachments | 300KB | `app/registry/steps/stepAttachments.tsx:44` |

- **Backend contract:** `FILE_TOO_LARGE`, `RULES.FILE_MAX_BYTES = 500 * 1024`.
- **Postman test:** S5-02 / S5-03 (501KB fails; exactly 500KB passes — confirm ≤ vs <).
- **Note:** The 300KB cap may be a **deliberate** product/file-server choice
  (git history shows it was lowered on purpose). Confirm the intended UI limit —
  if 300KB is intentional, we keep it and this is *not* a discrepancy to fix.

---

## D5 — Fields with NO confirmed backend limit (please provide exact rules)

These aren't necessarily wrong, but the frontend is guessing — confirm the real
per-field limit/format so we can mirror it:

| Field | Current | Evidence | Question |
|---|---|---|---|
| ID / document number | 15 (gate) / 20 (personal, guardian) | `citizenshipGate.tsx:170`, `stepPersonal.tsx:276,278`, `stepGuardian.tsx:119,121` | Per-doc-type format/length? (NIDA = 20 digits?) — Postman S5-09 |
| Organization / employer | 30 | `stepEducation.tsx:302` | Max length? |
| Other occupation | 50 | `stepEducation.tsx:296` | Max length? |
| Education index number | 20 | `stepEducation.tsx:114` | Format/length? |
| Postal code / house number | 15 | `stepCitizenship.tsx:80,111,77,108` | Does the backend validate these at all? |

---

## Non-limit items to also confirm (from the validation plan)

- **A5 – Security:** the backend error message echoes raw user input
  (e.g. `received: 'johngastone11@gmail.com///////][...'`). Recommend dropping
  echoed input in the production profile (log/reflection concern).
- **A5 – Enumeration:** does `forgot-password` return `AUTH_PHONE_NOT_FOUND`/404
  for unknown accounts, or a uniform 200? Prefer uniform 200 (Postman F-02).
- **A6 – Error envelope:** when multiple fields fail at once, does the response
  return **all** of them (`VALIDATION_FAILED` + `fieldErrors[]`) or only the
  first? This decides whether the client loops or handles one code (Postman R-09).

---

## After you confirm

Reply with the confirmed values (or just "enum values are correct") and the
frontend will:
1. Standardize name caps to the confirmed limit (removes the 15/100 split).
2. Widen email caps to 255.
3. Widen city caps to 100.
4. Adjust/keep the 300KB file cap per your intent.

All four are one-line-per-field changes driven from `lib/validation/rules.ts`.
