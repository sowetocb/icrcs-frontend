const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const gateway = err.status === 502 || err.status === 503 || err.status === 504;
    if (gateway || !err.message || TECHNICAL_ERROR.test(err.message)) return fallback;
    return err.message;
  }
  if (err instanceof Error && err.message && !TECHNICAL_ERROR.test(err.message)) {
    return err.message;
  }
  return fallback;
}
