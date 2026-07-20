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
  stationName: string;
  email: string;
  fullName: string;
  mobileNo: string;
  pfNo: string;
};

/** GET /v1/officer/profile — the signed-in officer's identity + station. */
export async function getOfficerProfile(): Promise<OfficerProfile> {
  if (BYPASS) {
    await delay(150);
    return {
      userId: "mock-officer",
      username: "officer@immigration.go.tz",
      stationId: 189,
      stationName: "HQ",
      email: "officer@immigration.go.tz",
      fullName: "Mock Officer",
      mobileNo: "",
      pfNo: "",
    };
  }
  const raw = await apiGet<Row>("/v1/officer/profile");
  const d = obj(raw.data ?? raw);
  return {
    userId: str(d.userId ?? d.UserID),
    username: str(d.username ?? d.Username ?? d.Email),
    stationId: num(d.stationId ?? d.StationID),
    stationName: str(d.stationName ?? d.StationName),
    email: str(d.email ?? d.Email ?? d.username ?? d.Username),
    fullName: str(d.fullName ?? d.FullName),
    mobileNo: str(d.mobileNo ?? d.MobileNo ?? d.phoneNumber),
    pfNo: str(d.pfNo ?? d.PFNo ?? d.pf_no),
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

// ── Declared registrations (Registered People) ──────────────────────────────

export type DeclaredRegistration = {
  subjectId: string;
  fullName: string;
  registrationType: string;
  status: string;
  nationality: string;
  gender: string;
  dateOfBirth: string;
  createdAt: string;
  officerName: string;
  stationName: string;
};

export type DeclaredPage = {
  items: DeclaredRegistration[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

function normalizeDeclared(raw: unknown): DeclaredRegistration {
  const d = obj(raw);
  return {
    subjectId: str(d.subjectId ?? d.subject_id ?? d.id),
    fullName: str(d.fullName ?? d.full_name ?? d.name),
    registrationType: str(d.registrationType ?? d.registration_type),
    status: str(d.status),
    nationality: str(d.nationality),
    gender: str(d.gender),
    dateOfBirth: str(d.dateOfBirth ?? d.date_of_birth ?? d.dob),
    createdAt: str(d.createdAt ?? d.created_at),
    officerName: str(d.officerName ?? d.officer_name ?? d.registeredBy),
    stationName: str(d.stationName ?? d.station_name),
  };
}

function parseDeclaredPage(raw: unknown, page: number, size: number): DeclaredPage {
  const d = obj(raw);
  // The response may be { data: { items: [...] } } or { items: [...] } or a bare array.
  const inner = obj(d.data ?? d);
  const list = Array.isArray(inner.items ?? inner.content)
    ? (inner.items ?? inner.content)
    : Array.isArray(d.data)
      ? d.data
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
  return {
    items: (list as unknown[]).map(normalizeDeclared),
    page: num(inner.page ?? inner.number) || page,
    size: num(inner.size) || size,
    totalElements: num(inner.totalElements ?? inner.total),
    totalPages: num(inner.totalPages),
  };
}

/**
 * GET /v1/officer/registration/declared/mine — officer's own PENDING_ENROLLMENT
 * registrations (submitted / declared).
 */
export async function getDeclaredMine(opts: {
  page?: number;
  size?: number;
} = {}): Promise<DeclaredPage> {
  const { page = 0, size = 20 } = opts;
  if (BYPASS) {
    await delay(200);
    return { items: [], page, size, totalElements: 0, totalPages: 0 };
  }
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiGet<Row>(`/v1/officer/registration/declared/mine?${qs}`);
  return parseDeclaredPage(raw, page, size);
}

/**
 * GET /v1/officer/registration/declared — all PENDING_ENROLLMENT registrations
 * at the officer's station.
 */
export async function getDeclaredAll(opts: {
  page?: number;
  size?: number;
} = {}): Promise<DeclaredPage> {
  const { page = 0, size = 20 } = opts;
  if (BYPASS) {
    await delay(200);
    return { items: [], page, size, totalElements: 0, totalPages: 0 };
  }
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiGet<Row>(`/v1/officer/registration/declared?${qs}`);
  return parseDeclaredPage(raw, page, size);
}

// ── Declaration review (full applicant data) ────────────────────────────────

/** Full review data returned by GET /v1/officer/registration/{subjectId}/declaration. */
export type DeclarationReview = Record<string, unknown>;

/**
 * GET /v1/officer/registration/{subjectId}/declaration — full review data for a
 * declared registration. No ownership check; any officer can view once the
 * registration reaches stage 9 / declared status.
 */
export async function getDeclaration(subjectId: string): Promise<DeclarationReview> {
  if (BYPASS) {
    await delay(200);
    return {};
  }
  const raw = await apiGet<Row>(
    `/v1/officer/registration/${encodeURIComponent(subjectId)}/declaration`,
  );
  return obj(raw.data ?? raw);
}

// ── Officer form PDFs ────────────────────────────────────────────────────────

/** Fetch a server-rendered PDF as a Blob (officer namespace, so the proxy
 * attaches the officer cookie). Shared by download + print. Null on error. */
async function fetchOfficerPdfBlob(path: string): Promise<Blob | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  try {
    const res = await fetch(`${base}${path}`, {
      credentials: "include",
      headers: { accept: "application/pdf" },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size ? blob : null;
  } catch {
    return null;
  }
}

/** Fetch an officer PDF and trigger a browser download. Uses a data: URL so the
 * download isn't blocked as "insecure" over plain HTTP. Returns false on error. */
async function downloadOfficerPdf(path: string, fileName: string): Promise<boolean> {
  if (BYPASS) {
    await delay(200);
    return true;
  }
  const blob = await fetchOfficerPdfBlob(path);
  if (!blob) return false;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

/** Fetch an officer PDF and open the browser PRINT dialog (hidden same-origin
 * blob: iframe, so contentWindow.print() is permitted). Returns false on error. */
async function printOfficerPdf(path: string): Promise<boolean> {
  if (BYPASS) {
    await delay(200);
    return true;
  }
  const blob = await fetchOfficerPdfBlob(path);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  return new Promise<boolean>((resolve) => {
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 350);
    };
    iframe.onerror = () => resolve(false);
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      URL.revokeObjectURL(url);
      iframe.remove();
    }, 60_000);
  });
}

/** GET /v1/officer/registration/{subjectId}/declaration/pdf — the form PDF for a
 * DECLARED (post-stage-9) registration. Any officer may download it. */
export function downloadOfficerDeclarationPdf(
  subjectId: string,
  fileName = "Registration Form",
): Promise<boolean> {
  return downloadOfficerPdf(
    `/v1/officer/registration/${encodeURIComponent(subjectId)}/declaration/pdf`,
    fileName,
  );
}

/** Open the print dialog for a DECLARED registration's form PDF (declaration/pdf). */
export function printOfficerDeclarationPdf(subjectId: string): Promise<boolean> {
  return printOfficerPdf(
    `/v1/officer/registration/${encodeURIComponent(subjectId)}/declaration/pdf`,
  );
}

/** GET /v1/officer/registration/{subjectId}/stage9/preview/pdf — the form PDF for
 * the officer's OWN pre-declaration (in-progress) registration. */
export function downloadOfficerPreviewPdf(
  subjectId: string,
  fileName = "Registration Form",
): Promise<boolean> {
  return downloadOfficerPdf(
    `/v1/officer/registration/${encodeURIComponent(subjectId)}/stage9/preview/pdf`,
    fileName,
  );
}

