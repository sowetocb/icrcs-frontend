# ICRCS Offline / Edge Deployment — Backend Developer Guide

This guide describes what the **backend team** must provide so ICRCS works at
field offices on a **local Docker LAN without internet**, and still behaves
correctly when uplink to central is intermittent.

It complements:

- `docs/OFFLINE-CONNECTIVITY.md` — frontend checklist (what the portal already does)
- `docs/TECHNICAL_IMPLEMENTATION_GUIDE.md` — full portal architecture

---

## 1. Problem statement

Field offices (immigration stations, border posts) need to register applicants
when:

1. **No public internet** — the site runs entirely on a local LAN (`icrcs-net`).
2. **Unstable uplink** — the local stack stays up, but sync to the national
   central system is intermittent.
3. **Shared workstations** — officers and applicants must not lose in-progress
   work when the browser briefly loses contact with the local API.

The frontend cannot solve this alone. A working offline/edge deployment requires
**both**:

| Layer | Responsibility | Owner |
| --- | --- | --- |
| **Local stack** | FE + BE + DB reachable on the LAN without internet | DevOps + **backend** |
| **Browser resilience** | Draft retention, retry, idempotent resubmit | Frontend (done) |
| **Central sync** | Push accepted registrations upstream when uplink returns | **Backend** (required) |

---

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Field office LAN (icrcs-net)                         │
│                                                                          │
│  Browser ──► Portal FE (icrcs-fe-portal:6060)                           │
│                  │                                                       │
│                  └──► /api/proxy/* ──► Portal API (TBD service:port)    │
│                                              │                           │
│                                              ├──► icrcsdb:1433 (MSSQL)   │
│                                              │     (lookups + local data)│
│                                              │                           │
│                                              └──► [sync job] ──► Central │
│                                                    (when uplink up)      │
│                                                                          │
│  Management FE ──► icrcs-be-management:1010 (separate review/enrollment) │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key principle:** On a fully local stack, **lookups and registration submits
both hit the local portal API**. The browser never needs the public internet.
Only the **backend-to-central sync** needs uplink.

---

## 3. What the frontend already implements

Understanding this avoids duplicating logic on the backend and explains why
certain API contracts are required.

### 3.1 Draft persistence (user-owned data only)

The registration wizard saves **the applicant’s own in-progress input** in a
session cookie (`registrationStore`). This includes:

- Current step, `subjectId`, `applicationId`
- Which stages were already submitted (`submittedStages`)
- Form field values (excluding large blobs — photos are stripped)

**Not persisted in the browser:**

- Lookup/reference tables (countries, wards, attachment types, etc.)
- Cached API responses
- Service-worker offline caches

If lookups fail because the local API is down, the UI may use **small static
fallbacks** (e.g. gender list) but will not cache server reference data.

### 3.2 Connection failure detection

A submit is treated as a **connectivity failure** (queued for retry) when:

- HTTP status **≥ 500** (502/503/504 from the Next.js proxy)
- Error message matches infra patterns: `upstream_unreachable`, `timeout`,
  `failed to fetch`, `econn*`, `etimedout`, etc.

Validation errors (**4xx**) are **not** queued — the user must fix input.

### 3.3 Pending submit queue

On connectivity failure the wizard stores:

```typescript
{
  step: number;           // stage being submitted (1–9)
  idempotencyKey: string; // UUID, stable across retries
  queuedAt: string;       // ISO timestamp
}
```

The form data for that stage stays in the draft. The user sees a banner:
*“Stage N is saved locally and will submit when the connection is back.”*

### 3.4 Auto-retry on reconnect

When `navigator.onLine` goes from `false` → `true`, the wizard automatically
calls `form.requestSubmit()` for the pending stage **after 600 ms**, reusing the
**same `Idempotency-Key`**.

The user does not need to tap Save again.

### 3.5 Idempotency header on writes

All registration **POST** and **PUT** calls from `lib/api/client.ts` attach:

```http
Idempotency-Key: <uuid>
```

The key is:

- Generated once per logical submit attempt
- **Reused** for manual retries and auto-retry of the same pending stage
- Cleared after a successful response

### 3.6 Timeouts and proxy retry

| Hop | Timeout | Retry |
| --- | --- | --- |
| Browser → Next.js proxy | 30 s | No (writes); N/A |
| Next.js proxy → backend | 10 s | **Yes** for GET/HEAD (3 attempts) |
| Next.js proxy → backend | 10 s | **No** for POST/PUT/PATCH/DELETE |

**Implication for backend:** Duplicate protection for writes cannot rely on the
proxy retrying POSTs — it does not. **Idempotency must be enforced in the
portal API.**

---

## 4. Backend deliverables (required)

### 4.1 Confirm portal API on `icrcs-net`

The portal frontend reads the upstream URL at **runtime** via environment
variables (no rebuild needed):

| Variable | Set in | Example |
| --- | --- | --- |
| `PORTAL_BACKEND_URL` | `.env.edge` | `http://icrcs-be-portal:1010/api` |
| `BACKEND_API_BASE_URL` | Docker env | Same as above |
| `LOOKUP_API_BASE_URL` | Optional | Separate lookup host if applicable |

**Action:** Publish the Docker **service name**, **port**, and whether the
base path includes `/api` (the proxy forwards `/{path}` to
`${BACKEND_API_BASE_URL}/{path}`).

Until this is confirmed, edge deploy uses a placeholder and registration
submits will fail with `upstream_unreachable`.

### 4.2 Local database with full lookup seed

The `icrcsdb` container (or equivalent) must contain **all reference data** the
registration wizard needs:

- Countries, regions, districts, wards, streets
- Document types, attachment types, employment statuses
- Borders, camps (migrant flow)
- Any other `/v1/lookup/*` tables

On a fully local stack, **every lookup GET must succeed against the local DB**.
The frontend will not cache these responses offline.

**Action:** Provide a seed/migration package for edge deployments and document
how to refresh lookup data from central when uplink is available (optional but
recommended).

### 4.3 Idempotent stage writes (critical)

Implement **`Idempotency-Key`** handling on all registration stage **POST** and
**PUT** endpoints listed in §5.

#### Expected behaviour

1. **First request** with key `K` → process normally, persist result, return
   success (2xx) with the usual response body.
2. **Duplicate request** with the same key `K` and the **same HTTP method +
   path + subject** → return the **same 2xx response** without creating a
   second registration row, duplicate stage record, or duplicate side effects
   (email, file storage, etc.).
3. **Same key, different payload** → return **409 Conflict** (or 422) with a
   clear error code so the frontend can surface “please contact support” rather
   than silently merging.

#### Storage recommendation

| Field | Purpose |
| --- | --- |
| `idempotency_key` | Client-supplied UUID |
| `subject_id` | Registration scope |
| `stage` | 1–9 |
| `http_method` | POST or PUT |
| `request_hash` | Optional SHA-256 of normalised body |
| `response_status` | Cached status code |
| `response_body` | Cached JSON (or reference) |
| `created_at` / `expires_at` | TTL 24–72 h |

#### Scope

Apply to **both** namespaces:

- `/v1/registration/...` (citizen)
- `/v1/officer/registration/...` (officer registering migrants)

Officer and citizen keys are independent (different auth contexts).

#### Endpoints that must honour the header

See §5 for the full list. Minimum: **every stage POST/PUT** plus file uploads
if they are part of a logical submit (see §6).

### 4.4 Central sync job (backend-owned)

When uplink to the national central system is available, a **backend sync
process** (not the browser) must:

1. Identify registrations in **local-only** or **pending-sync** state.
2. Push them to central with deterministic IDs (`subjectId`, document numbers).
3. Record sync status and last attempt timestamp.
4. Retry with backoff on failure; do not duplicate records in central.

The frontend **does not** implement outbox/sync to central. It only retries the
**current stage submit** to the **local** API.

**Suggested registration states for sync:**

| State | Meaning |
| --- | --- |
| `LOCAL_DRAFT` | Stages saved locally, not yet declared |
| `LOCAL_COMPLETE` | Stage 9 confirmed locally, awaiting sync |
| `SYNC_IN_PROGRESS` | Sync job running |
| `SYNCED` | Present in central |
| `SYNC_FAILED` | Needs operator attention |

Expose sync status via existing status/review endpoints if management needs to
show “not yet in central”.

### 4.5 Stable error responses for infra failures

When the portal API is overloaded or the DB is unreachable, return:

- **503 Service Unavailable** or **502 Bad Gateway** with JSON body
- Avoid ambiguous **401** for infrastructure faults (the frontend treats 401 as
  session expiry and may sign the user out)

The Next.js proxy translates unreachable upstream to:

```json
{ "error": "upstream_unreachable" }
```

with HTTP **502**.

---

## 5. Registration endpoints affected by idempotency

Base paths (citizen / officer):

```
/v1/registration/...
/v1/officer/registration/...
```

### Stage 1 — create / edit

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/stage1/domestic` | First person, Tanzania flow |
| POST | `/stage1/foreign` | First person, foreign flow |
| POST | `/stage1/migrant` | Officer migrant registration |
| PUT | `/{subjectId}/stage1/domestic` | Edit |
| PUT | `/{subjectId}/stage1/foreign` | Edit |
| PUT | `/{subjectId}/stage1/migrant` | Edit |

Stage 1 POST returns `{ subjectId, applicationId, ... }`. **Idempotent replay
must return the same IDs** for the same key.

### Stages 2–6 — per-stage POST/PUT

Paths include domestic/foreign suffixes where applicable, e.g.:

```
POST /{subjectId}/stage2/domestic
PUT  /{subjectId}/stage2/domestic
POST /{subjectId}/stage3/domestic
...
POST /{subjectId}/stage6/...
```

### Stage 7 — read-only in wizard

`GET /{subjectId}/stage7` — printable referees form. No idempotency required
(GET is already retried by the proxy).

### Stage 8 — attachments finalisation

```
POST /{subjectId}/stage8
PUT  /{subjectId}/stage8
```

Payload lists uploaded attachment metadata (`fileUrl`, `attachmentTypeId`, etc.).
Must be idempotent — duplicate submit must not register attachments twice.

### Stage 9 — declaration / submit

```
POST /{subjectId}/stage9?confirmed=true     (citizen — empty body)
POST /{subjectId}/stage9                    (officer — body: { confirmed: true })
```

Final submission. Duplicate key must not create a second declared registration.

---

## 6. File uploads in offline / flaky networks

Attachments are uploaded **before** stage 8 finalisation:

```
POST /v1/files/upload              (citizen)
POST /v1/officer/files/upload      (officer)
```

multipart fields: `file`, `subjectId`, `attachmentTypeId`

**Backend recommendations:**

1. **Optional:** Accept `Idempotency-Key` on upload — if the same key + file
   hash is replayed, return the existing `fileUrl` / `fileId`.
2. Return stable **`fileUrl`** in a shape the frontend can load:
   - `/api/v1/files/view?path=ICRCS-…/5/{uuid}.jpg`, or
   - Absolute URL with `/files/view` path
3. **`GET /v1/files/view?path=…`** must accept **officer** or **citizen** token
   (officers review attachments on `/registry/people` without a citizen session).

Passport photo (attachment type **5**) is often uploaded during stage 1 and
again merged at stage 8. Idempotent stage 1 + upload handling prevents duplicate
files when the user retries after a timeout.

---

## 7. Lookup and read endpoints

These are **not** idempotent writes but must work **entirely offline** against
local DB:

```
GET /v1/lookup/countries
GET /v1/lookup/document-types
GET /v1/lookup/attachment-types
GET /lookup/regions?districtId=…     (lookup microservice, if split)
... cascades: region → district → ward → street
```

Optional lookup microservice: set `LOOKUP_API_BASE_URL` in edge env. If unset,
the proxy routes `/lookup/*` to the main backend.

**Performance:** Lookups are fetched on demand (no browser cache). Slow responses
block the wizard — keep local lookup queries fast (< 500 ms typical).

---

## 8. Authentication at the edge

| Actor | Login | Token cookie | API prefix |
| --- | --- | --- | --- |
| Citizen | `/api/auth/login` | `icrcs-access` | `/v1/registration/*`, `/v1/files/*` |
| Officer | `/api/officer/login` | `icrcs-officer-access` | `/v1/officer/*`, shared `/v1/files/view` |

Tokens are **HttpOnly cookies** — the browser does not send Bearer headers for
normal wizard traffic. The Next.js proxy attaches the correct cookie server-side.

Session refresh endpoints must work on the LAN without central internet unless
you deploy a **local auth issuer** at the edge.

---

## 9. End-to-end flows

### 9.1 Happy path (local LAN, no internet)

1. Operator starts `icrcs-fe-portal` + portal API + `icrcsdb` on `icrcs-net`.
2. Applicant/officer logs in → local auth API.
3. Wizard loads lookups from local DB.
4. Each stage POST/PUT persists to local DB with `Idempotency-Key`.
5. Stage 9 confirms registration locally (`LOCAL_COMPLETE`).
6. Sync job (when implemented) pushes to central later.

### 9.2 Flaky link between browser and local API

1. User submits stage 4 → request times out or 502.
2. Frontend queues `{ step: 4, idempotencyKey: "…" }`, keeps form data.
3. User continues editing or waits — banner shows offline/queued state.
4. Link returns → auto-retry POST/PUT stage 4 with **same key**.
5. Backend recognises key → returns original success (no duplicate stage 4).
6. Frontend clears `pendingSubmit`, advances wizard.

### 9.3 Flaky uplink (local API up, central down)

1. Stages save locally as normal.
2. Sync job fails → registrations stay `SYNC_FAILED` / `LOCAL_COMPLETE`.
3. Frontend is unaffected — user already received 2xx from local API.
4. Sync job retries when uplink returns.

---

## 10. Testing checklist (backend QA)

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | POST stage 1 with `Idempotency-Key: A` twice | Same `subjectId` both times |
| 2 | POST stage 4 with key `B`, then replay after simulated timeout | One stage-4 record |
| 3 | POST stage 4 with key `B`, different body | 409 or 422 |
| 4 | PUT edit stage 2 with same key twice | Single updated record |
| 5 | POST stage 9 twice same key | One declared registration |
| 6 | All `/v1/lookup/*` with LAN-only DB | 200, non-empty lists |
| 7 | API stopped → frontend submit | 502/`upstream_unreachable`; no duplicate after restore + retry |
| 8 | Officer `GET /v1/files/view` with officer cookie | 200 image bytes |
| 9 | Sync job with central down | Local writes still succeed; sync marks pending |

---

## 11. Explicit non-goals (frontend will not do these)

Do **not** expect the browser to:

- Cache lookup tables for offline use
- Queue writes in IndexedDB for later sync to **central**
- Use service workers for API response caching
- Distinguish “LAN offline” vs “central offline” — only “can/can’t reach local API”

Those are **backend / DevOps** concerns except draft retention of the user’s
own form input.

---

## 12. Configuration reference

### Portal edge deploy (DevOps)

```bash
docker network create icrcs-net

cp .env.edge.example .env.edge
# Set PORTAL_BACKEND_URL=http://<portal-service>:<port>/api

docker compose -f docker-compose.edge.yml --env-file .env.edge up -d
```

### Backend env (example)

```env
# Portal API container
DATABASE_URL=Server=icrcsdb,1433;Database=icrcs;...
CENTRAL_SYNC_URL=https://central.example/api/sync
CENTRAL_SYNC_ENABLED=true
IDEMPOTENCY_TTL_HOURS=48
```

---

## 13. Open items / coordination

| Item | Owner | Status |
| --- | --- | --- |
| Portal API Docker service name + port | Backend | **TBD** → set `PORTAL_BACKEND_URL` |
| `Idempotency-Key` on stage POST/PUT | Backend | **Required** |
| Edge DB seed (lookups) | Backend / DBA | **Required** |
| Central sync job | Backend | **Required** |
| Upload idempotency (optional) | Backend | Recommended |
| Management `/api/icrcs/*` → portal API | DevOps | When portal service known |

---

## 14. Related frontend files (for cross-team debugging)

| File | Purpose |
| --- | --- |
| `lib/connectivity/useConnectivity.ts` | Online/offline detection |
| `lib/connectivity/idempotencyKey.ts` | UUID generation |
| `lib/api/client.ts` | Sends `Idempotency-Key`, 30 s timeout, `isConnectionError()` |
| `app/registry/registrationStore.ts` | Draft + `pendingSubmit` persistence |
| `app/registry/registryWizard.tsx` | Queue on failure, auto-retry on reconnect |
| `app/api/proxy/[...path]/route.ts` | GET retry, upstream forwarding |
| `docker-compose.edge.yml` | Edge stack template |
| `.env.edge.example` | Runtime backend URL |

---

## 15. Summary

For offline/edge ICRCS to work:

1. **Run portal API + MSSQL on the LAN** with full lookup seed data.
2. **Implement idempotent stage writes** — the frontend already sends
   `Idempotency-Key` and will auto-retry with the same key after connectivity
   blips.
3. **Implement central sync in the backend** — the frontend only talks to the
   local API.
4. **Publish the portal service URL** for `PORTAL_BACKEND_URL`.

Without (2), auto-retry after a timeout risks **duplicate registrations** or
duplicate stage records. Without (3), edge sites accumulate data that never
reaches central. Without (1) and lookup seed, the wizard cannot function without
internet even if the frontend is deployed correctly.
