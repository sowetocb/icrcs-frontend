# Offline / unstable connectivity — frontend checklist

This document covers what the **ICRCS frontends** must provide so they work on a
local Docker LAN without internet, and still behave well when uplink connectivity
to central is intermittent.

**Backend team:** see **`docs/OFFLINE-BACKEND-GUIDE.md`** for idempotency, local
DB seed, central sync, and API contracts required to support this deployment.

## Stack service names (Docker `icrcs-net`)

| Service | Host:port | Notes |
|---|---|---|
| **Database** | `icrcsdb:1433` | MSSQL — backends connect; frontends do not |
| **Management API** | `icrcs-be-management:1010` | nginx in management FE proxies `/api/*` here |
| **Portal API** | **TBD** | Set `PORTAL_BACKEND_URL` in `.env.edge` |

The local database image holds all reference/lookup data the backends need.
On a fully local stack, **lookups and submits both go to the local APIs** — no
public internet and no browser-side caching of server data.

## Two layers

| Layer | What it solves | Owner |
|---|---|---|
| **Docker stack** | FE + BE + DB on `icrcs-net` | DevOps / backend |
| **Browser resilience** | User keeps work when the link to the local server drops | Frontend |

## Portal edge deploy

```bash
docker network create icrcs-net

cp .env.edge.example .env.edge
# Edit .env.edge — set PORTAL_BACKEND_URL when portal backend is confirmed

docker compose -f docker-compose.edge.yml --env-file .env.edge up -d
```

Optional full-stack profile (includes `icrcsdb` reference container):

```bash
docker compose -f docker-compose.edge.yml --env-file .env.edge --profile full-stack up -d
```

## Browser resilience (portal)

- **Draft persistence** — user's in-progress registration in `registrationStore`
- **Pending submit metadata** — `{ step, idempotencyKey }` on connection failure
- **Auto-retry on reconnect** — when `online` returns, the wizard resubmits the
  pending stage automatically (same idempotency key)
- **Connectivity banner** — offline / restored notice
- **30s client timeout** + proxy GET retry

## Explicitly NOT done (data-sensitivity rule)

- No caching of lookup/reference data in the browser
- No service-worker cache of API responses

## Online ↔ offline (same compose file)

- Internal traffic uses Docker DNS (`icrcsdb`, `icrcs-be-management`, portal BE).
- Only **backend sync to central** needs uplink internet.
- Portal `BACKEND_API_BASE_URL` is **runtime** — change `.env.edge` without rebuild.

## Management portal

- nginx proxies `/api/*` → `http://icrcs-be-management:1010`
- `/api/icrcs/*` (citizen review) → update to portal backend when `PORTAL_BACKEND_URL` is known

## Next steps

1. **Backend team**: confirm portal API Docker service name → set `PORTAL_BACKEND_URL`
   (full spec: `docs/OFFLINE-BACKEND-GUIDE.md`)
2. **Backend**: honour `Idempotency-Key` on registration stage POST/PUT
3. **Backend**: sync job to central when uplink is available
