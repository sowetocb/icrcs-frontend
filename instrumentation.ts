// Runs once when a Next.js server instance boots (before it serves any request).
// We use it as a fail-closed production guard: the auth mock bypass must be
// impossible to ship enabled. See lib/api/auth.ts for the bypass itself.

export function register() {
  // NEXT_PUBLIC_AUTH_BYPASS is "off" only when it is exactly "false"; any other
  // value (including unset) makes lib/api/auth.ts mock every auth call and hand
  // out fake tokens — a total authentication bypass. Refuse to start in
  // production unless it is explicitly disabled.
  if (process.env.NODE_ENV === "production") {
    const bypass = process.env.NEXT_PUBLIC_AUTH_BYPASS;
    if (bypass !== "false") {
      throw new Error(
        "[boot] Refusing to start: NEXT_PUBLIC_AUTH_BYPASS must be \"false\" in " +
          `production (auth mock bypass is active). Current value: ${
            bypass === undefined ? "(unset)" : JSON.stringify(bypass)
          }.`,
      );
    }
  }
}
