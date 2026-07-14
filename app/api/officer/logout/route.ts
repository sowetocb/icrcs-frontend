// Officer logout — revokes the officer refresh token at the User Management API
// (Authorization: Bearer <officer access token> + { refresh_token }) and clears
// the officer HttpOnly cookies. Best-effort: cookies are cleared regardless of
// the upstream result so the browser session always ends.

import { cookies } from "next/headers";

const USER_MGT = process.env.USER_MGT_API_BASE_URL ?? "";
const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";

export async function POST(request: Request) {
  const jar = await cookies();
  const accessToken = jar.get("icrcs-officer-access")?.value ?? "";
  const refreshToken = jar.get("icrcs-officer-refresh")?.value ?? "";

  if (!BYPASS && refreshToken) {
    try {
      await fetch(`${USER_MGT}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // ignore — local cookies are cleared regardless
    }
  }

  jar.delete("icrcs-officer-access");
  jar.delete("icrcs-officer-refresh");
  return Response.json({ success: true });
}
