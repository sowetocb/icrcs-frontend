import type { NextConfig } from "next";

// Security/hardening headers applied to every response. These reduce information
// leakage (framework, referrer), block clickjacking/MIME-sniffing, and lock down
// where the page may load resources from.
//
// NOTE on CSP: Next.js + Tailwind need inline <script>/<style>, so 'unsafe-inline'
// is kept; PDF generation (jsPDF/html2canvas) can need 'unsafe-eval'. img-src is
// widened to allow the (cross-origin) passport-photo file URLs. Tighten these if
// your deployment doesn't need them — test the app after any change.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "font-src 'self' data:",
  "connect-src 'self' http: https:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Don't let the browser guess content types (defeats some XSS vectors).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't render the app inside a frame elsewhere (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin on cross-origin requests — never full URLs/paths.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Force HTTPS once TLS is terminated in front of the app (harmless on HTTP).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // Emit a self-contained server build (.next/standalone/server.js) for the
  // Docker runner stage (COPY .next/standalone + `node server.js`).
  output: "standalone",

  // Don't advertise the framework via the "X-Powered-By: Next.js" header.
  poweredByHeader: false,

  // Never ship browser source maps in production — they'd reconstruct the
  // original (un-minified) source. The build stays minified-only client-side.
  productionBrowserSourceMaps: false,

  compiler: {
    // Strip client console.* in production (keep errors) so debug logs and any
    // internal data they reference don't leak to the browser console.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
