import { localizeBackendMessage } from "./errorMessagesSw";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// The active locale is persisted by the LocaleProvider under this key. Reading it
// here lets getErrorMessage() localize backend (English) messages without every
// call site having to thread the locale through. (Mirrors STORAGE_KEY/DEFAULT in
// app/i18n/localeProvider.tsx — keep in sync.)
const LOCALE_STORAGE_KEY = "icrcs-locale";
function activeLocale(): string {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) || "en";
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

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
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
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
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
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
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
    if (gateway || !err.message || TECHNICAL_ERROR.test(err.message)) return fallback;
    return localize(err.message);
  }
  if (err instanceof Error && err.message && !TECHNICAL_ERROR.test(err.message)) {
    return localize(err.message);
  }
  return fallback;
}
