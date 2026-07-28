// Officer refresh — reads the officer refresh token from its HttpOnly cookie,
// rotates it against the SAME auth backend that issued it at login, and writes
// the new tokens back. The auth API ROTATES the refresh token on every refresh,
// so both cookies are always replaced with the values it returns.
//
// IMPORTANT: base URL resolution MUST match /api/officer/login. Hitting a
// different host (e.g. USER_MGT alone while login used BACKEND_API) rejects a
// brand-new login's refresh token and wipes the session immediately.

import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/auth/cookieOptions";

const BACKEND =
  process.env.BACKEND_API_BASE_URL ||
  process.env.AUTH_API_BASE_URL ||
  process.env.USER_MGT_API_BASE_URL ||
  "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST(request: Request) {
  const COOKIE_OPTS = authCookieOptions(request);
  const jar = await cookies();
  const refreshToken = jar.get("icrcs-officer-refresh")?.value ?? "";

  if (BYPASS) {
    jar.set("icrcs-officer-access", "mock-officer-access", { ...COOKIE_OPTS });
    jar.set("icrcs-officer-refresh", "mock-officer-refresh", { ...COOKIE_OPTS });
    return Response.json({ success: true });
  }

  if (!refreshToken) {
    return Response.json({ error: "No refresh token" }, { status: 401 });
  }

  let res: Response;
  try {
    // Send both camelCase and snake_case — portal and UM APIs differ on the key.
    res = await fetch(`${BACKEND}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken,
        refresh_token: refreshToken,
      }),
    });
  } catch {
    return Response.json(
      { error: "Unable to reach the authentication server" },
      { status: 503 },
    );
  }
  const data = await res.json().catch(() => null);
  const tokens = extractTokens(data, refreshToken);
  const codeOk = Number((data as { code?: number } | null)?.code ?? 0) === 1;
  // Success if HTTP ok AND (UM-style code===1 OR we got a fresh access token).
  const ok = res.ok && (codeOk || !!tokens.accessToken);

  if (!ok) {
    // Only clear cookies on a definitive auth rejection (401/403). A 5xx / odd
    // payload must not wipe a live session (e.g. flaky UM during refresh, or
    // right after login when AuthGuard warm-refreshes).
    if (res.status === 401 || res.status === 403) {
      jar.delete("icrcs-officer-access");
      jar.delete("icrcs-officer-refresh");
      return Response.json({ error: "Session expired" }, { status: 401 });
    }
    return Response.json(
      { error: "Unable to refresh session" },
      { status: res.status >= 500 ? 503 : res.status || 502 },
    );
  }

  jar.set("icrcs-officer-access", tokens.accessToken, { ...COOKIE_OPTS });
  if (tokens.refreshToken) {
    jar.set("icrcs-officer-refresh", tokens.refreshToken, { ...COOKIE_OPTS });
  }
  return Response.json({ success: true });
}

function extractTokens(
  raw: unknown,
  fallbackRefresh: string,
): { accessToken: string; refreshToken: string } {
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  let accessToken = "";
  let refreshToken = "";
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    const obj = cur as Record<string, unknown>;
    for (const k of ["accessToken", "access_token"]) {
      if (typeof obj[k] === "string" && obj[k] && !accessToken) accessToken = obj[k] as string;
    }
    for (const k of ["refreshToken", "refresh_token"]) {
      if (typeof obj[k] === "string" && obj[k] && !refreshToken) refreshToken = obj[k] as string;
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  // Keep the current refresh token if the response didn't include a new one.
  return { accessToken, refreshToken: refreshToken || fallbackRefresh };
}
