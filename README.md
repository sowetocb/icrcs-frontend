# ICRCS — Immigration Central Registration and Citizenship System

Web portal for **Tanzania's Immigration Services Department (TISD)** that provides secure, sovereign digital access to citizen registration, application status tracking, profile management, and document processing under a unified institutional identity.

Built with **Next.js 16** (React 19) and integrated with backend REST APIs. Access is **restricted to registered users** with email-verified accounts.

---

## Overview

Registered users can:

* **Verify Application Status without Logging In** (public status check) via the login page
* **Create a Verified Profile** with OTP-based email verification and a country-code phone picker
* **Confirm Citizenship at a Gate** before registering — Tanzanian citizens proceed; verified non-citizens see their **immigration status** and may register a Tanzanian-origin **minor**
* **Register Themselves and Dependents** (under 18) via a comprehensive 9-stage wizard
* **Upload Supporting Documents** (birth certificates, national IDs, and passport photos), with the Stage 1 photo and birth certificate carried into the Uploads stage
* **Track Application Status** through a staged pipeline (Submitted → Under Review → Biometric Appointment → Final Approval → Completed → Certificate Issued)
* **Download and Print Registration Forms** as formatted A4 PDFs, compiled from the server `/review` record
* **Manage Personal Profile Details** including profile picture uploads
* **Reset Forgotten Passwords** via OTP verification
* **Read the "About ICRCS" Applicant Guide** from the login / create-profile screens (full step-by-step guide in English and Swahili)
* **Switch Interface Language** instantly between English and Swahili
* **Toggle Between Light and Dark Themes** seamlessly

---

## Key Features

### Authentication & Security

* **Sovereign Login** — Email and password authentication with secure session management.
* **OTP Verification** — 6-digit code sent during profile creation with a countdown timer and resend capability.
* **Country-code Phone Picker** — Profile creation and the wizard use a flag + dial-code picker; a leading `0` is trimmed and the dial code prepended (e.g. `0786849280` → `+255786849280`).
* **Password Strength Validation** — Enforces secure passwords; unmet requirements are listed individually beneath the field as you type (no always-on checklist).
* **Multi-Step Password Reset** — Identifier entry → OTP verification → secure new password creation.
* **Automatic Keep-Alive** — Proactive token refresh every 4 minutes and tab visibility synchronization.
* **Idle Timeout & Auto-Logout** — 30-minute inactivity detection with a 60-second warning countdown synced cross-tab via `localStorage`.
* **Auth Guards** — Strict protection of internal routes ensuring unauthenticated visitors are redirected to the login screen.

---

### Institutional Branding

* **Official Emblems** — Header features the official Coat of Arms and Immigration Emblem across all pages.
* **National Color Gradients** — Tanzania flag-inspired blue, yellow, green, and black accents.
* **Promotional Hero Section** — Welcoming and patriotic slogans with auto-scrolling "Why ICRCS" info cards on login/signup screens.
* **Security Status Check** — The public Application-ID status checker appears on the **login screen only**.
* **About ICRCS Dialog** — An "About this system" button (login / create-profile) opens the full **Applicant Guide** — what the system is, who must register, the step-by-step process, required documents, and contact info — in both English and Swahili.
* **Professional Typography** — Modern Montserrat and JetBrains Mono fonts for maximum clarity.

---

### Citizenship Gate (pre-registration)

An independent gate runs before the wizard to branch by citizenship:

* **Tanzanian citizens** continue straight into the registration wizard.
* **Non-citizens** supply Nationality + Travel Document Type + Document Number, then their permit is looked up:
  * **Verified** → a card shows their **immigration status** (permit type, number, validity), then asks whether they have a **Tanzanian-origin minor** to register. Choosing *Yes* enters the wizard as a **minor registration** (the foreign account holder's identity is not bound to it).
  * **Not found** → guidance to visit the nearest immigration office.

---

### Citizen Registration Wizard

A comprehensive **9-stage** registration flow synced with the backend (`/v1/registration/{subjectId}/stageN`). Each stage POSTs to create and PUTs to edit:

| Stage | Section | Details |
| :--- | :--- | :--- |
| **1** | **Personal Information** | Names, gender, DOB (18+ primary / under-18 dependents), citizenship, nationality, place of birth, marital status, optional **NIDA number** (account holder only), and contact. Mandatory **passport photo** and an optional **birth certificate** are captured here and carried into Stage 8 uploads. Non-Tanzania birthplace hides Region/District/Ward and shows free-text City/Village. |
| **2** | **Address** | Permanent + Current address (Country → Region → District → Ward cascade), house number, postal code, with a "same as" checkbox that copies and disables the second address. |
| **3** | **Parents** | Father & Mother sub-forms: full name, DOB, phone, nationality, place of birth, residence, and optional ID document (Type/Number + file upload → `attachmentTypeId=12`, bound to `documentFileUrl`). |
| **4** | **Education & Employment** | Dynamic **school repeater** (Education Level, Year, School Name, District, Index No.) — a "Primary education is mandatory" notice shows when the applicant attended school. Employment status (lookup-driven); occupation & employer apply only when **Employed**. |
| **5** | **Emergency Contacts** | Two contacts, each a full person sub-form with optional ID document upload. |
| **6** | **Family** | "Have children?" / "Married?" toggles; **Spouses repeater** (≥1 if married) and **Relatives repeater** (≥2), each with optional document uploads. |
| **7** | **Referees** (print-only) | No data submitted — "Download and Print Referees Form" fetches the compiled form from `GET /stage7`; the signed scan is uploaded in Stage 8. |
| **8** | **Uploads** | Structured attachment grid; each file uploaded to `/v1/files/upload?attachmentTypeId=N`, then the collection finalised. Stage 8 is gated on the passport photo — a network failure at Stage 1 is **retried here** without data loss. |
| **9** | **Preview & Declaration** | Server-compiled summary via `GET /v1/registration/{subjectId}/review`; confirmation checkbox enables final `POST /stage9?confirmed=true`. |

* **Save & Exit / Resume** — Drafts persist in the browser **keyed by Application ID** and **survive logout / idle auto-logout** (owner-scoped, cleared cross-user on login), so an unsubmitted registration can be resumed.
* **Cascading Address Selectors** — Country-driven Region → District → Ward cascade backed by the lookup API; flags on every country dropdown, with **Tanzania pinned to the top** of every country list.
* **Locked Fields Logic** — The primary creator's details are locked from their profile; dependents inherit contact details (email/phone) but must fill unique personal details. When a verified **non-citizen registers a minor**, the creator's names are **not** prefilled or locked and the subject is validated as a minor.
* **Lookup values sent by ID** — Gender, marital status, and employment status are submitted to the backend by their **lookup ID** (resolved at payload time), while the dropdown shows the exact label returned by the lookup API (e.g. `Ke (Female)`, `Me (Male)`).
* **Specific validation feedback** — Skipping required fields lists exactly which fields are missing (by readable label), not just a red border.
* **Sticky steps sidebar** — The stage stepper stays fixed in view while the form scrolls.
* **Resilient uploads** — Stage 1 text data is saved first; a failed passport-photo upload is non-fatal and retried at the Stage 8 gate. The Stage 1 birth certificate is uploaded once the `subjectId` exists and merged into the Stage 8 attachments.

---

### Application Status Tracking

* **Public Status Lookup** — Status checker card on the login page lets applicants enter their Application ID (e.g., `ICRCS-YYYYMMDD-XXXXXX-XXXXXX`) and view live progress without logging in.
* **6-Stage Pipeline** — Visually maps progress through:
  1. Submitted
  2. Under Review
  3. Biometric Appointment
  4. Final Approval
  5. Completed
  6. Certificate Issued
* **Status Badges** — Clear indicators for Pending, Pending Assessment, Submitted, Approved, Rejected, and Incomplete.

---

### Registered People Dashboard

* **Table layout** of everyone registered under the account — Application ID, Applicant Name, Status, Registration Date, and a Download (PDF) action — that scales cleanly beyond a few records.
* **Summary cards** — Total Registered, Completed, Pending, and Rejected counts.
* **Search & filters** — Search by name or Application ID, plus Status and date-of-registration filters.
* **Account Holder marker** — The account holder is shown with a person icon + badge. Exactly **one** row is marked (the profile match, else the earliest registrant).
* **Earliest-first ordering** — The first person registered under the account stays at the top of the list.
* **Download PDF** — Fetches the server `/review` record and renders the printable form for download.

---

### Printable Registration Form

* **A4 Print-Optimized CSS** — Formats the full registration summary into a professional document layout.
* **Server-compiled data** — Built from `GET /v1/registration/{subjectId}/review` (display-ready names + nested locations) merged over the local draft.
* **Institutional Branding** — Features official emblems, headers, and signature lines.
* **Download & Print Actions** — Instantly accessible from the submission success page or the Registered People list.

---

### Internationalization (i18n)

* **Dual-Language Interface** — English and Swahili supported natively.
* **Locale Persistence** — Remembers user preferences between sessions.
* **Dynamic Translation Loading** — Over 700 translation keys covering all forms, errors, and legal clauses.

---

### Settings & Themes

* **System-Aware Dark Mode** — Integrates with system settings and manual toggle in the top bar.
* **No-Flash Script** — Custom blocking script prevents white flashes on dark-mode page loads.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router) |
| **UI Library** | React 19.2 |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS 4 (with custom `@theme` design tokens) |
| **Fonts** | Google Fonts (Montserrat, JetBrains Mono) |
| **HTTP Client** | Native `fetch` API wrapped in custom client handler |
| **Session Storage** | LocalStorage, Cookie-based session validation |
| **Internationalization** | Custom locale provider with typed key validation |
| **Theme Management** | CSS Variables + Pre-render theme injection |
| **Build System** | Turbopack |

---

## Project Architecture

Clean architecture layout using Next.js App Router conventions:

```
app/
├── api/                    # API proxy & endpoint handlers
├── create-profile/         # Sign-up, OTP, and password creation
├── dashboard/              # User main area and profile settings
│   └── profile/            # Profile photo & contact details
├── forgot/                 # Forgot / Reset Password OTP flow
├── i18n/                   # Localizations and switcher
├── login/                  # Login page & form
├── registry/               # Citizen registration module
│   ├── people/             # Registered people list
│   ├── status/             # Application status checker & results
│   └── steps/              # 9-stage wizard step components
├── theme/                  # Theme provider (dark/light)
├── layout.tsx              # Root app layout
├── globals.css             # Tailwind imports & semantic tokens
└── page.tsx                # Root redirect
components/
├── auth/                   # Auth shell, guard, idle timeout, keep-alive
├── layout/                 # Sidebar, top bar, profile card
├── lookup/                 # Status lookup hook
├── registry/               # Wizard inputs, stepper, country select
├── theme/                  # Theme switcher button
└── ui/                     # Shared modal, OTP input
lib/
├── api/                    # API client modules
├── auth/                   # Session persistence (session, profile)
└── countries.ts            # Country codes database
```

---

## Installation

```bash
# Prerequisites: Node.js >=18.18 (Docker image uses Node 20), npm >=9
node -v

git clone https://github.com/your-org/icrcs-frontend.git
cd icrcs-frontend
npm install

cp .env.example .env.local   # then fill in the values (see Environment Variables)
npm run dev                  # http://localhost:3000
```

API base URL is configured in `.env.local` (see `.env.example` for required variables).

For a containerised build/deploy, see **[Docker Deployment](#docker-deployment)** below.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Scope | Description |
|---|---|---|
| `BACKEND_API_BASE_URL` | Server (runtime) | Real backend origin the same-origin proxy forwards to, e.g. `http://10.244.0.13:7200/api`. The browser never calls this directly. |
| `NEXT_PUBLIC_API_BASE_URL` | Client (build-time) | What the browser calls — set to `/api/proxy` so requests go through the same-origin proxy (avoids CORS). |
| `NEXT_PUBLIC_AUTH_BYPASS` | Client (build-time) | `"true"` mocks auth/registration (no backend needed); set to `"false"` to hit the real API. |
| `API_BASE_URL` | Server (runtime) | Optional — separate service for the Application-ID email step. Defaults to `BACKEND_API_BASE_URL`. |
| `API_SECRET_KEY` | Server (runtime) | Optional bearer token for the email/back-channel service. |
| `REGISTRATION_EMAIL_PATH` | Server (runtime) | Backend path that emails the Application ID, e.g. `/registration/application-id`. |

> **Build-time vs runtime:** `NEXT_PUBLIC_*` values are **baked into the bundle at `next build`**, so they must be present when the Docker image is built. The non-public vars (`BACKEND_API_BASE_URL`, `API_*`) are read **server-side at runtime** and can be supplied when the container starts.

---

## Docker Deployment

The app ships with a `Dockerfile` (Node 20 Alpine) that builds the Next.js app and serves it with `next start`. The image listens on **port 6060** (`ENV PORT=6060`).

### Image details (per server admin)

| Repo | Image name | Version | Port |
|---|---|---|---|
| **This repo** (citizen portal) | `icrcs-fe-portal` | `v0.0.1` | `6060` |
| CMS (separate repo) | `icrcs-fe-management` | `v0.0.1` | `6060` |

Local registry: **`10.248.0.7:30000`** (alternate: `10.232.0.12:1010`). The registry address is environment-specific — swap it in the tag/push and `insecure-registries` steps below to match your cluster.

### 1. Build the image

`NEXT_PUBLIC_*` vars are baked at build time, so make sure `.env.local` (or build-time env) is present:

```bash
docker build -t icrcs-fe-portal:v0.0.1 .
```

### 2. Run locally

Pass the server-side vars at runtime via `--env-file`:

```bash
docker run --rm -p 6060:6060 --env-file .env.local icrcs-fe-portal:v0.0.1
# → http://localhost:6060
```

### 3. Push to the private registry

The cluster registry runs at `10.248.0.7:30000` over **plain HTTP**, so Docker must be told to treat it as insecure (one-time setup):

```bash
# /etc/docker/daemon.json
{ "insecure-registries": ["10.248.0.7:30000"] }
```

```bash
sudo systemctl restart docker          # apply the daemon change

docker tag icrcs-fe-portal:v0.0.1 10.248.0.7:30000/icrcs-fe-portal:v0.0.1
docker push 10.248.0.7:30000/icrcs-fe-portal:v0.0.1
```

> Without the `insecure-registries` entry the push fails with
> `http: server gave HTTP response to HTTPS client`.

### 4. Deploy

The admin deploys the pushed image and exposes the browser-facing port. The backend (`BACKEND_API_BASE_URL`) and registry live inside the cluster network (e.g. `10.244.0.x` / `10.248.0.x` / `10.232.0.x`). When deploying, inject the server-side env vars (`BACKEND_API_BASE_URL`, `API_*`, `REGISTRATION_EMAIL_PATH`) into the container/Deployment; the container serves on port `6060`.

> **Changing the backend URL does not require a rebuild.** `BACKEND_API_BASE_URL` is read server-side at runtime, so update the Deployment env (or `--env-file`) and restart the container. Only `NEXT_PUBLIC_*` changes need a rebuild.

---

## Recent Changes

* **9-stage registration flow** wired to the real backend (POST to create, PUT to edit each stage); see the wizard table above.
* **Resilient Stage 1 photo upload** — text data is submitted first to obtain the `subjectId`, then the passport photo is uploaded; a network failure is non-fatal and **retried at the Stage 8 gate** (matching the backend's "passport photo mandatory" validation) with no data loss.
* **Draft persistence by Application ID** — unsubmitted registrations are cached and **survive logout / idle auto-logout**, owner-scoped and cleared cross-user on login, so users resume exactly where they left off.
* **Dynamic repeaters** — schools (Stage 4), spouses & relatives (Stage 6) with min-count validation; **document uploads** for parents/contacts/spouses/relatives (`attachmentTypeId=12`).
* **Country-driven address cascades** — single lookup-connected country picker with flags; Region/District/Ward show for Tanzania and hide (free-text City/Village) for other countries.
* **Profile sync across devices** — profile/photo re-fetched on load; same-origin proxy made binary-safe so profile photos load through it.
* **Light-mode-only institutional theme** with the official banner (coat of arms · ministry titles + flag strip · emblem), enlarged for legibility on both the auth and dashboard bars.
* **Dockerised** as `icrcs-fe-portal:v0.0.1` on **port 6060**, pushed to the private cluster registry (see [Docker Deployment](#docker-deployment)).

---

## Development Status

| Feature | Status |
|---|---|
| Authentication (Login, Register, OTP) | ✅ Done |
| Password Reset Flow | ✅ Done |
| Session Keep-Alive & Token Refresh | ✅ Done |
| Idle Timeout & Auto-Logout (30min) | ✅ Done |
| Auth Guard (Protected Routes) | ✅ Done |
| Institutional Branding & Header | ✅ Done |
| Dashboard (Hero, Checklist, Requirements) | ✅ Done |
| Registration Wizard (9 Stages, Backend Sync) | ✅ Done |
| Citizenship Gate (Non-Citizen Permit Check & Minor Registration) | ✅ Done |
| Application ID Generation & Email | ✅ Done |
| Save & Exit / Resume Registration | ✅ Done |
| Self vs Dependent Registration | ✅ Done |
| Document Attachments (Upload, Preview, Remove) | ✅ Done |
| Preview & Declaration (Legal Agreement) | ✅ Done |
| Application Status Tracker (6-Stage Pipeline) | ✅ Done |
| Public Status Check (No Login Required) | ✅ Done |
| Incomplete Registration Detection & Resume | ✅ Done |
| Registered People Dashboard | ✅ Done |
| Printable A4 Registration Form (PDF/Print) | ✅ Done |
| Profile Management (Photo, Details) | ✅ Done |
| Language Support (English / Swahili) | ✅ Done |
| Dark & Light Theme Toggle | ✅ Done |
| Sidebar Navigation & Layout | ✅ Done |
| Ward Cascade Selectors (Region → District → Ward) | ✅ Done |
| Country Selector & Phone Input | ✅ Done |
| Auto-Scrolling Info Cards (Auth Pages) | ✅ Done |

---

## State Management Implementation

The application uses a **layered, framework-agnostic state management strategy** without external state libraries (no Redux, Zustand, Jotai, etc.). All state is managed through a combination of **browser `localStorage` for persistence**, **React Context for cross-component sharing**, **component-level `useState` for UI state**, and **module-level caching for API data**.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Root Layout (app/layout.tsx)                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ThemeProvider │  │LocaleProvider│  │ SessionKeepAlive     │    │
│  │(light-only) │  │(Context)     │  │ + IdleLogout          │    │
│  └─────────────┘  └──────────────┘  └──────────────────────┘    │
│                          │                    │                   │
│                    useI18n()          loadSession()/saveSession() │
│                          │                    │                   │
│  ┌───────────────────────┴────────────────────┴──────────────┐   │
│  │                    Page Components                         │   │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐   │   │
│  │  │LoginForm │  │ProfileFlow│  │RegistryClient         │   │   │
│  │  │(useState)│  │(useState) │  │  └─RegistryWizard     │   │   │
│  │  └──────────┘  └───────────┘  │     └─WizardProvider  │   │   │
│  │                                │       (Context)       │   │   │
│  │                                └───────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          │                                        │
│  ┌───────────────────────┴────────────────────────────────────┐   │
│  │                  localStorage Layer                         │   │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ │   │
│  │  │icrcs-      │ │icrcs-      │ │icrcs-    │ │icrcs-     │ │   │
│  │  │session     │ │profile     │ │registra- │ │people     │ │   │
│  │  │(tokens)    │ │(user data) │ │tion      │ │(submitted)│ │   │
│  │  └────────────┘ └────────────┘ │(draft)   │ └───────────┘ │   │
│  │  ┌────────────┐                └──────────┘                │   │
│  │  │icrcs-locale│                                            │   │
│  │  └────────────┘                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          │                                        │
│  ┌───────────────────────┴────────────────────────────────────┐   │
│  │               Module-Level API Cache                        │   │
│  │  cache: Map<path, Promise<LookupItem[]>>  (lib/api/lookup)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1. Persistent State — `localStorage` Stores

All persistent client-side state is serialized to `localStorage` via thin read/write/clear modules. Each store has a dedicated key and **guards against SSR** with `typeof window === "undefined"` checks.

| Store | Key | Module | Shape | Purpose |
|---|---|---|---|---|
| **Session** | `icrcs-session` | `lib/auth/session.ts` | `{ accessToken, refreshToken }` | JWT tokens from login; read on every API call and by `AuthGuard`. |
| **Profile** | `icrcs-profile` | `lib/auth/profile.ts` | `{ profileId, firstName, middleName, lastName, gender, phoneNumber, email, profilePictureUrl }` | Account holder's identity; prefills and locks wizard fields. |
| **Profile Photo** | `icrcs-profile-photo:<identity>` | `lib/auth/profile.ts` | `{ url, dataUrl }` | Per-user cached photo data URL; self-invalidates when backend URL changes. Survives logout. |
| **Registration Draft** | `icrcs-registration` | `app/registry/registrationStore.ts` | `{ step, maxStep, completed, applicationId, ownerId, subjectId, submittedStages[], data }` | Single in-progress wizard draft; survives logout and idle auto-logout. Owner-scoped. |
| **People** | `icrcs-people` | `app/registry/peopleStore.ts` | `Person[]` with `{ applicationId, submittedDate, name, isCreator, status, step, data }` | Everyone registered under the account; drives the "Registered People" dashboard. |
| **Locale** | `icrcs-locale` | `app/i18n/localeProvider.tsx` | `"en" \| "sw"` | User's language preference; hydrated post-mount to avoid SSR mismatch. |
| **Last Activity** | `icrcs-last-activity` | `components/auth/idleLogout.tsx` | Unix timestamp (ms) | Tracks last interaction for idle timeout; throttled writes (5s). |

#### Store Lifecycle Rules

* **Session & Profile** — Written on login (`saveSession`, `saveProfile`); cleared on logout and idle auto-logout (`clearSession`, `clearProfile`).
* **Registration Draft** — Written on every wizard "Next" and "Save & Exit"; cleared when a new registration starts (`clearRegistration`) or when cross-user login detects a foreign draft. **Intentionally survives logout** so in-progress work is never lost.
* **People** — Upserted on each wizard stage submission and on final completion; cleared on logout / idle logout (but not the draft).
* **Photo Cache** — Keyed per-user identity (email or profileId); survives logout so the avatar is restored on next sign-in.
* **Locale** — Persisted on language switch; hydrated in a `useEffect` to avoid SSR/client hydration mismatch.

#### Owner-Scoping & Cross-User Isolation

```typescript
// On login, stale drafts from a previous user are dropped:
const draft = loadRegistration();
if (draft && (draft.ownerId ?? "") !== (profile.profileId ?? "")) {
  clearRegistration();
  clearPeople();
}
```

The `loadRegistrationFor(ownerId, subjectId?)` function enforces owner-scoping — it returns `null` when the stored draft belongs to a different user or a different registration.

---

### 2. React Contexts

Three React Contexts provide cross-component state sharing. None use global stores — they are **scoped to their provider trees**.

#### `LocaleContext` — Internationalization

| Property | Type | Description |
|---|---|---|
| `locale` | `"en" \| "sw"` | Active language |
| `setLocale` | `(locale) => void` | Switch language + persist to `localStorage` |
| `t` | `(path: string) => string` | Dot-path translation resolver (700+ keys) |

**Provider:** `LocaleProvider` in `app/layout.tsx` (wraps entire app).
**Consumer hook:** `useI18n()` — throws if used outside provider.
**Hydration strategy:** Renders with `DEFAULT_LOCALE` ("en") on SSR; reads `localStorage` in a `useEffect` post-mount to avoid hydration mismatch. Also syncs `<html lang>`.

#### `WizardContext` — Registration Form State

| Property | Type | Description |
|---|---|---|
| `data` | `Record<string, string \| boolean>` | All form field values (flat key-value map) |
| `set` | `(name, value) => void` | Update a field and clear its error |
| `errors` | `string[]` | Field names currently in error |
| `locked` | `string[]` | Field names that are read-only (prefilled from profile) |
| `isFirstPerson` | `boolean` | True when registering the account holder (not a dependent) |
| `onGoToStep` | `(step: number) => void` | Navigate to a completed step (used by Preview) |

**Provider:** `WizardProvider` in `components/registry/field.tsx` — instantiated in `RegistryWizard` (wraps each step) and `CitizenshipGate` (wraps the foreigner verification fields).
**Consumer hook:** `useWizard()` — throws if used outside provider.
**Data shape:** A flat `Record<string, string | boolean>` rather than nested objects. Field names like `applicantFirst`, `fatherPobCountry`, `ec1ResWard`, `sp2Gender`, `ch3NatCountry` encode both the entity and the attribute. This keeps the context API simple — every form input calls `set(fieldName, value)`.

#### `ThemeProvider` — Theme (Light-Only)

A minimal provider that guarantees light mode by removing any persisted `dark` class and the `icrcs-theme` localStorage key. The `themeNoFlashScript` is a render-blocking inline script that strips `dark` before first paint.

---

### 3. Component-Level State (`useState`)

Each page/component manages its own ephemeral UI state via `useState`. No lifting beyond what's necessary. Key patterns:

#### Registration Orchestrator — `RegistryClient`

```
mode: "landing" | "gate" | "wizard" | "success"   — current screen
registeringMinor: boolean                          — foreign profile's minor flow
submission: { id, date, data } | null              — completed registration
selfDone: boolean                                  — account holder's own registration exists
hasIncomplete: boolean                             — a draft is in progress
```

Drives the top-level screen routing: Landing → CitizenshipGate → RegistryWizard → RegistrySuccess. The `selfDone` and `hasIncomplete` flags are derived from **both** localStorage (synchronous, instant) and the backend API (async, authoritative), merged in a `useEffect`.

#### Registration Wizard — `RegistryWizard`

The most state-heavy component, managing the 9-step form:

| State | Type | Purpose |
|---|---|---|
| `step` | `number` | Current wizard step (1–9) |
| `maxStep` | `number` | Furthest step ever reached (drives sidebar navigation) |
| `data` | `Record<string, string \| boolean>` | All field values across all 9 steps (single flat map) |
| `errors` | `string[]` | Field names failing validation on the current step |
| `formError` | `string` | Human-readable error message |
| `missingLabels` | `string[]` | Translated labels of missing required fields |
| `applicationId` | `string` | Issued after Stage 1 (backend) |
| `subjectId` | `string` | Backend registration ID (used for Stages 2–9) |
| `submittedStages` | `Set<number>` | Stages already POSTed (revisits use PUT) |
| `returnStep` | `number \| null` | Step to return to after editing an earlier stage |
| `submitting` | `boolean` | Async submission in progress |
| `locked` | `string[]` | Derived: fields locked from the profile |

**Initialization from draft:** On mount, the wizard reads the saved draft via `loadRegistrationFor(ownerId)` and restores `step`, `maxStep`, `data`, `subjectId`, and `submittedStages`. Profile fields are prefilled as a base layer, then draft data is merged on top.

**Save on every transition:** Every "Next" click persists the full state to `localStorage` via `saveRegistration(...)` — so progress survives a browser crash, tab close, or idle auto-logout.

#### Login Form — `LoginForm`

```
email, password, showPassword, errors, loginError, submitting
```

On successful login: `saveSession(tokens)` → `saveProfile(profile)` → cross-user draft cleanup → redirect to `/dashboard`.

#### Profile Creation — `CreateProfileFlow`

```
step: 1 | 2        — Details → OTP
details             — form data carried between steps
preAuthToken        — backend pre-auth token for OTP verification
```

Two-step flow (Details → OTP) with state lifted to the parent so Step 2 can reference the email from Step 1.

#### Citizenship Gate — `CitizenshipGate`

```
choice: "yes" | "no" | ""    — citizen or foreigner
data                          — foreigner verification fields (via WizardProvider)
status: "idle" | "verifying" | "notfound" | "found"
details: ForeignerDetails | null
hasMinor: "yes" | "no" | ""
```

Manages the foreigner permit-verification flow with its own mini-state machine.

---

### 4. API-Layer Module Cache — Lookup Data

The lookup service (`lib/api/lookup.ts`) uses a **module-level `Map` cache** for reference data:

```typescript
const cache = new Map<string, Promise<LookupItem[]>>();
```

* **Keyed by request path** (e.g., `/lookup/regions/1`, `/lookup/wards/42`).
* **Caches the in-flight `Promise`**, not the resolved value — so concurrent requests for the same data share one network call.
* **Failure clears the cache entry** (`cache.delete(path)`) to allow a retry on the next request.
* **Lifetime:** Per page session — the cache resets on full page reload but persists across client-side navigations.

The `useLookup` hook (`components/lookup/useLookup.ts`) wraps these cached loaders with React-friendly `{ options, loading, error }` state and re-fetches when dependency arrays change (e.g., when a parent cascade value is selected).

---

### 5. Session & Token Management

#### Proactive Keep-Alive — `SessionKeepAlive`

A headless component (`components/auth/sessionKeepAlive.tsx`) mounted at the root layout that:

* Refreshes the access token every **4 minutes** via `refresh(refreshToken)`.
* Re-refreshes immediately when the tab becomes visible after being backgrounded.
* On a **401/403** refresh failure, clears the session (forces re-login); transient errors are silently retried.

#### Idle Timeout — `IdleLogout`

A headless component (`components/auth/idleLogout.tsx`) that:

* Tracks user activity (mouse, keyboard, scroll, touch) via DOM event listeners.
* After **30 minutes** of inactivity, shows a modal warning with a **60-second countdown**.
* If the user clicks "Stay Logged In", the timer resets; otherwise, auto-logout fires.
* Activity timestamps are written to `localStorage` (`icrcs-last-activity`), throttled to every 5s.
* On tab re-focus (`visibilitychange`), re-checks elapsed idle time — so a tab backgrounded for 31 minutes triggers the warning immediately on return.

#### Auth Guard — `AuthGuard`

A wrapper component (`components/auth/authGuard.tsx`) that:

* Checks `loadSession()` on every pathname change.
* Redirects to `/login` if no session exists.
* Listens for `StorageEvent` on `icrcs-session` — if another tab clears the session (logout), all tabs redirect simultaneously.
* Renders a loading spinner while checking, so protected content never flashes.

---

### 6. Cross-Tab & Cross-Device Synchronization

| Mechanism | Scope | Detail |
|---|---|---|
| **`StorageEvent` listener** | Cross-tab (same browser) | `AuthGuard` watches for `icrcs-session` removal — logout in one tab forces all tabs to `/login`. |
| **`icrcs-last-activity` in localStorage** | Cross-tab (same browser) | `IdleLogout` shares the activity timestamp so only one timer runs across tabs; an active tab keeps all tabs alive. |
| **Backend progress sync** | Cross-device | `RegistryClient` calls `getRegisteredPeople()` on mount and reconciles: if the backend is ahead of the local draft (e.g., a stage submitted on another device), the local draft is advanced; if the backend considers a registration complete, the stale local draft is cleared. |

---

### 7. Data Flow Summary — Registration Lifecycle

```
1. LOGIN
   └─ saveSession(tokens) → saveProfile(profile) → clear foreign drafts

2. WIZARD OPEN (RegistryClient mount)
   ├─ loadPeople() → selfDone?       ← localStorage (synchronous)
   ├─ loadRegistrationFor(ownerId) → hasIncomplete?  ← localStorage
   └─ getRegisteredPeople() → reconcile with backend  ← API (async)

3. WIZARD STEP N (RegistryWizard)
   ├─ User fills fields → set(name, value) → setData(...)  ← useState
   ├─ "Next" click:
   │   ├─ Validate required fields (missingFields())
   │   ├─ Submit to backend (submitStageN / editStageN)
   │   ├─ submittedStages.add(N)
   │   ├─ saveRegistration({ step: N+1, data, subjectId, ... })  → localStorage
   │   └─ upsertPerson({ applicationId, status: "in_progress" }) → localStorage
   └─ "Save & Exit":
       └─ saveRegistration({ step: N, data, ... }) → localStorage → /dashboard

4. FINAL SUBMIT (Stage 9)
   ├─ submitStage9(subjectId)  → backend
   ├─ saveRegistration({ completed: true }) → localStorage
   ├─ addPerson({ status: "submitted" })    → localStorage
   └─ setMode("success") → RegistrySuccess screen

5. IDLE TIMEOUT / LOGOUT
   ├─ clearSession() → clearProfile() → clearPeople()
   └─ Registration draft intentionally NOT cleared (survives for resume)
```

---

### Design Rationale

| Decision | Rationale |
|---|---|
| **No Redux / Zustand** | The app has clear page-scoped state boundaries. A global store would add complexity with no benefit — Context + localStorage covers all sharing needs. |
| **Flat `Record<string, Value>` for wizard data** | With 100+ fields across 9 steps, a flat map with prefixed keys (`ec1ResWard`, `sp2Gender`) is simpler than deeply nested objects and trivially serializable. |
| **localStorage over IndexedDB** | All persisted data is small JSON. localStorage is synchronous (critical for SSR guards and auth checks) and universally supported. |
| **Draft survives logout** | A user who is auto-logged-out after 30 minutes of inactivity (e.g., answering the door) should not lose 8 stages of entered data. The draft is owner-scoped and cleaned up on cross-user login. |
| **Module-level cache for lookups** | Geographic cascade data (territories, regions, districts, wards, streets) can be hundreds of items. Caching the Promise (not just the result) deduplicates concurrent requests without any state management library. |
| **WizardContext for form fields** | Deeply nested step components (field → section → step → wizard) need access to the data map and error list. Context avoids 4+ levels of prop drilling while keeping the provider scope narrow (only the wizard). |

---

## API Consumption

The frontend communicates with two backend services via a **same-origin proxy** pattern. All network calls are routed through Next.js API route handlers, so the browser never makes cross-origin requests (no CORS configuration required).

### Architecture — Same-Origin Proxy

```
 Browser                         Next.js Server                        Backend
┌──────────┐  /api/proxy/...   ┌──────────────────┐   BACKEND_API_..  ┌──────────┐
│  Client  │ ────────────────► │ app/api/proxy/    │ ────────────────► │ Main API │
│  Code    │ ◄──────────────── │ [...path]/route.ts│ ◄──────────────── │ (Spring) │
│          │                   │                   │                   └──────────┘
│ fetch()  │                   │   routing:        │   LOOKUP_API_..   ┌──────────┐
│ via      │                   │   /lookup/*  ──────────────────────► │ Lookup   │
│ apiGet() │                   │   /v1/*     → BACKEND                │ Service  │
│ apiPost()│                   │                   │                   └──────────┘
└──────────┘                   └──────────────────┘
```

**Key design decisions:**

* **`NEXT_PUBLIC_API_BASE_URL`** is set to `/api/proxy` — the browser calls the same origin.
* **`BACKEND_API_BASE_URL`** is a **server-side runtime** variable — changing the backend URL doesn't require a rebuild.
* **`LOOKUP_API_BASE_URL`** (optional) separates the Lookup microservice; paths starting with `/lookup/` are routed there, everything else goes to the main backend.
* The proxy relays **Authorization headers**, forces `Content-Type: application/json` for non-multipart requests, and handles **binary responses** (e.g., profile photos) without corruption.
* **Idempotent retries:** GET/HEAD requests are retried up to 3 times on network failure (250ms backoff); POST/PUT are never retried to avoid duplicate writes.
* **Request logging:** Every proxied request is logged to the terminal with method, path, redacted body, status, and duration.

---

### HTTP Client Layer — `lib/api/client.ts`

A thin wrapper around the native `fetch` API providing typed, consistent request functions:

| Function | Method | Body | Use Case |
|---|---|---|---|
| `apiGet<T>(path, token?)` | GET | — | Read resources, lookup lists |
| `apiPost<T>(path, body, token?)` | POST | JSON | Create resources, login, submit stages |
| `apiPut<T>(path, body, token?)` | PUT | JSON | Edit submitted stages |
| `apiDelete<T>(path, token?)` | DELETE | — | Remove profile photo |
| `apiUpload<T>(path, form, token?)` | POST | FormData | File uploads (multipart) |

**Error handling:**

```
fetch() → res.json() → if (!res.ok) throw new ApiError(status, message, data)
```

* `ApiError` carries the HTTP `status`, a human-readable `message` (extracted from `{ message }` or `{ error }` in the response), and the raw `data` payload.
* `getErrorMessage(err, fallback)` filters out technical/infrastructure errors (gateway timeouts, `ETIMEDOUT`, `fetch failed`, 502/503/504) and returns the user-friendly `fallback` string instead.

---

### Auth Token Lifecycle — `withFreshAuth`

All authenticated API calls are wrapped in `withFreshAuth`, which implements a **transparent single-retry token refresh**:

```
1. Call the API with the current accessToken from localStorage
2. If 401/403 → read refreshToken from localStorage
3. POST /v1/auth/refresh → get new tokens → saveSession()
4. Retry the original call with the fresh accessToken
5. If refresh also fails → clearSession() → throw SessionExpiredError
```

**Special case:** A 403 response that carries a structured `errorCode` (e.g., `REGISTRATION_PARENT_NOT_APPROVED`) is treated as a **business-rule rejection**, not an expired session — it surfaces the backend's error message directly instead of masking it behind a "session expired" redirect.

---

### API Modules

The frontend organizes backend communication into 6 focused modules:

#### 1. `lib/api/auth.ts` — Authentication & Profile

| Function | Endpoint | Purpose |
|---|---|---|
| `register(payload)` | `POST /v1/auth/register` | Create account + trigger email OTP |
| `resendOtp(email)` | `POST /v1/auth/resend-otp` | Re-send verification code |
| `verifyOtp(code, preAuthToken)` | `POST /v1/auth/verify-otp` | Confirm OTP → session tokens |
| `login(identifier, password)` | `POST /v1/auth/login` | Sign in → session tokens |
| `refresh(refreshToken)` | `POST /v1/auth/refresh` | Rotate access token |
| `logout(refreshToken)` | `POST /v1/auth/logout` | Invalidate refresh token |
| `forgotPassword(identifier)` | `POST /v1/auth/forgot-password` | Step 1: send reset OTP |
| `verifyResetOtp(profileId, code)` | `POST /v1/auth/verify-reset-otp` | Step 2: confirm reset code |
| `resetPassword(profileId, pw, confirm)` | `POST /v1/auth/reset-password` | Step 3: set new password |
| `getMyProfile(accessToken)` | `GET /v1/profile/me` | Fetch full profile |
| `refreshMyProfile()` | `GET /v1/profile/me` | Re-fetch with auto token refresh |
| `updateProfile(input)` | `PUT /v1/profile/update` | Update name, gender, phone |
| `uploadProfilePicture(file)` | `POST /v1/profile/picture` | Multipart photo upload |
| `deleteProfilePicture()` | `DELETE /v1/profile/picture` | Remove photo |
| `fetchProfilePicture(path)` | `GET /api/proxy/<path>` | Fetch photo bytes → data URL |

**Token normalization:** The `normalizeTokens` function uses a `deepFindString` utility that searches arbitrary nesting (`{ data: { tokens: { accessToken } } }`) for token keys, tolerating both camelCase and snake_case — making the frontend resilient to backend response shape variations.

**Gender resolution:** Gender values are converted at the fetch boundary — the app uses `M/F/O` codes internally, but the backend expects numeric lookup IDs. `resolveGenderId` / `resolveGenderCode` translate in both directions.

#### 2. `lib/api/registration.ts` — 9-Stage Registration

Each stage has a `submitStageN` (POST) and `editStageN` (PUT) function pair:

| Stage | Endpoint | Domestic/Foreign Split | Payload Builder |
|---|---|---|---|
| **1** | `/v1/registration/stage1/{domestic\|foreign}` | By birth country | `buildStage1Payload` |
| **1.5** | `/v1/registration/{id}/naturalization` | — | Conditional (cert no.) |
| **2** | `/v1/registration/{id}/stage2/{domestic\|foreign}` | By permanent address | `buildStage2Payload` |
| **3** | `/v1/registration/{id}/stage3/{domestic\|foreign}` | By parents' residence | `buildStage3Payload` |
| **4** | `/v1/registration/{id}/stage4` | — | `buildStage4Payload` |
| **5** | `/v1/registration/{id}/stage5/{domestic\|foreign}` | By contacts' residence | `buildStage5Payload` |
| **6** | `/v1/registration/{id}/stage6/{domestic\|foreign}` | By family residence | `buildStage6Payload` |
| **7** | `/v1/registration/{id}/stage7` | — (GET only) | None (print-only) |
| **8** | `/v1/registration/{id}/stage8` | — | `buildStage8Payload` |
| **9** | `/v1/registration/{id}/stage9?confirmed=true` | — | Empty body |
| **Review** | `/v1/registration/{id}/review` | — (GET) | None — compiled summary for Preview & PDF |

**Domestic/Foreign routing:** Stages 1, 2, 3, 5, and 6 split into `/domestic` or `/foreign` variants based on whether any person in that stage resides outside Tanzania. The `isTanzania()` helper and `peopleSuffix()` function determine the suffix. There is no bare endpoint (e.g., no `/stage1` without a suffix).

**Payload transformation layer:** Each `buildStageNPayload` function transforms the flat wizard data map into the backend's nested JSON structure, resolving:
* Country names → ISO alpha-3 codes (via lookup API + local fallback)
* Gender codes (`M/F/O`) → numeric lookup IDs
* Marital status enums → numeric lookup IDs
* Employment status names → numeric lookup IDs
* Phone numbers → E.164 format (stripping spaces and leading zeros)
* Street/Ward names → numeric cascade IDs

**Stage 1 photo decoupling:** The passport photo upload is intentionally decoupled from Stage 1 submission — Stage 1 JSON is submitted first to obtain the `subjectId`, then the photo is uploaded against that ID. A photo upload failure is non-fatal; the wizard retries at Stage 8.

**Additional registration endpoints:**

| Function | Endpoint | Purpose |
|---|---|---|
| `uploadPassportPhoto(subjectId, dataUrl)` | `POST /v1/files/upload` | Decoupled photo upload |
| `fetchForeignerDetails(input)` | `GET /v1/registration/travel-document?...` | Foreigner permit verification |
| `openRefereesForm(subjectId)` | `GET /v1/registration/{id}/stage7` | Download printable referees form |

#### 3. `lib/api/registry.ts` — Registry Queries

| Function | Endpoint | Purpose |
|---|---|---|
| `getRegisteredPeople()` | `GET /v1/registration/all` | All registrations under the account |
| `getApplicationStatus(id)` | `GET /v1/registration/{id}/status` | Public status lookup (no auth) |

**Response normalization:** Both functions accept arbitrary response shapes (camelCase, snake_case, nested `{ data }` wrappers) via `normalize*` functions that map every known key variant to a stable typed output.

#### 4. `lib/api/files.ts` — File Uploads

| Function | Endpoint | Purpose |
|---|---|---|
| `uploadAttachment(subjectId, typeId, file)` | `POST /v1/files/upload` | Upload any typed attachment |
| `uploadAttachmentDataUrl(subjectId, typeId, dataUrl, name)` | `POST /v1/files/upload` | Upload from data URL (deferred uploads) |

The upload sends a `FormData` with fields `file`, `subjectId`, and `attachmentTypeId`. Returns `UploadedAttachment` metadata (fileId, fileUrl, mimeType, fileSizeBytes, fileHash) used by Stage 8 to register files against the application.

#### 5. `lib/api/lookup.ts` — Reference Data

Two upstream sources, unified under a single module:

| Source | Base Path | Data |
|---|---|---|
| **Lookup Microservice** | `/lookup/*` | Geographic cascade, demographic enums |
| **Main Backend** | `/v1/lookup/*` | Countries, document types, attachment types |

**Geographic cascade:**

```
Territory → Region → District → Ward → Street
  GET /lookup/territories
  GET /lookup/regions/{territoryId}
  GET /lookup/districts/{regionId}
  GET /lookup/wards/by-district/{districtId}
  GET /lookup/streets/{wardId}
  GET /lookup/street-info/{streetId}  (reverse hierarchy)
```

**Demographic enums:**

| Function | Endpoint | Notes |
|---|---|---|
| `getGenders()` | `GET /lookup/genders` | Attaches M/F/O code |
| `getMaritalStatuses()` | `GET /lookup/marital-statuses` | Derives canonical enum (SINGLE, MARRIED, etc.) |
| `getEducationLevels()` | `GET /lookup/educations` | |
| `getOccupations()` | `GET /lookup/occupations` | |
| `getRelationships()` | `GET /lookup/relationships` | |
| `getCitizenshipTypes()` | `GET /lookup/citizenship` | |
| `getEmploymentStatuses()` | `GET /v1/lookup/employment-statuses` | Main backend, not lookup service |
| `getCountries()` | `GET /v1/lookup/countries` | Main backend (has countryId + isoCode) |
| `getDocumentTypes()` | `GET /v1/lookup/document-types` | |
| `getAttachmentTypes()` | `GET /v1/lookup/attachment-types` | |

**Caching strategy:** All lookups are cached per session in a module-level `Map<string, Promise<LookupItem[]>>`. The cache stores the **in-flight Promise** (not the resolved value), so concurrent requests share one network call. Failures clear the cache entry to allow retry. See [API-Layer Module Cache](#4-api-layer-module-cache--lookup-data) in State Management above.

**Mock fallbacks:** Every lookup function provides `MOCK_*` arrays as fallbacks — if the backend is unreachable, the UI remains functional with representative data.

#### 6. Server Route Handlers — `app/api/`

| Route | Handler | Purpose |
|---|---|---|
| `app/api/proxy/[...path]/route.ts` | `forward()` | Same-origin proxy to backend (all methods) |
| `app/api/registration/email-id/route.ts` | `POST` | Server-to-server: email Application ID to applicant |

The email handler uses `API_SECRET_KEY` (optional bearer token) for backend-to-backend auth and fails gracefully (the registration flow continues even if the email can't be sent).

---

### Auth Bypass — Offline Development

Setting `NEXT_PUBLIC_AUTH_BYPASS=true` (the default) short-circuits all API calls with mock data and `delay()` simulations. Every API function checks `BYPASS` at the top and returns synthetic responses (`MOCK_TOKENS`, `MOCK_PROFILE`, `MOCK_COUNTRIES`, etc.) — so the full UI works without a running backend.

---

### Error Handling Pipeline

```
Backend → Proxy (502 on network failure)
  → apiGet/Post/Put (throws ApiError)
    → withFreshAuth (retries on 401/403, surfaces business 403s)
      → Component (catches, calls getErrorMessage(err, fallback))
        → UI (shows fallback for infra errors, backend message for business errors)
```

The `getErrorMessage` function filters a regex of technical tokens (`upstream_unreachable`, `fetch failed`, `ETIMEDOUT`, etc.) and gateway status codes (502/503/504), ensuring users never see raw infrastructure error messages.

---

## License

© 2026 United Republic of Tanzania — Immigration Services Department. All rights reserved.

This application is intended exclusively for **authorized users** of the Integrated Citizen Registry and Control System.

---

## Contact

* **Email**: support@immigration.go.tz
* **Phone**: +255-26-2323189
* **Website**: https://www.immigration.go.tz
