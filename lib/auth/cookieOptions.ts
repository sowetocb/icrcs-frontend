// Options for the HttpOnly auth cookies set by the /api/auth/* routes.
//
// `secure` is derived from the ACTUAL request protocol — not NODE_ENV. A Secure
// cookie is silently dropped by the browser over plain HTTP, which breaks auth
// on an HTTP-served deployment (login "succeeds" but every later request has no
// cookie → 403 → logout). Checking the real protocol keeps cookies Secure on
// genuine HTTPS (incl. behind a TLS-terminating proxy via x-forwarded-proto)
// while letting them function on an internal HTTP deployment.
//
// NOTE: serving this app over HTTPS is still the correct end state — over HTTP
// the cookie (and everything else) travels in cleartext.

export const ACCESS_TTL = 15 * 60; // 15 minutes
export const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days

function isHttps(request: Request): boolean {
  // Prefer the forwarded protocol set by a reverse proxy / ingress; fall back to
  // the request URL's own scheme.
  const fwd = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = fwd || new URL(request.url).protocol.replace(":", "");
  return proto === "https";
}

export function authCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: isHttps(request),
    sameSite: "lax" as const,
    path: "/",
  };
}
