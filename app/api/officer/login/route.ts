// Officer login — authenticates .go.tz officers against the SAME backend as
// citizens (/v1/auth/login with `identifier`) and stores the officer's
// access/refresh tokens in HttpOnly cookies (icrcs-officer-*), exactly like the
// citizen /api/auth/login route, so tokens never reach the browser.

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
  const body = (await request.json()) as { username?: string; password?: string };

  if (BYPASS) {
    const jar = await cookies();
    jar.set("icrcs-officer-access", "mock-officer-access", { ...COOKIE_OPTS });
    jar.set("icrcs-officer-refresh", "mock-officer-refresh", { ...COOKIE_OPTS });
    return Response.json({
      success: true,
      user: {
        userId: "mock-officer",
        username: body.username ?? "officer@immigration.go.tz",
        fullName: "Mock Officer",
        stationName: "HQ",
        roles: ["ICRCS_OFFICER"],
        permissions: ["ICRCS_REGISTRATION"],
      },
    });
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: body.username, password: body.password }),
    });
  } catch {
    return Response.json(
      { error: "Unable to reach the authentication server", code: "CONNECTION" },
      { status: 503 },
    );
  }
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
  jar.set("icrcs-officer-access", tokens.accessToken, { ...COOKIE_OPTS });
  if (tokens.refreshToken) {
    jar.set("icrcs-officer-refresh", tokens.refreshToken, { ...COOKIE_OPTS });
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

/** Map the User Management `data.user` to the shape the frontend officer session
 * caches. The login response nests:
 *   Roles:               [{ RoleCode, RoleID, RoleName }, …]      → RoleCode[]
 *   PermissionsByModule: [{ Module, Actions: [{ ActionCode }] }]  → ActionCode[]
 * (the ICRCS registration right is the ActionCode "ICRCS_REGISTRATION"). */
function extractOfficer(raw: unknown): Record<string, unknown> {
  const data =
    typeof raw === "object" && raw !== null && "data" in raw
      ? ((raw as { data?: unknown }).data as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const user = (data?.user ?? {}) as Record<string, unknown>;
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

  // Roles → RoleCode strings.
  const roles = Array.isArray(user.Roles)
    ? user.Roles.map((r) => s(obj(r).RoleCode ?? obj(r).roleCode)).filter(Boolean)
    : [];
  // PermissionsByModule → flat ActionCode strings.
  const permissions = Array.isArray(user.PermissionsByModule)
    ? user.PermissionsByModule.flatMap((m) => {
        const actions = obj(m).Actions;
        return Array.isArray(actions)
          ? actions.map((a) => s(obj(a).ActionCode ?? obj(a).actionCode))
          : [];
      }).filter(Boolean)
    : [];

  return {
    userId: user.UserID ?? user.userId,
    username: user.Username ?? user.username ?? user.Email,
    fullName: user.FullName ?? user.fullName,
    email: s(user.Email ?? user.email),
    pfNo: s(user.PFNo ?? user.pfNo),
    position: s(user.Position ?? user.position),
    regionName: s(user.RegionName ?? user.regionName),
    stationId: user.StationID ?? user.stationId,
    stationName: user.StationName ?? user.stationName,
    countryName: s(user.CountryName ?? user.countryName),
    roles,
    permissions,
  };
}
