// Server-side login endpoint that authenticates against the backend and sets
// HttpOnly cookies instead of returning tokens to the browser. This prevents
// credentials/tokens from being visible in localStorage or the Network tab.

import { cookies } from "next/headers";
import { authCookieOptions, ACCESS_TTL, REFRESH_TTL } from "@/lib/auth/cookieOptions";

const BACKEND =
  process.env.BACKEND_API_BASE_URL ?? process.env.AUTH_API_BASE_URL ?? "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST(request: Request) {
  // Cookie security is derived from the request protocol (see cookieOptions).
  const COOKIE_OPTS = authCookieOptions(request);
  const body = (await request.json()) as {
    identifier?: string;
    password?: string;
  };

  if (BYPASS) {
    // Mock mode — set cookies with mock tokens
    const jar = await cookies();
    jar.set("icrcs-access", "mock-access-token", {
      ...COOKIE_OPTS,
      maxAge: ACCESS_TTL,
    });
    jar.set("icrcs-refresh", "mock-refresh-token", {
      ...COOKIE_OPTS,
      maxAge: REFRESH_TTL,
    });
    return Response.json({ success: true });
  }

  // Forward the login request to the backend
  const res = await fetch(`${BACKEND}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: body.identifier,
      password: body.password,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      `Login failed (${res.status})`;
    return Response.json({ error: message }, { status: res.status });
  }

  // Extract tokens from the response (handles nested shapes)
  const tokens = extractTokens(data);

  if (!tokens.accessToken) {
    return Response.json(
      { error: "No access token in response" },
      { status: 500 },
    );
  }

  // Set HttpOnly cookies — the browser cannot read these via JavaScript
  const jar = await cookies();
  jar.set("icrcs-access", tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: ACCESS_TTL,
  });
  if (tokens.refreshToken) {
    jar.set("icrcs-refresh", tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: REFRESH_TTL,
    });
  }

  // Return success without exposing the tokens to the browser
  return Response.json({ success: true });
}

function extractTokens(raw: unknown): {
  accessToken: string;
  refreshToken: string;
} {
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
  return { accessToken, refreshToken };
}
