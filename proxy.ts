// Next.js Proxy (the file convention formerly called `middleware`; renamed in
// Next 16). Runs in the Node.js runtime BEFORE the matched route handlers, so it
// guards the same-origin backend proxy (app/api/proxy/[...path]) and the auth
// routes (app/api/auth/*). It is the single edge chokepoint that:
//
//   0. Enforces same-origin (CORS/CSRF): rejects requests carrying a foreign
//      Origin, since auth rides on an ambient cookie and CORS alone won't block
//      cross-origin writes. Override with ALLOWED_ORIGINS for trusted callers.
//   1. Restricts HTTP methods on the API surface (drops TRACE/CONNECT/OPTIONS).
//   2. Enforces a PATH ALLOWLIST on /api/proxy/* so the relay can only reach a
//      known set of backend paths — it can't be abused to hit arbitrary internal
//      endpoints (open-relay / SSRF hardening).
//   3. Requires an auth cookie (or a Bearer pre-auth header) on PROTECTED proxy
//      paths; public paths (auth, lookups, application-status) stay open.
//   4. Rate-limits sensitive auth/OTP endpoints per client IP (brute-force / OTP
//      abuse) — best-effort, in-memory, per container instance.
//
// NOTE: the in-memory rate-limit state is per-process and resets on restart; it
// does not coordinate across replicas. For multi-replica or internet-facing
// deployments, enforce rate limiting at the ingress/load balancer (where the
// real client IP is known) — this layer is defense-in-depth.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROXY_PREFIX = "/api/proxy/";

// Methods permitted on the API surface. Everything else (TRACE, CONNECT,
// OPTIONS — no cross-origin preflight is needed for this same-origin proxy) is
// rejected with 405.
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);

// ---- CORS / same-origin enforcement ----------------------------------------
// The whole app is same-origin by design: the browser only ever calls
// /api/proxy/* and /api/auth/*, which forward server-side (see .env / the proxy
// route). So we deliberately never emit Access-Control-Allow-Origin — which
// already blocks cross-origin *reads*. But auth rides on an ambient HttpOnly
// cookie (icrcs-access), and CORS does NOT stop a cross-origin *write* (a
// malicious page can still fire a "simple" POST with the cookie attached). This
// guard closes that CSRF hole by rejecting any request whose Origin host is not
// the host the request arrived on.
//
// Same-origin browser requests send Origin === page origin (host matches Host).
// Server-side callers and top-level GET navigations omit Origin entirely and are
// allowed through. For genuinely trusted external callers, set ALLOWED_ORIGINS
// (comma-separated absolute origins) — empty by default.
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

/** True when a request carries an Origin that is neither same-origin nor allowlisted. */
function isDisallowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // no Origin → not a cross-origin browser request
  if (ALLOWED_ORIGINS.has(origin)) return false;
  try {
    // Same-origin: the Origin's host matches the Host the request came in on
    // (both reflect the public hostname the browser used, even behind a tunnel).
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true; // malformed Origin → treat as cross-origin
  }
}

// Allowed second segment under /api/proxy/v1/*. The first segment must be "v1"
// or "lookup" (the lookup microservice). Anything outside this set is 404'd.
const ALLOWED_V1 = new Set(["auth", "profile", "registration", "lookup", "files", "officer"]);

/** Public proxy paths that do NOT require an authenticated session. */
function isPublicProxyPath(segs: string[]): boolean {
  // Lookup microservice (/lookup/*) and the v1 lookup tables — reference data.
  if (segs[0] === "lookup") return true;
  if (segs[0] === "v1" && segs[1] === "lookup") return true;
  // Auth + registration + password-reset flows (login is at /api/auth/login).
  if (segs[0] === "v1" && segs[1] === "auth") return true;
  // Unauthenticated application status check: /v1/registration/{id}/status.
  if (
    segs[0] === "v1" &&
    segs[1] === "registration" &&
    segs[segs.length - 1] === "status"
  ) {
    return true;
  }
  return false;
}

// ---- In-memory per-IP rate limiting for sensitive endpoints ----------------
const RL_LIMIT = 15; // requests
const RL_WINDOW_MS = 60_000; // per minute, per (ip + path)
const hits = new Map<string, { count: number; resetAt: number }>();

// Endpoints worth throttling: login + every OTP / password-reset step.
const SENSITIVE = new Set([
  "/api/auth/login",
  "/api/proxy/v1/auth/register",
  "/api/proxy/v1/auth/verify-otp",
  "/api/proxy/v1/auth/resend-otp",
  "/api/proxy/v1/auth/forgot-password",
  "/api/proxy/v1/auth/verify-reset-otp",
  "/api/proxy/v1/auth/reset-password",
]);

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RL_LIMIT;
}

export function proxy(request: NextRequest): Response {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // 1. Method allowlist on the whole matched API surface.
  if (!ALLOWED_METHODS.has(method)) {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  // 1b. Same-origin (CORS/CSRF) gate. Reject any request bearing a foreign
  // Origin before it can reach the cookie-authenticated relay. We don't set any
  // Access-Control-* response headers, so legitimate cross-origin reads stay
  // blocked by the browser too.
  if (isDisallowedOrigin(request)) {
    return Response.json({ error: "cross_origin_forbidden" }, { status: 403 });
  }

  // 2. Rate-limit sensitive auth/OTP endpoints per client IP.
  if (SENSITIVE.has(pathname) && rateLimited(`${clientIp(request)}:${pathname}`)) {
    return Response.json({ error: "too_many_requests" }, { status: 429 });
  }

  // 3 + 4. Path allowlist + auth gate apply only to the backend relay surface.
  if (pathname.startsWith(PROXY_PREFIX)) {
    const segs = pathname.slice(PROXY_PREFIX.length).split("/").filter(Boolean);

    const pathAllowed =
      segs[0] === "lookup" ||
      (segs[0] === "v1" && ALLOWED_V1.has(segs[1] ?? ""));
    if (!pathAllowed) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    if (!isPublicProxyPath(segs)) {
      const hasCookie = Boolean(request.cookies.get("icrcs-access")?.value);
      const hasBearer = (request.headers.get("authorization") ?? "").startsWith(
        "Bearer ",
      );
      if (!hasCookie && !hasBearer) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/proxy/:path*", "/api/auth/:path*"],
};
