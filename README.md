# ICRCS — Immigration Central Registration and Citizenship System

Web portal for **Tanzania's Immigration Services Department (TISD)** that provides secure, sovereign digital access to citizen registration, application status tracking, profile management, and document processing under a unified institutional identity.

Built with **Next.js 16** (React 19) and integrated with backend REST APIs. Access is **restricted to registered users** with email-verified accounts.

---

## Overview

Registered users can:

* **Verify Application Status without Logging In** (public status check) via the landing page
* **Create a Verified Profile** with OTP-based email verification
* **Register Themselves and Dependents** (under 18) via a comprehensive 6-step wizard
* **Upload Supporting Documents** (birth certificates, national IDs, and passport photos)
* **Track Application Status** through a 6-stage pipeline (Submitted → Under Review → Biometric Appointment → Final Approval → Completed → Certificate Issued)
* **Download and Print Registration Forms** as formatted A4 PDFs
* **Manage Personal Profile Details** including profile picture uploads
* **Reset Forgotten Passwords** via OTP verification
* **Switch Interface Language** instantly between English and Swahili
* **Toggle Between Light and Dark Themes** seamlessly

---

## Key Features

### Authentication & Security

* **Sovereign Login** — Email and password authentication with secure session management.
* **OTP Verification** — 6-digit code sent during profile creation with a countdown timer and resend capability.
* **Password Strength Validation** — Enforces secure passwords (uppercase, lowercase, digits, special characters).
* **Multi-Step Password Reset** — Identifier entry → OTP verification → secure new password creation.
* **Automatic Keep-Alive** — Proactive token refresh every 4 minutes and tab visibility synchronization.
* **Idle Timeout & Auto-Logout** — 30-minute inactivity detection with a 60-second warning countdown synced cross-tab via `localStorage`.
* **Auth Guards** — Strict protection of internal routes ensuring unauthenticated visitors are redirected to the login screen.

---

### Institutional Branding

* **Official Emblems** — Header features the official Coat of Arms and Immigration Emblem across all pages.
* **National Color Gradients** — Tanzania flag-inspired blue, yellow, green, and black accents.
* **Promotional Hero Section** — Welcoming and patriotic slogans with auto-scrolling "Why ICRCS" info cards on login/signup screens.
* **Professional Typography** — Modern Montserrat and JetBrains Mono fonts for maximum clarity.

---

### Citizen Registration Wizard

A comprehensive **9-stage** registration flow synced with the backend (`/v1/registration/{subjectId}/stageN`). Each stage POSTs to create and PUTs to edit:

| Stage | Section | Details |
| :--- | :--- | :--- |
| **1** | **Personal Information** | Names, gender, DOB (18+ primary / under-18 dependents), citizenship, nationality, place of birth, marital status, contact. Mandatory **passport photo** uploaded to `/v1/files/upload?attachmentTypeId=5` against the new `subjectId`. Non-Tanzania birthplace hides Region/District/Ward and shows free-text City/Village. |
| **2** | **Address** | Permanent + Current address (Country → Region → District → Ward cascade), house number, postal code, with a "same as" checkbox that copies and disables the second address. |
| **3** | **Parents** | Father & Mother sub-forms: full name, DOB, phone, nationality, place of birth, residence, and optional ID document (Type/Number + file upload → `attachmentTypeId=12`, bound to `documentFileUrl`). |
| **4** | **Education & Employment** | Dynamic **school repeater** (Education Level, Year, School Name, District, Index No.), employment status, occupation, employer, NIDA. |
| **5** | **Emergency Contacts** | Two contacts, each a full person sub-form with optional ID document upload. |
| **6** | **Family** | "Have children?" / "Married?" toggles; **Spouses repeater** (≥1 if married) and **Relatives repeater** (≥2), each with optional document uploads. |
| **7** | **Referees** (print-only) | No data submitted — "Download and Print Referees Form" fetches the compiled form from `GET /stage7`; the signed scan is uploaded in Stage 8. |
| **8** | **Uploads** | Structured attachment grid; each file uploaded to `/v1/files/upload?attachmentTypeId=N`, then the collection finalised. Stage 8 is gated on the passport photo — a network failure at Stage 1 is **retried here** without data loss. |
| **9** | **Preview & Declaration** | Server-compiled summary via `GET /stage9/preview`; confirmation checkbox enables final `POST /stage9?confirmed=true`. |

* **Save & Exit / Resume** — Drafts persist in the browser **keyed by Application ID** and **survive logout / idle auto-logout** (owner-scoped, cleared cross-user on login), so an unsubmitted registration can be resumed.
* **Cascading Address Selectors** — Country-driven Region → District → Ward cascade backed by the lookup API; flags on every country dropdown.
* **Locked Fields Logic** — The primary creator's details are locked from their profile; dependents inherit contact details (email/phone) but must fill unique personal details.
* **Resilient photo upload** — Stage 1 text data is saved first; a failed photo upload is non-fatal and retried at the Stage 8 gate.

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

* Lists all registered citizens and dependents associated with the user account.
* Displays crucial metadata: Subject ID, Full Name, Current Status, Stage Label, Email, Phone, and Registration Date.
* **Account Holder Badge** — Easily distinguishes the primary registrant from dependents.
* **Incomplete Resumption** — Clickable links to resume incomplete drafts right where they were left off.

---

### Printable Registration Form

* **A4 Print-Optimized CSS** — Formats the entire 6-step registration summary into a professional document layout.
* **Institutional Branding** — Features official emblems, headers, and signature lines.
* **Download & Print Actions** — Instantly accessible from the submission success page or the dashboard.

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
│   └── steps/              # 6-step wizard step components
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
| Registration Wizard (6 Steps, Backend Sync) | ✅ Done |
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

## License

© 2026 United Republic of Tanzania — Immigration Services Department. All rights reserved.

This application is intended exclusively for **authorized users** of the Integrated Citizen Registry and Control System.

---

## Contact

* **Email**: support@immigration.go.tz
* **Phone**: +255-26-2323189
* **Website**: https://www.immigration.go.tz
