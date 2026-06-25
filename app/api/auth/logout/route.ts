// Server-side logout endpoint that clears the HttpOnly auth cookies and
// optionally invalidates the refresh token on the backend.

import { cookies } from "next/headers";

const BACKEND =
  process.env.BACKEND_API_BASE_URL ?? process.env.AUTH_API_BASE_URL ?? "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get("icrcs-refresh")?.value ?? "";

  // Clear cookies immediately regardless of backend outcome
  jar.delete("icrcs-access");
  jar.delete("icrcs-refresh");

  if (BYPASS || !refreshToken) {
    return Response.json({ success: true });
  }

  // Best-effort backend invalidation — don't block the logout on failure
  try {
    await fetch(`${BACKEND}/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // ignore — the user is logged out locally regardless
  }

  return Response.json({ success: true });
}
