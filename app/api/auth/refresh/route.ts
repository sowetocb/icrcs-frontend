// Server-side refresh endpoint that reads the refresh token from the HttpOnly
// cookie, exchanges it with the backend, and sets new cookies.

import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/auth/cookieOptions";

const BACKEND =
  process.env.BACKEND_API_BASE_URL ?? process.env.AUTH_API_BASE_URL ?? "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST(request: Request) {
  // Cookie security is derived from the request protocol (see cookieOptions).
  const COOKIE_OPTS = authCookieOptions(request);
  const jar = await cookies();
  const refreshToken = jar.get("icrcs-refresh")?.value ?? "";

  if (BYPASS) {
    jar.set("icrcs-access", "mock-access-token", {
      ...COOKIE_OPTS,
    });
    jar.set("icrcs-refresh", "mock-refresh-token", {
      ...COOKIE_OPTS,
    });
    return Response.json({ success: true });
  }

  if (!refreshToken) {
    return Response.json({ error: "No refresh token" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Clear stale cookies on refresh failure
    jar.delete("icrcs-access");
    jar.delete("icrcs-refresh");
    return Response.json({ error: "Session expired" }, { status: 401 });
  }

  const tokens = extractTokens(data, refreshToken);

  jar.set("icrcs-access", tokens.accessToken, {
    ...COOKIE_OPTS,
  });
  if (tokens.refreshToken) {
    jar.set("icrcs-refresh", tokens.refreshToken, {
      ...COOKIE_OPTS,
    });
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
      if (typeof obj[k] === "string" && obj[k] && !accessToken)
        accessToken = obj[k] as string;
    }
    for (const k of ["refreshToken", "refresh_token"]) {
      if (typeof obj[k] === "string" && obj[k] && !refreshToken)
        refreshToken = obj[k] as string;
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return { accessToken, refreshToken: refreshToken || fallbackRefresh };
}
