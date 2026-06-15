# ICRCS Tanzania — Technical Implementation Guide

**Integrated Citizen Registry and Control System**  
Immigration Services Department · Ministry of Home Affairs · United Republic of Tanzania

| Document version | 1.2 |
| --- | --- |
| Last updated | June 2026 |
| Repository | `ICRCS` (Next.js frontend) |

---

## 1. Purpose

This guide defines how the ICRCS frontend is built today: the technology choices, application architecture, data flows, and conventions used across authentication, citizen registration, and printable form output. It is intended for developers onboarding to the project and for aligning future backend integration work.

---

## 2. Technology Stack

### 2.1 Current implementation

| Layer | Technology | Rationale |
| --- | --- | --- |
| **Framework** | Next.js 16 (App Router) | File-based routing, Server/Client Components, API routes, built-in image optimisation |
| **Language** | TypeScript 5 (strict) | Type safety across wizard state, API payloads, and store shapes |
| **UI runtime** | React 19 | Concurrent features; pairs with Next.js 16 |
| **Styling** | Tailwind CSS 4 (`@theme`) | Utility-first layout; sovereign design tokens in `app/globals.css` |
| **Fonts** | Montserrat + JetBrains Mono (Google Fonts via `next/font`) | Display/body and monospace (Application ID) |
| **Internationalisation** | Custom `LocaleProvider` + `messages.ts` | English / Swahili without extra dependencies |
| **Forms** | React Context wizard (`WizardProvider`) + controlled inputs | Multi-step registration with per-step validation |
| **Client persistence** | `localStorage` stores | Profile, session, registration draft, registered people, locale, theme |
| **HTTP** | Native `fetch` (`lib/api/client.ts`) | Typed POST/PUT/DELETE/GET/upload helpers with `ApiError` |
| **Backend access** | Same-origin proxy (`/api/proxy/[...path]`) | Browser calls same origin; server forwards to backend (no CORS) |
| **Auth** | Custom OTP flow + token refresh + forgot-password reset | Mock bypass for local dev; real API when configured |
| **Theme** | Custom `ThemeProvider` (`class` strategy) | Light / dark with system preference + `icrcs-theme` persistence |
| **Lookups** | Cascading API lookups (`lib/api/lookup.ts`) | Countries, education levels, region → district → ward |
| **Print / PDF** | Hidden iframe + `registry-print.css` | Official form output without browser URL/title headers |
| **Linting** | ESLint 9 + `eslint-config-next` | Code quality on commit / CI |

### 2.2 Planned / roadmap (concept development plan)

The following items appear in the Tanzania concept development plan but are **not yet adopted** in this repository. They are listed here as the intended direction for later phases.

| Layer | Planned technology | Intended use |
| --- | --- | --- |
| UI components | shadcn/ui + Radix UI | Accessible, composable primitives |
| State management | Zustand + React Query | Global UI state + server-state caching |
| Forms | React Hook Form + Zod | Schema-driven validation for complex wizards |
| Charts / maps | Recharts + react-simple-maps | National KPI heatmaps and dashboards |
| Icons | Lucide React | Consistent icon set |
| Animations | Framer Motion | Step transitions and page motion |
| i18n | next-intl | Locale routing and message catalogs |
| Auth | NextAuth.js v5 | Production-grade session and RBAC |
| HTTP client | Axios + React Query | Retries, interceptors, cache invalidation |
| Testing | Jest + RTL + Playwright | Unit, integration, and E2E coverage |
| Formatting | Prettier | Consistent code style |

When any planned item is introduced, update this table and move it to §2.1.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  Pages (App Router)          │  Client Components               │
│  ─────────────────           │  ──────────────────              │
│  /login                      │  RegistryWizard (6 stages)       │
│  /create-profile             │  CreateProfileFlow (2 steps)     │
│  /forgot                     │  ForgotFlow (OTP reset)          │
│  /dashboard                  │  WizardProvider + field inputs   │
│  /dashboard/profile          │  LocaleProvider (en / sw)        │
│  /registry                   │  ThemeProvider (light / dark)    │
│  /registry/people            │  WardCascade (region/dist/ward)  │
│  /registry/status            │  SessionKeepAlive                │
├─────────────────────────────────────────────────────────────────┤
│  localStorage                                                │
│  icrcs-profile · icrcs-session · icrcs-registration ·        │
│  icrcs-people · icrcs-locale · icrcs-theme                   │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (server)                                 │
│  /api/proxy/[...path]      →  same-origin proxy to backend   │
│  POST /api/registration/email-id  →  backend email dispatch  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ICRCS Backend API (external)                   │
│  /v1/auth/*  ·  staged /registration/*  ·  lookups  ·  profile │
└─────────────────────────────────────────────────────────────────┘
```

**Rendering model**

- **Server Components** — page shells, metadata, layouts (`app/*/page.tsx`).
- **Client Components** — anything interactive (`"use client"`): wizards, forms, i18n, session refresh.
- **API Routes** — server-only secrets (`API_BASE_URL`, `API_SECRET_KEY`) never exposed to the browser.

---

## 4. Repository Structure

```
ICRCS/
├── app/
│   ├── api/proxy/[...path]/         # Same-origin proxy → backend (no CORS)
│   ├── api/registration/email-id/   # Proxy: email Application ID to backend
│   ├── create-profile/              # Account creation + OTP verification
│   ├── forgot/                      # Forgot password: OTP → reset
│   ├── dashboard/                   # Post-login home
│   │   └── profile/                 # View / edit profile + avatar
│   ├── i18n/                        # LocaleProvider, messages (en/sw)
│   ├── theme/                       # ThemeProvider (light / dark)
│   ├── login/                       # Sign-in
│   ├── registry/                    # Citizen registration module
│   │   ├── steps/                   # Wizard step components (1–6)
│   │   ├── status/                  # Application status lookup
│   │   ├── people/                  # Registered people list
│   │   ├── registryWizard.tsx       # 6-stage wizard orchestrator (staged submit)
│   │   ├── registrationStore.ts     # Draft persistence (localStorage)
│   │   ├── printableForm.tsx        # Print-ready HTML form
│   │   └── printRegistrationForm.ts # Iframe print utility
│   ├── globals.css                  # Tailwind v4 theme + print rules
│   └── layout.tsx                   # Root layout, fonts, providers
├── components/
│   ├── auth/                        # Auth shell, carousel, session keep-alive
│   ├── layout/                      # Dashboard topbar, citizen sidebar, profile
│   ├── lookup/                      # useLookup hook (cascading lookups)
│   ├── registry/                    # Fields, stepper, blocks, wardCascade, phone
│   ├── theme/                       # Theme toggle
│   └── ui/                          # Modal, OTP input
├── lib/
│   ├── api/                         # client (POST/PUT/DELETE/GET/upload), auth,
│   │                                #   registration (staged submit), lookup
│   ├── auth/                        # profile + session localStorage
│   └── countries.ts                 # Country list for selects
├── public/
│   ├── logo/                        # Coat of arms, immigration emblem
│   └── registry-print.css           # Standalone print stylesheet
└── docs/
    └── TECHNICAL_IMPLEMENTATION_GUIDE.md   # This document
```

Path alias: `@/*` → project root (`tsconfig.json`).

---

## 5. Application Routes

| Route | Purpose |
| --- | --- |
| `/login` | Email/phone + password sign-in |
| `/create-profile` | New account: personal details → email OTP → session |
| `/forgot` | Forgot password: request OTP → verify → set new password |
| `/dashboard` | Action centre; start registration CTA |
| `/dashboard/profile` | View / edit account holder profile; avatar upload & removal |
| `/registry` | Landing (start / resume / status) + wizard + success |
| `/registry/people` | List of people registered under the account |
| `/registry/status` | Public-style application status lookup |

The root `/` page is still the default Next.js scaffold and is not part of the citizen journey; entry points are `/login` and `/dashboard`.

---

## 6. Authentication

### 6.1 Flow

1. **Register** — `POST /v1/auth/register` with profile + password; backend sends email OTP.
2. **Verify OTP** — `POST /v1/auth/verify-otp`; returns `accessToken` + `refreshToken`.
3. **Login** — `POST /v1/auth/login` with identifier + password.
4. **Refresh** — `POST /v1/auth/refresh` every 10 minutes via `SessionKeepAlive`.
5. **Logout** — `POST /v1/auth/logout` (client clears `icrcs-session`).
6. **Forgot password** (`/forgot`, `lib/api/auth.ts`):
   `forgotPassword(identifier)` → email/SMS OTP → `verifyResetOtp(identifier, otp)` →
   `resetPassword(...)` with a live password-strength checklist before submit.

### 6.2 Development bypass

When `NEXT_PUBLIC_AUTH_BYPASS` is not `"false"`, all auth calls are mocked with a short delay and fixed tokens. This allows full UI development without a running backend.

### 6.3 Session storage

Tokens are stored in `localStorage` under `icrcs-session`. Comments in code note that **httpOnly cookies** should replace this for production hardening.

### 6.4 Profile storage

After OTP verification, the account holder’s name, gender, phone, and email are saved to `icrcs-profile`. The first citizen registration under that account **pre-fills and locks** those personal fields.

### 6.5 Profile management

`/dashboard/profile` (`profileView.tsx`) reads the live profile and supports editing through `lib/api/auth.ts`:

| Function | Endpoint (via proxy) | Purpose |
| --- | --- | --- |
| `getMyProfile(token)` | `GET /v1/auth/me` | Load current account holder |
| `updateProfile(input)` | `PUT` profile | Save edited details |
| `uploadProfilePicture(file)` | multipart upload | Set avatar; returns stored path |
| `deleteProfilePicture()` | `DELETE` | Remove avatar |

The sidebar (`components/layout/sidebarProfile.tsx`) reflects the avatar and name.

---

## 7. Citizen Registration Wizard

### 7.1 Stages

| Step | Title | Key behaviour |
| --- | --- | --- |
| 1 | Personal Information | DOB must be ≥ 18 for account holder; Application ID issued after step 1 |
| 2 | Citizenship & Residence | Permanent address before current; “same as permanent” auto-fill; non-citizens: country-only permanent address |
| 3 | Parents & Emergency Contacts | Father, mother, two emergency contacts |
| 4 | Education and Employment | “Never attended school” checkbox skips school fields; employment on same step |
| 5 | Attachments | PDF upload, commit, preview, list (stored as base64 JSON in wizard data) |
| 6 | Preview and Declaration | Full review with per-section **Edit** rollback; declaration checkbox gates submit |

### 7.2 State management

- **Orchestrator:** `registryWizard.tsx` holds `step`, `data`, `errors`, `applicationId`.
- **Context:** `WizardProvider` (`components/registry/field.tsx`) exposes `data`, `set`, `errors`, `locked`, `isFirstPerson`, `onGoToStep`.
- **Persistence:** `registrationStore.ts` writes draft progress to `icrcs-registration` on each step advance and on “Save & Exit”.
- **Staged submission:** Each step posts its stage to the backend before advancing (`lib/api/registration.ts`):
  - `submitStage1(data, isSelf)` creates the subject and returns a **`subjectId`** (the server record key, distinct from the printed Application ID).
  - `submitStage2..5(subjectId, data)` attach citizenship/residence, parents/contacts, education/employment, and attachments.
  - `submitStage6(subjectId)` is the final declaration and **locks** the registration.
  - Re-entering a previously submitted stage amends it via `editStage1..4` (`PUT .../stageN/edit`) instead of recreating it.
- **Completion:** On final submit, data is saved with `completed: true`, added to `peopleStore`, and success UI offers print/download.

### 7.3 Validation

- Per-step `REQUIRED_FIELDS` arrays in `registryWizard.tsx`.
- Conditional rules: Tanzania-only birthplace fields, non-citizen permanent address, same-as-permanent current address, never-attended-school, account-holder age and employment.
- Field-level error highlighting via `errors` array on input components.

### 7.4 Application ID

- Generated client-side after step 1 (`applicationId.ts`).
- Emailed via `POST /api/registration/email-id` (proxies to backend when `API_BASE_URL` is set).
- Shown in a dialog before continuing the wizard.
- Distinct from the backend **`subjectId`** returned by `submitStage1`; the Application ID is the human-facing tracking number, the `subjectId` keys subsequent stage calls.

### 7.5 Cascading lookups

Reference data is fetched on demand through `lib/api/lookup.ts` and surfaced via the `useLookup` hook (`components/lookup/`) and `WardCascade`:

| Lookup | Function | Depends on |
| --- | --- | --- |
| Countries | `getCountries()` | — |
| Education levels | `getEducationLevels()` | — |
| Regions | `getRegions(countryId)` | country |
| Districts | `getDistricts(regionId)` | region |
| Wards | `getWards(districtId)` | district |

`toOptions(...)` adapts `LookupItem[]` to select options. Selecting a parent resets and reloads its children.

### 7.6 Registration gating

The first person registered under an account is the **profile owner**; everyone after is a **dependent**. Two rules are enforced at the registry landing (`registryClient.tsx` + `registryLanding.tsx`):

1. **Owner first** — a dependent cannot be started until the profile owner's registration is **completed**. `isFirstPerson`/`selfDone` are derived from people with status `submitted` (`peopleStore.isSubmitted`), so until the owner submits, every registration is the owner's. The "start" card reads **Register Yourself** vs **Register a Dependent** accordingly.
2. **One in flight** — a new registration cannot be started while any registration is **incomplete**. When a draft exists (`!completed`), the **Start** card is disabled with a "finish in-progress first" note and only **Resume** is active. `startFresh()` also no-ops if an incomplete draft exists.

### 7.7 People list (in-progress visible)

`peopleStore` entries carry a `status` (`in_progress` | `submitted`) and current `step`. A registrant is **upserted** (`upsertPerson`, keyed by Application ID) from Stage 1 onward — so a person appears on `/registry/people` **even if their registration stalls at any stage**, with an in-progress badge — and is marked `submitted` on declaration. Gating counts (`isSubmitted`) ignore in-progress entries so the rules above stay correct.

---

## 8. Internationalisation

- **Locales:** `en` (default), `sw`.
- **Messages:** `app/i18n/messages.ts` — nested objects, dot-path keys (`t("registry.s1Title")`).
- **Persistence:** `icrcs-locale` in `localStorage`.
- **Switcher:** `LanguageSwitcher` in auth shell and dashboard topbar.
- **HTML `lang`:** Updated when locale changes.

All user-facing registry copy (step titles, validation messages, print labels) should be added to both `en` and `sw` blocks in `messages.ts`.

---

## 9. API Integration

### 9.1 Browser → backend (`lib/api/client.ts`)

All requests target `NEXT_PUBLIC_API_BASE_URL` (default `/api/proxy`, the same-origin proxy):

```ts
apiPost(path, body, token?)    // POST JSON
apiPut(path, body, token?)     // PUT JSON
apiDelete(path, token?)        // DELETE
apiGet(path, token?)           // GET JSON
apiUpload(path, formData, token?)  // multipart (avatars, attachments)
getErrorMessage(err, fallback)     // user-facing message from ApiError
```

All throw `ApiError` with `status` and parsed body on non-2xx responses.

### 9.1a Same-origin proxy (`app/api/proxy/[...path]/route.ts`)

The browser only ever calls the same origin (`/api/proxy/...`), so there is **no CORS**. The server route forwards method, body, content-type, and `Authorization` to `BACKEND_API_BASE_URL` (falling back to `AUTH_API_BASE_URL`) and relays the response. This is the single backend base for auth, registration, profile, and lookups. If the backend base is unset, the route returns a 500 explaining the misconfiguration. Idempotent (GET/HEAD) requests are retried up to 3× with a per-attempt 10s timeout; writes are not retried.

**Terminal logging** — because the proxy runs inside the `next dev` server process, it logs every backend call to the terminal (not the browser console), so backend traffic can be tracked there:

```
[api] →  POST /v1/auth/login {"identifier":"x","password":"***"}      # sent
[api] ✓ 200 POST /v1/auth/login (143ms)
[api]    ↩ {"success":true,"data":{ ... }}                            # retrieved
[api] ✗ 403 POST /v1/registration/<id>/stage4 (88ms)
[api]    ↩ {"success":false,"message":"..."}                          # error body
[api] ✗ NETWORK POST /v1/auth/login — unreachable after 1 attempt(s)  # no upstream
```

Both the **sent** request body and the **retrieved** response body are logged (success and error). Fields matching `password|secret|token|otp` are redacted to `***`, `multipart/form-data` (file uploads) bodies are skipped, and bodies are truncated to keep the terminal readable.

### 9.2 Server → backend (`app/api/registration/email-id/route.ts`)

Forwards Application ID email requests using server-only env:

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Backend origin |
| `API_SECRET_KEY` | Optional Bearer token |
| `REGISTRATION_EMAIL_PATH` | Email endpoint path (default `/registration/application-id`) |

If `API_BASE_URL` is unset, the route returns `{ ok: true, skipped: true }` so local flows continue.

### 9.3 Registration submit (staged)

Registration is submitted to the backend **per stage** rather than as a single payload — see §7.2. `submitStage1` returns the `subjectId` used by stages 2–6; `editStage1..4` amend already-submitted stages. localStorage still holds the working draft so the wizard can resume offline, but the authoritative record is built on the backend as the user advances.

---

## 10. Printable Form & PDF

### 10.1 Components

- `printableForm.tsx` — semantic HTML + CSS class names for the official layout.
- `registry-print.css` — print-only styles loaded in a hidden iframe.
- `printRegistrationForm.ts` — clones `#printable-form`, opens isolated print document with blank title (no browser header/footer URL or page title).

### 10.2 Print behaviour

- **Screen:** `#printable-form` is `display: none`.
- **Print:** Only the printable form is visible; `@page` rules centre page numbers and suppress default header/footer slots where supported.
- **Logos:** `/logo/coatOfArms.png`, `/logo/immigrationEmblem.png`.

Users should disable “Headers and footers” in the browser print dialog if the browser still injects metadata.

---

## 11. Design System

Sovereign palette and typography are defined in `app/globals.css` via Tailwind v4 `@theme`:

| Token | Role |
| --- | --- |
| `navy-700` | Primary brand, headers, banners |
| `gold` / `gold-700` | Accents, form title, Application ID highlight |
| `surface` / `card` / `line` | Backgrounds and borders |
| `success` / `warning` / `danger` | Status and validation |
| `font-display` / `font-sans` | Montserrat |
| `font-mono` | Application ID, codes |

Reusable registry primitives live under `components/registry/`:

- `Field`, `TextInput`, `DateInput`, `Select`, `FileInput`
- `AddressFields`, `NameRow`, option constants in `blocks.tsx`
- `CountrySelect` + `PhoneInput` for enriched inputs
- `WardCascade` — region → district → ward cascading selects
- `Stepper` — vertical progress with back-navigation to completed steps

### 11.1 Light / dark theme

`ThemeProvider` (`app/theme/themeProvider.tsx`) toggles the `dark` class on `<html>` (Tailwind v4 `class` strategy). Initial value comes from `icrcs-theme` in `localStorage`, falling back to the OS `prefers-color-scheme`. `ThemeToggle` (`components/theme/themeToggle.tsx`) switches it from the dashboard topbar / auth shell. Dark variants are expressed with `dark:` utilities against the `@theme` tokens.

---

## 12. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Server-only (email-id proxy)
API_BASE_URL=
API_SECRET_KEY=
REGISTRATION_EMAIL_PATH=/registration/application-id

# Server-only (same-origin proxy target — the real backend base)
BACKEND_API_BASE_URL=https://<backend-host>/api
AUTH_API_BASE_URL=                 # legacy fallback for BACKEND_API_BASE_URL

# Browser → same-origin proxy → backend
NEXT_PUBLIC_API_BASE_URL=/api/proxy
NEXT_PUBLIC_AUTH_BYPASS=false
```

| Variable | Scope | Description |
| --- | --- | --- |
| `API_BASE_URL` | Server | Backend for email-id proxy |
| `API_SECRET_KEY` | Server | Bearer for backend calls |
| `REGISTRATION_EMAIL_PATH` | Server | Email dispatch path |
| `BACKEND_API_BASE_URL` | Server | Backend base the `/api/proxy` route forwards to |
| `AUTH_API_BASE_URL` | Server | Legacy fallback for `BACKEND_API_BASE_URL` |
| `NEXT_PUBLIC_API_BASE_URL` | Client | API base the browser calls (default `/api/proxy`) |
| `NEXT_PUBLIC_AUTH_BYPASS` | Client | `"false"` enables real auth; otherwise mocked |

---

## 13. Local Development

```bash
npm install
cp .env.example .env.local   # configure as needed
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint                 # ESLint
```

**Suggested test path**

1. `/create-profile` — register and verify OTP (bypass mode accepts any OTP).
2. `/dashboard` — start registration.
3. Complete all six wizard steps; print form from success screen.
4. `/registry/people` — confirm registered person appears.

---

## 14. Conventions for Contributors

1. **Next.js docs** — This project uses Next.js 16 with breaking changes vs older versions. Read `node_modules/next/dist/docs/` before changing routing or data APIs.
2. **Client boundary** — Add `"use client"` only where hooks, events, or browser APIs are required.
3. **Wizard fields** — New fields need: step component UI, `REQUIRED_FIELDS` entry (if mandatory), preview row in `stepPreviewDeclaration.tsx`, and printable row in `printableForm.tsx`.
4. **i18n** — Add keys to both `en` and `sw` in `messages.ts`; use `t("registry.*")` in UI.
5. **Stores** — Prefer existing `localStorage` helpers; document keys if adding new ones.
6. **Minimal scope** — Match surrounding patterns; avoid new dependencies without team agreement.

---

## 15. Security & Production Checklist

| Item | Current state | Production target |
| --- | --- | --- |
| Session tokens | `localStorage` | httpOnly secure cookies |
| Registration data | Client-only persistence | Encrypted backend storage |
| Auth | Mock bypass in dev | Real API, rate limiting, OTP expiry |
| File attachments | Base64 in wizard state | Server upload, virus scan, size limits |
| API secrets | Server env only | Secret manager / CI injection |
| HTTPS | Dev HTTP | TLS everywhere |

---

## 16. Document History

| Version | Date | Changes |
| --- | --- | --- |
| 1.2 | June 2026 | Proxy terminal logging of sent/retrieved bodies (redacted, §9.1a); registration gating — owner before dependents and one registration in flight (§7.6); in-progress registrants shown on the people list with status (§7.7) |
| 1.1 | June 2026 | Staged backend registration submit (`submitStage1..6`/`editStageN`); same-origin `/api/proxy` and expanded HTTP client; forgot-password reset; profile management & avatar; cascading region/district/ward lookups; light/dark theme; updated routes, structure, and env vars |
| 1.0 | June 2026 | Initial guide from implemented codebase and concept dev plan |

---

*Immigration Services Department · ICRCS Tanzania · Technical Implementation Guide*
