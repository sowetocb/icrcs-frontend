// Same-origin proxy to the backend API. The browser calls /api/proxy/... so it
// never makes a cross-origin request (avoids CORS); this server route forwards
// to ${BACKEND_API_BASE_URL}/... and relays the response. This is the single
// backend base for the whole app — auth, registration, profile, lookups, etc.
// (AUTH_API_BASE_URL kept as a fallback for backwards compatibility.)

const BACKEND =
  process.env.BACKEND_API_BASE_URL ?? process.env.AUTH_API_BASE_URL ?? "";

// The Lookup microservice is a separate host served under /lookup/* (no /v1,
// no auth). Any path whose first segment is "lookup" routes there; everything
// else (incl. /v1/lookup/* tables that stay on the main backend) hits BACKEND.
const LOOKUP = process.env.LOOKUP_API_BASE_URL ?? "";

/** Pick the upstream base for a proxied path. */
function upstreamFor(path: string[]): string {
  return path[0] === "lookup" && LOOKUP ? LOOKUP : BACKEND;
}

// ---- terminal logging -------------------------------------------------------
const truncate = (s: string, n = 800) =>
  s.length > n ? `${s.slice(0, n)}… (${s.length} bytes)` : s;

/** Mask password-like fields so secrets never hit the terminal. */
function redact(text: string): string {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") {
      for (const k of Object.keys(obj)) {
        if (/password|secret|token|otp/i.test(k)) obj[k] = "***";
      }
      return JSON.stringify(obj);
    }
  } catch {
    // not JSON — fall through
  }
  return text;
}

async function forward(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const base = upstreamFor(path);
  if (!base) {
    return Response.json(
      { error: "BACKEND_API_BASE_URL is not configured" },
      { status: 500 },
    );
  }

  const search = new URL(request.url).search;
  const target = `${base}/${path.join("/")}${search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const isMultipart = (contentType ?? "").includes("multipart/form-data");
  // Multipart uploads keep their (boundary-bearing) content-type. Every other
  // request body in this app is JSON — force the exact content-type the backend
  // requires (some platforms append "; charset=utf-8", which strict backends
  // reject with 415 "must be application/json").
  if (isMultipart) {
    if (contentType) headers.set("content-type", contentType);
  } else if (contentType) {
    headers.set("content-type", "application/json");
  }
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  // Forward the client's Accept (so binary assets like profile photos can be
  // requested with image/*); default to JSON for normal API calls.
  headers.set("accept", request.headers.get("accept") || "application/json");

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  // One line per outgoing request. Skip request-body logging for file uploads.
  const label = `${method} /${path.join("/")}${search}`;
  const reqBody =
    body && body.byteLength > 0 && !isMultipart
      ? redact(new TextDecoder().decode(body))
      : "";
  const started = Date.now();
  console.log(
    `[api] →  ${label}${reqBody ? ` ${truncate(reqBody, 400)}` : ""}`,
  );

  // The Cloudflare quick-tunnel drops connections intermittently (ETIMEDOUT /
  // fetch failed). Retry transient network failures on idempotent requests so a
  // flaky upstream doesn't surface as a 502 to the user. POST/PUT/etc. are not
  // retried (avoid duplicate writes).
  const idempotent = method === "GET" || method === "HEAD";
  const maxAttempts = idempotent ? 3 : 1;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(target, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
      const ms = Date.now() - started;
      const respType = res.headers.get("content-type") ?? "";
      const isTextual = /json|text|xml|javascript|urlencoded/i.test(respType);

      // Binary responses (e.g. profile photos) must be relayed as raw bytes —
      // decoding to text corrupts them.
      if (!isTextual) {
        const buf = await res.arrayBuffer();
        const note = `[${buf.byteLength}B ${respType || "binary"}]`;
        if (res.ok) console.log(`[api] ✓ ${res.status} ${label} (${ms}ms) ${note}`);
        else console.error(`[api] ✗ ${res.status} ${label} (${ms}ms) ${note}`);
        const out = new Response(buf, { status: res.status });
        if (respType) out.headers.set("content-type", respType);
        return out;
      }

      const text = await res.text();
      const respBody = text ? truncate(redact(text)) : "(empty)";
      if (res.ok) {
        console.log(`[api] ✓ ${res.status} ${label} (${ms}ms)\n[api]    ↩ ${respBody}`);
      } else {
        console.error(
          `[api] ✗ ${res.status} ${label} (${ms}ms)\n[api]    ↩ ${respBody}`,
        );
      }
      const out = new Response(text, { status: res.status });
      if (respType) out.headers.set("content-type", respType);
      return out;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
  }

  console.error(
    `[api] ✗ NETWORK ${label} — unreachable after ${maxAttempts} attempt(s) (${Date.now() - started}ms)`,
    lastErr,
  );
  return Response.json({ error: "upstream_unreachable" }, { status: 502 });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
