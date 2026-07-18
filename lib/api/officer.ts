// Officer (government user) registration API — the officer side of ICRCS.
//
// The SERVER is the single source of truth for an officer's active cases: the
// subjectId is NEVER stored client-side. After login the app calls
// getOfficerCases() (GET /v1/officer/registration/my-cases) to discover every
// case the officer owns (recovered from their JWT), so the flow survives a new
// browser, cleared storage, a different device, or a re-login. Resuming a case
// reads its progress from getOfficerCaseStatus(), not localStorage.
//
// All endpoints live under /v1/officer/** and are protected by the officer token
// (the proxy attaches the icrcs-officer-access cookie for these paths).

import { apiGet } from "./client";

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = Record<string, unknown>;
const obj = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Officer profile ─────────────────────────────────────────────────────────
export type OfficerProfile = {
  userId: string;
  username: string;
  stationId: number;
};

/** GET /v1/officer/profile — the signed-in officer's identity + station. */
export async function getOfficerProfile(): Promise<OfficerProfile> {
  if (BYPASS) {
    await delay(150);
    return { userId: "mock-officer", username: "officer@immigration.go.tz", stationId: 189 };
  }
  const raw = await apiGet<Row>("/v1/officer/profile");
  const d = obj(raw.data ?? raw);
  return {
    userId: str(d.userId ?? d.UserID),
    username: str(d.username ?? d.Username ?? d.Email),
    stationId: num(d.stationId ?? d.StationID),
  };
}

// ── Officer cases (my-cases) ─────────────────────────────────────────────────
export type OfficerCase = {
  subjectId: string;
  fullName: string;
  registrationType: string;
  status: string;
  currentStage: number;
  stationId: number;
  createdAt: string;
};

export type OfficerCasesPage = {
  items: OfficerCase[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** "mine" = only this officer's cases (default); "station" = all cases at the
 * officer's station (supervisor view). */
export type OfficerCaseScope = "mine" | "station";

function normalizeCase(raw: unknown): OfficerCase {
  const d = obj(raw);
  return {
    subjectId: str(d.subjectId ?? d.subject_id ?? d.id),
    fullName: str(d.fullName ?? d.full_name ?? d.name),
    registrationType: str(d.registrationType ?? d.registration_type),
    status: str(d.status),
    currentStage: num(d.currentStage ?? d.current_stage),
    stationId: num(d.stationId ?? d.station_id),
    createdAt: str(d.createdAt ?? d.created_at),
  };
}

/**
 * GET /v1/officer/registration/my-cases — the officer's active registrations.
 * The frontend calls this immediately after every login: it IS the officer's
 * home screen (no case → start new; one → resume; many → pick one).
 * `status` is optional (omit to see all); `scope` defaults to "mine".
 */
export async function getOfficerCases(opts: {
  scope?: OfficerCaseScope;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<OfficerCasesPage> {
  const { scope = "mine", status, page = 0, size = 20 } = opts;
  if (BYPASS) {
    await delay(200);
    return { items: [], page, size, totalElements: 0, totalPages: 0 };
  }
  const qs = new URLSearchParams({ page: String(page), size: String(size), scope });
  if (status) qs.set("status", status);
  const raw = await apiGet<Row>(`/v1/officer/registration/my-cases?${qs.toString()}`);
  const d = obj(raw.data ?? raw);
  const items = Array.isArray(d.items) ? d.items.map(normalizeCase) : [];
  return {
    items,
    page: num(d.page),
    size: num(d.size) || size,
    totalElements: num(d.totalElements),
    totalPages: num(d.totalPages),
  };
}

// ── Resume a specific case ───────────────────────────────────────────────────
export type OfficerCaseStatus = {
  subjectId: string;
  status: string;
  currentStage: number;
};

/**
 * GET /v1/officer/registration/{subjectId}/status — current stage/status for a
 * case, used to resume it at the right form (from the SERVER, not the browser).
 */
export async function getOfficerCaseStatus(subjectId: string): Promise<OfficerCaseStatus> {
  if (BYPASS) {
    await delay(150);
    return { subjectId, status: "PENDING", currentStage: 1 };
  }
  const raw = await apiGet<Row>(
    `/v1/officer/registration/${encodeURIComponent(subjectId)}/status`,
  );
  const d = obj(raw.data ?? raw);
  return {
    subjectId: str(d.subjectId ?? d.subject_id) || subjectId,
    status: str(d.status),
    currentStage: num(d.currentStage ?? d.current_stage),
  };
}
