import { localizeBackendMessage } from "./errorMessagesSw";
import { activeIdempotencyKey } from "@/lib/connectivity/activeIdempotency";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Browser → same-origin proxy timeout. The proxy has its own upstream timeout. */
const CLIENT_FETCH_TIMEOUT_MS = 30_000;

type WriteOptions = {
  /** Reuse across retries of the same logical submit to avoid duplicate writes. */
  idempotencyKey?: string;
};

function writeHeaders(token: string | undefined, options?: WriteOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  } else {
    const scoped = activeIdempotencyKey();
    if (scoped) headers["Idempotency-Key"] = scoped;
  }
  return headers;
}

async function fetchJson(
  input: string,
  init: RequestInit,
): Promise<{ res: Response; data: unknown }> {
  const res = await fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(CLIENT_FETCH_TIMEOUT_MS),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  return { res, data };
}

import {
  getClientCookie,
} from "@/lib/auth/clientCookies";

// The active locale is persisted by the LocaleProvider under this key (session
// cookie). Reading it here lets getErrorMessage() localize backend messages
const LOCALE_STORAGE_KEY = "icrcs-locale";
function activeLocale(): string {
  if (typeof window === "undefined") return "en";
  return getClientCookie(LOCALE_STORAGE_KEY) || "en";
}

// When tokens are stored in HttpOnly cookies (the __httponly__ stub), the
// Authorization header must NOT be sent — the proxy reads from the cookie
// automatically. Real tokens (e.g. the pre-auth token during registration OTP)
// are still passed as Bearer headers.
function authHeaders(token?: string): Record<string, string> {
  if (!token || token === "__httponly__") return {};
  return { Authorization: `Bearer ${token}` };
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const GENERIC_BACKEND_MESSAGES = new Set([
  "An unexpected error occurred",
  "Internal Server Error",
  "Internal server error",
]);

/** Pull user-facing messages out of whatever JSON shape the backend returned. */
function collectMessagesFromBody(body: unknown, depth = 0, out: string[] = []): string[] {
  if (!body || typeof body !== "object" || depth > 3) return out;
  const d = body as Record<string, unknown>;
  for (const key of ["message", "error", "detail", "title", "description"]) {
    const v = d[key];
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  if (Array.isArray(d.errors)) {
    for (const item of d.errors) {
      if (typeof item === "string" && item.trim()) out.push(item.trim());
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        for (const key of ["message", "defaultMessage", "error"]) {
          const v = o[key];
          if (typeof v === "string" && v.trim()) out.push(v.trim());
        }
      }
    }
  }
  if (d.data) collectMessagesFromBody(d.data, depth + 1, out);
  return out;
}

function readMessageFromBody(body: unknown): string | undefined {
  const messages = collectMessagesFromBody(body);
  const specific = messages.find((m) => !GENERIC_BACKEND_MESSAGES.has(m));
  return specific ?? messages[0];
}

function extractBackendMessage(data: unknown, status: number): string {
  const message = readMessageFromBody(data);
  if (message) return message;
  return `Request failed (${status})`;
}

function apiErrorMessage(data: unknown, status: number): string {
  return extractBackendMessage(data, status);
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  token?: string,
  options?: WriteOptions,
): Promise<T> {
  const { res, data } = await fetchJson(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: writeHeaders(token, options),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, apiErrorMessage(data, res.status), data);
  }

  return data as T;
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  token?: string,
  options?: WriteOptions,
): Promise<T> {
  const { res, data } = await fetchJson(`${BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: writeHeaders(token, options),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, apiErrorMessage(data, res.status), data);
  }

  return data as T;
}

export async function apiDelete<T = unknown>(
  path: string,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      accept: "application/json",
      ...authHeaders(token),
    },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    throw new ApiError(res.status, apiErrorMessage(data, res.status), data);
  }

  return data as T;
}

/** Multipart upload (FormData). The browser sets the Content-Type boundary,
 * so we must NOT set it ourselves. */
export async function apiUpload<T = unknown>(
  path: string,
  form: FormData,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      accept: "application/json",
      ...authHeaders(token),
    },
    body: form,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    throw new ApiError(res.status, apiErrorMessage(data, res.status), data);
  }

  return data as T;
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const { res, data } = await fetchJson(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      accept: "application/json",
      ...authHeaders(token),
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, apiErrorMessage(data, res.status), data);
  }

  return data as T;
}

// Technical/infra error tokens that should never be shown to users — fall back
// to a friendly message instead. Also covers gateway statuses (502/503/504).
const TECHNICAL_ERROR =
  /^(upstream_unreachable|fetch failed|network|timeout|aborted|failed to fetch|econn|enotfound|etimedout)/i;

/** True when the failure is a server/connection problem (the backend is down or
 * unreachable) rather than something the user's input caused — so callers can
 * show "service unavailable" instead of a misleading "invalid credentials". */
export function isConnectionError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status >= 500 || TECHNICAL_ERROR.test(err.message);
  }
  if (err instanceof Error) return TECHNICAL_ERROR.test(err.message);
  return false;
}

export function getErrorMessage(err: unknown, fallback: string, locale?: string): string {
  // Backend messages arrive in English; translate known ones to Swahili so the
  // SW UI never shows an English error. The fallback is already localized by the
  // caller (a t() result), so it's returned as-is.
  const localize = (m: string) => localizeBackendMessage(m, locale ?? activeLocale());
  if (err instanceof ApiError) {
    const gateway = err.status === 502 || err.status === 503 || err.status === 504;
    if (gateway) return fallback;

    let message = err.message;
    if (!message || TECHNICAL_ERROR.test(message) || GENERIC_BACKEND_MESSAGES.has(message)) {
      const alt = readMessageFromBody(err.data);
      if (alt && !TECHNICAL_ERROR.test(alt)) message = alt;
    }
    if (!message || TECHNICAL_ERROR.test(message)) return fallback;
    if (GENERIC_BACKEND_MESSAGES.has(message)) return fallback;
    return localize(message);
  }
  if (err instanceof Error && err.message && !TECHNICAL_ERROR.test(err.message)) {
    return localize(err.message);
  }
  return fallback;
}
