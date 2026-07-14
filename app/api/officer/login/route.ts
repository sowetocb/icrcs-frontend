// Officer login — proxies the User Management API and stores the officer's
// access/refresh tokens in HttpOnly cookies (icrcs-officer-*), exactly like the
// citizen /api/auth/login route, so tokens never reach the browser. Officer
// auth is a SEPARATE, username-based service; its base URL is USER_MGT_API_BASE_URL.

import { cookies } from "next/headers";
import { authCookieOptions, ACCESS_TTL, REFRESH_TTL } from "@/lib/auth/cookieOptions";

const USER_MGT = process.env.USER_MGT_API_BASE_URL ?? "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST(request: Request) {
  const COOKIE_OPTS = authCookieOptions(request);
  const body = (await request.json()) as { username?: string; password?: string };

  if (BYPASS) {
    const jar = await cookies();
    jar.set("icrcs-officer-access", "mock-officer-access", { ...COOKIE_OPTS, maxAge: ACCESS_TTL });
    jar.set("icrcs-officer-refresh", "mock-officer-refresh", { ...COOKIE_OPTS, maxAge: REFRESH_TTL });
    return Response.json({
      success: true,
      user: {
        userId: "mock-officer",
        username: body.username ?? "OFFICER",
        fullName: "Mock Officer",
        roles: ["OFFICER"],
        permissions: [],
      },
    });
  }

  const res = await fetch(`${USER_MGT}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: body.username, password: body.password }),
  });
  const data = await res.json().catch(() => null);

  // The User Management API wraps results as { code, message, data }. Treat a
  // non-1 code (or a non-2xx status) as a failure.
  const ok = res.ok && Number((data as { code?: number } | null)?.code ?? 0) === 1;
  if (!ok) {
    const message =
      (data as { message?: string } | null)?.message ?? `Login failed (${res.status})`;
    return Response.json({ error: message }, { status: res.ok ? 401 : res.status });
  }

  const tokens = extractTokens(data);
  if (!tokens.accessToken) {
    return Response.json({ error: "No access token in response" }, { status: 500 });
  }

  const jar = await cookies();
  jar.set("icrcs-officer-access", tokens.accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TTL });
  if (tokens.refreshToken) {
    jar.set("icrcs-officer-refresh", tokens.refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TTL });
  }

  // Return the officer profile (roles/permissions) for UI gating — never the tokens.
  return Response.json({ success: true, user: extractOfficer(data) });
}

/** Deep-scan for access/refresh tokens (handles both camelCase and snake_case,
 * and the { data: { ... } } wrapper). */
function extractTokens(raw: unknown): { accessToken: string; refreshToken: string } {
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
  return { accessToken, refreshToken };
}

/** Map the User Management `data.user` (+ roles/permissions) to the shape the
 * frontend officer session caches. Role/permission field names in the login
 * response are still being confirmed, so several likely keys are checked. */
function extractOfficer(raw: unknown): Record<string, unknown> {
  const data =
    typeof raw === "object" && raw !== null && "data" in raw
      ? ((raw as { data?: unknown }).data as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const user = (data?.user ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  return {
    userId: user.UserID ?? user.userId,
    username: user.Username ?? user.username,
    fullName: user.FullName ?? user.fullName,
    stationId: user.StationID ?? user.stationId,
    stationName: user.StationName ?? user.stationName,
    roles: arr(data?.roles ?? user.Roles),
    permissions: arr(data?.permissions ?? user.PermissionsByModule),
  };
}
