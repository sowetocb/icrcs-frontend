import { apiPost, apiGet, apiPut, apiDelete, apiUpload, ApiError } from "./client";
import { resolveGenderId, resolveGenderCode } from "./lookup";
import { loadSession, saveSession, clearSession } from "@/lib/auth/session";
import { isOfficer as _isOfficer, clearOfficer as _clearOfficer } from "@/lib/auth/officerSession";
import { loadProfile, toProxyUrl, type Profile } from "@/lib/auth/profile";
import { COUNTRIES } from "@/lib/countries";
import { alpha2ToAlpha3 } from "@/lib/iso3";

/** Resolve a country NAME (e.g. "Tanzania") to its ISO-3166-1 alpha-3 code
 *  ("TZA") for the backend; "" when it can't be resolved. */
function toNationalityCode(name: string): string {
  const match = COUNTRIES.find((c) => c.name === name);
  return match ? alpha2ToAlpha3(match.code) ?? "" : "";
}

/** Thrown when the session is invalid/expired and can't be refreshed — the UI
 * should send the user back to sign in. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

export type Tokens = { accessToken: string; refreshToken: string };

export type RegisterPayload = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  /** Country of nationality as a country NAME (e.g. "Tanzania"). Sent to the
   *  backend as the ISO-3166-1 alpha-3 code (nationalityCode). */
  nationality: string;
  phoneNumber: string;
  email: string;
  password: string;
};

// Bypass real network calls while the backend is unavailable. Mocked by
// default; set NEXT_PUBLIC_AUTH_BYPASS=false to hit the real auth API.
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const MOCK_TOKENS: Tokens = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Deep-search a response object for the first non-empty string under any of the
// given keys — tolerates arbitrary nesting ({ data }, { tokens }, { data: {
// tokens } }, …) and snake_case without guessing the exact shape.
function deepFindString(raw: unknown, keys: string[]): string {
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    const obj = cur as Record<string, unknown>;
    for (const k of keys) {
      if (typeof obj[k] === "string" && obj[k]) return obj[k] as string;
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return "";
}

/** Extracts tokens from a login/verify/refresh response. `fallbackRefresh` keeps
 * the existing refresh token when the response rotates only the access token. */
function normalizeTokens(raw: unknown, fallbackRefresh = ""): Tokens {
  return {
    accessToken: deepFindString(raw, ["accessToken", "access_token"]),
    refreshToken:
      deepFindString(raw, ["refreshToken", "refresh_token"]) || fallbackRefresh,
  };
}

/** POST /v1/auth/register — creates the profile and triggers the email OTP.
 * Returns the pre-auth token needed to verify the OTP. */
export async function register(
  payload: RegisterPayload,
): Promise<{ preAuthToken: string }> {
  if (BYPASS) {
    await delay(400);
    return { preAuthToken: "mock-pre-auth-token" };
  }
  // The backend expects the gender lookup ID (e.g. 1), not the M/F/O code the
  // form collects. Resolve it; keep the original value if the lookup is down.
  const genderId = await resolveGenderId(payload.gender);
  const { nationality, ...rest } = payload;
  const body = {
    ...rest,
    gender: genderId ?? payload.gender,
    nationalityCode: toNationalityCode(nationality),
  };
  const raw = (await apiPost("/v1/auth/register", body)) as Record<string, unknown>;
  const data = (raw?.data ?? raw ?? {}) as Record<string, unknown>;
  return { preAuthToken: String(data.preAuthToken ?? "") };
}

/** POST /v1/auth/resend-otp — re-sends the email OTP for a pending registration.
 * Returns a (possibly rotated) pre-auth token to use for the next verify; falls
 * back to the caller's existing token when the backend doesn't return one. */
export async function resendOtp(
  email: string,
  currentPreAuthToken = "",
): Promise<{ preAuthToken: string }> {
  if (BYPASS) {
    await delay(400);
    return { preAuthToken: currentPreAuthToken || "mock-pre-auth-token" };
  }
  // Authorise the resend with the registration pre-auth token (same as verify);
  // without it the backend rejects the request with 403.
  const raw = (await apiPost(
    "/v1/auth/resend-otp",
    { email },
    currentPreAuthToken || undefined,
  )) as Record<string, unknown>;
  const data = (raw?.data ?? raw ?? {}) as Record<string, unknown>;
  return { preAuthToken: String(data.preAuthToken ?? "") || currentPreAuthToken };
}

/** POST /v1/auth/verify-otp — confirms the code (sent as a string), authorised by
 * the register pre-auth token. Returns session tokens. */
export async function verifyOtp(
  otpCode: string,
  preAuthToken?: string,
): Promise<Tokens> {
  if (BYPASS) {
    await delay(400);
    return { ...MOCK_TOKENS };
  }
  return normalizeTokens(
    await apiPost("/v1/auth/verify-otp", { otpCode: String(otpCode) }, preAuthToken),
  );
}

/** POST /api/auth/login — authenticates via the server-side route that sets
 * HttpOnly cookies. The tokens never reach the browser. */
export async function login(identifier: string, password: string): Promise<Tokens> {
  if (BYPASS) {
    await delay(400);
    return { ...MOCK_TOKENS };
  }
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      (data as { error?: string } | null)?.error || `Login failed (${res.status})`,
    );
  }
  // Tokens are in HttpOnly cookies; return stubs so saveSession can mark logged-in.
  return { accessToken: "__httponly__", refreshToken: "__httponly__" };
}

// Single-flight guard: concurrent callers (SessionKeepAlive + every withFreshAuth
// that hit a 401 at once) must share ONE /api/auth/refresh request. With backend
// refresh-token rotation, parallel refreshes would each send the same refresh
// cookie; the first rotates it and the rest get a 401 → spurious session-expiry
// and logout. Sharing one in-flight request avoids that race.
let refreshInFlight: Promise<Tokens> | null = null;

/** POST /api/auth/refresh — exchanges the refresh cookie for fresh cookies.
 * Deduplicated: overlapping calls resolve to the same in-flight request. */
export async function refresh(_refreshToken?: string): Promise<Tokens> {
  if (BYPASS) {
    await delay(200);
    return { ...MOCK_TOKENS };
  }
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      throw new ApiError(res.status, "Session expired");
    }
    // Tokens are in HttpOnly cookies; return stubs.
    return { accessToken: "__httponly__", refreshToken: "__httponly__" } as Tokens;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** POST /api/auth/logout — clears HttpOnly cookies and invalidates the backend
 * refresh token. */
export async function logout(_refreshToken: string): Promise<unknown> {
  if (BYPASS) {
    await delay(200);
    return { ok: true, mock: true };
  }
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  return res.json().catch(() => ({ ok: true }));
}

/** POST /v1/auth/forgot-password — step 1: send reset OTP, returns profileId. */
export async function forgotPassword(
  identifier: string,
): Promise<{ profileId: string }> {
  if (BYPASS) {
    await delay(400);
    return { profileId: "mock-profile-id" };
  }
  const raw = (await apiPost("/v1/auth/forgot-password", {
    identifier: String(identifier),
  })) as Record<string, unknown>;
  const data = raw?.data ?? raw;
  if (typeof data === "string") {
    return { profileId: data };
  }
  const dataObj = (data ?? {}) as Record<string, unknown>;
  return { profileId: String(dataObj.profileId ?? dataObj.id ?? "") };
}

/** POST /v1/auth/verify-reset-otp — step 2: confirm the emailed reset code. */
export async function verifyResetOtp(
  profileId: string,
  otpCode: string,
): Promise<unknown> {
  if (BYPASS) {
    await delay(400);
    return { ok: true, mock: true };
  }
  return apiPost("/v1/auth/verify-reset-otp", {
    profileId: String(profileId),
    otpCode: String(otpCode),
  });
}

/** POST /v1/auth/reset-password — step 3: set the new password. */
export async function resetPassword(
  profileId: string,
  newPassword: string,
  confirmPassword: string,
): Promise<unknown> {
  if (BYPASS) {
    await delay(400);
    return { ok: true, mock: true };
  }
  return apiPost("/v1/auth/reset-password", {
    profileId: String(profileId),
    newPassword: String(newPassword),
    confirmPassword: String(confirmPassword),
  });
}

/** POST /v1/auth/unlock-account — verify the one-time unlock token from the
 * account-locked email and lift the lockout. */
export async function unlockAccount(token: string): Promise<void> {
  if (BYPASS) {
    await delay(400);
    return;
  }
  await apiPost("/v1/auth/unlock-account", { token: String(token) });
}

// Extract a raw gender value from the profile envelope, tolerating the backend's
// many shapes: a code/name string, a numeric lookup id, a `genderId`/`genderName`
// key, or a nested `{ id, name, code }` object. Normalised to the M/F/O code by
// resolveGenderCode at the fetch boundary.
function rawGender(d: Record<string, unknown>): string {
  const g = d.gender ?? d.sex ?? d.genderId ?? d.genderName ?? d.sexId;
  if (g == null) return "";
  if (typeof g === "object") {
    const go = g as Record<string, unknown>;
    return String(go.code ?? go.name ?? go.id ?? "");
  }
  return String(g);
}

/** Reverse of toNationalityCode: an alpha-3 code ("TZA") back to a country
 *  NAME ("Tanzania"), or "" when unknown. */
function nationalityNameFromCode(code: string): string {
  const up = code.toUpperCase();
  const match = COUNTRIES.find((c) => alpha2ToAlpha3(c.code) === up);
  return match?.name ?? "";
}

// Pull the nationality out of the backend envelope (accepts an alpha-3 code or a
// name, string or {code/name} object) and normalise to a country NAME.
function rawNationality(d: Record<string, unknown>): string {
  const raw = d.nationality ?? d.nationalityCode ?? d.nationalityName ?? d.countryCode;
  if (raw == null) return "";
  const s =
    typeof raw === "object"
      ? String((raw as Record<string, unknown>).name ?? (raw as Record<string, unknown>).code ?? "")
      : String(raw);
  if (!s) return "";
  return /^[A-Za-z]{3}$/.test(s) ? nationalityNameFromCode(s) || s : s;
}

// Maps the backend profile envelope ({ data: {...} } or a bare object) to Profile.
function mapProfile(raw: unknown): Profile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const d = (r.data ?? r) as Record<string, unknown>;
  return {
    profileId: String(d.profileId ?? d.id ?? ""),
    firstName: String(d.firstName ?? ""),
    middleName: String(d.middleName ?? ""),
    lastName: String(d.lastName ?? ""),
    gender: rawGender(d),
    // Fall back to the value captured at create-profile if the backend omits it,
    // so the registry can still classify Tanzanian vs foreign.
    nationality: rawNationality(d) || loadProfile()?.nationality || undefined,
    phoneNumber: String(d.phoneNumber ?? d.phone ?? ""),
    email: String(d.email ?? ""),
    profilePictureUrl: String(d.profilePictureUrl ?? d.profilePicture ?? ""),
  };
}

const MOCK_PROFILE: Profile = {
  profileId: "mock-profile-id",
  firstName: "John",
  middleName: "Gastone",
  lastName: "Mahwaya",
  gender: "M",
  nationality: "Tanzania",
  phoneNumber: "+255624839009",
  email: "john.mahwaya@immigration.go.tz",
  profilePictureUrl: "",
};

function token(): string | undefined {
  return loadSession()?.accessToken;
}

/** Runs an authorized call with the current access token. If it fails with 401/
 * 403, tries a one-time token refresh and retries. If refresh isn't possible or
 * also fails, clears the session and throws SessionExpiredError.
 *
 * Officer callers use a SEPARATE refresh endpoint (/api/officer/refresh) and
 * their own cookies (icrcs-officer-*); the citizen flow uses /api/auth/refresh
 * and the icrcs-* cookies. The right path is chosen automatically. */
export async function withFreshAuth<T>(
  call: (accessToken: string | undefined) => Promise<T>,
): Promise<T> {
  if (BYPASS) return call(token());
  try {
    return await call(token());
  } catch (err) {
    // A 403 carrying the app's structured error envelope (errorCode/message) is
    // a business-rule rejection — e.g. REGISTRATION_PARENT_NOT_APPROVED — NOT an
    // auth failure. Surface its message rather than masking it as an expired
    // session. (A bare 403, as Spring Security returns for a missing/invalid
    // JWT, has no errorCode and still flows through the refresh path below.)
    if (err instanceof ApiError && err.status === 403) {
      const data = err.data as { errorCode?: unknown } | null;
      if (data && typeof data === "object" && "errorCode" in data) throw err;
    }

    const unauthorized =
      err instanceof ApiError && (err.status === 401 || err.status === 403);
    if (!unauthorized) throw err;

    // Officers have NO citizen session (clearSession() is called on officer
    // login). Check the officer session first; fall back to the citizen one.
    const officerMode = _isOfficer();
    const session = loadSession();
    if (!officerMode && !session?.refreshToken) {
      clearSession();
      throw new SessionExpiredError();
    }

    // Refresh, then retry once. Only a definitive 401/403 (dead refresh token /
    // still-unauthorized retry) ends the session. A network error, timeout, or
    // 5xx from a flaky backend is transient — keep the session and surface the
    // error so the caller can show "try again" instead of forcing a logout.
    let tokens: Tokens;
    try {
      tokens = officerMode
        ? await refreshOfficer()
        : await refresh(session!.refreshToken);
    } catch (refreshErr) {
      if (
        refreshErr instanceof ApiError &&
        (refreshErr.status === 401 || refreshErr.status === 403)
      ) {
        if (officerMode) _clearOfficer();
        else clearSession();
        throw new SessionExpiredError();
      }
      throw refreshErr; // transient — don't log the user out
    }
    if (!officerMode) saveSession(tokens);
    try {
      return await call(officerMode ? token() : tokens.accessToken);
    } catch (retryErr) {
      if (
        retryErr instanceof ApiError &&
        (retryErr.status === 401 || retryErr.status === 403)
      ) {
        if (officerMode) _clearOfficer();
        else clearSession();
        throw new SessionExpiredError();
      }
      throw retryErr; // transient — don't log the user out
    }
  }
}

/** Officer-specific refresh — hits the /api/officer/refresh server-side route
 * which reads the icrcs-officer-refresh cookie, exchanges it with the User
 * Management API, and writes fresh cookies. */
async function refreshOfficer(): Promise<Tokens> {
  const res = await fetch("/api/officer/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Officer session expired");
  }
  // Tokens are in HttpOnly cookies; return stubs.
  return { accessToken: "__httponly__", refreshToken: "__httponly__" };
}

/** GET /v1/profile/me — the full profile for the signed-in account. Call once
 * after login/verify and cache; never poll it on every page. */
export async function getMyProfile(accessToken: string): Promise<Profile> {
  if (BYPASS) {
    await delay(200);
    return { ...MOCK_PROFILE, ...loadProfile() };
  }
  const profile = mapProfile(await apiGet("/v1/profile/me", accessToken));
  // The backend returns gender as the lookup id; the app uses the M/F/O code.
  profile.gender = await resolveGenderCode(profile.gender);
  return profile;
}

/** Re-fetch the profile from the backend, refreshing the access token if it has
 * expired. Used to pick up edits (name, phone, photo) made on another device. */
export async function refreshMyProfile(): Promise<Profile> {
  return withFreshAuth((at) => getMyProfile(at ?? ""));
}

/** Fetch the stored profile photo bytes through the authenticated same-origin
 * proxy and return them as a data URL — so a device that didn't upload the
 * photo can still display it. Returns null when there's no photo or the backend
 * can't serve it. */
export async function fetchProfilePicture(path: string): Promise<string | null> {
  if (!path || BYPASS) return null;
  const url = toProxyUrl(path);
  if (!url) return null;
  // Best-effort, side-effect-free: a single authed request using the current
  // token. It must NEVER refresh or clear the session — a 403 from the file
  // endpoint is a photo problem, not an expired-session problem, so it must not
  // log the user out. The photo simply falls back to initials.
  try {
    const at = loadSession()?.accessToken;
    const res = await fetch(url, {
      // Send the HttpOnly auth cookie to the same-origin proxy. The token lives
      // in that cookie now, so we must NOT send the "__httponly__" stub as a
      // bogus Bearer header (the proxy would forward it and the backend reject).
      credentials: "include",
      headers: {
        accept: "image/*",
        ...(at && at !== "__httponly__" ? { authorization: `Bearer ${at}` } : {}),
      },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size || !blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type UpdateProfileInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  phoneNumber: string;
  /** Country of nationality as a NAME (e.g. "Tanzania"). The user cannot change
   *  it — the profile form sends the existing value back unchanged so the
   *  backend's required `nationalityCode` is preserved on update. */
  nationality: string;
};

/** PUT /v1/profile/update — change name, gender, phone. Nationality is sent
 *  unchanged (not user-editable). Returns the new profile. */
export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  if (BYPASS) {
    await delay(400);
    const current = loadProfile() ?? MOCK_PROFILE;
    return { ...current, ...input };
  }
  // Send gender as the lookup id; normalise the returned id back to the code.
  const genderId = await resolveGenderId(input.gender);
  const { nationality, ...rest } = input;
  const body = {
    ...rest,
    gender: genderId ?? input.gender,
    nationalityCode: toNationalityCode(nationality),
  };
  const profile = mapProfile(
    await withFreshAuth((at) => apiPut("/v1/profile/update", body, at)),
  );
  profile.gender = await resolveGenderCode(profile.gender);
  return profile;
}

/** POST /v1/profile/picture — multipart upload (field "file", jpg/png ≤500KB).
 * Returns the stored relative path. */
export async function uploadProfilePicture(file: File): Promise<string> {
  if (BYPASS) {
    await delay(400);
    return "uploads/mock/profile.png";
  }
  const raw = (await withFreshAuth((at) => {
    // Build a fresh FormData per attempt (a body can't be re-sent on retry).
    const form = new FormData();
    form.append("file", file);
    return apiUpload("/v1/profile/picture", form, at);
  })) as Record<string, unknown>;
  // Response shape: { success, data: "<relative path string>" }
  return typeof raw?.data === "string" ? raw.data : "";
}

/** DELETE /v1/profile/picture — removes the stored photo. */
export async function deleteProfilePicture(): Promise<void> {
  if (BYPASS) {
    await delay(300);
    return;
  }
  await withFreshAuth((at) => apiDelete("/v1/profile/picture", at));
}

export { ApiError };
