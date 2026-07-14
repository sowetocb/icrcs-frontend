// Officer (government user) session — parallel to lib/auth/session.ts.
//
// Officer authentication is a SEPARATE service (the User Management API,
// username-based) from the citizen flow. Its access/refresh tokens live in
// their own HttpOnly cookies (icrcs-officer-*) set by the /api/officer/* proxy
// routes, so tokens never reach JavaScript. This module only tracks a shared
// "logged-in" flag plus the cached officer profile (roles/permissions) used for
// UI gating. Like the citizen session it lives in localStorage so it is shared
// across tabs and emits cross-tab `storage` events.

export type OfficerUser = {
  userId?: string;
  username?: string;
  fullName?: string;
  stationId?: number;
  stationName?: string;
  roles: string[];
  permissions: string[];
};

const FLAG = "icrcs-officer-logged-in";
const USER = "icrcs-officer-user";

export function loadOfficer(): OfficerUser | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(FLAG) !== "1") return null;
    const raw = window.localStorage.getItem(USER);
    const parsed = raw ? (JSON.parse(raw) as Partial<OfficerUser>) : {};
    return { roles: [], permissions: [], ...parsed };
  } catch {
    return null;
  }
}

export function saveOfficer(user: OfficerUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLAG, "1");
    window.localStorage.setItem(USER, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearOfficer(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FLAG);
    window.localStorage.removeItem(USER);
  } catch {
    // ignore
  }
}

export const isOfficer = (): boolean => loadOfficer() !== null;

/** Case-insensitive permission check against the cached officer profile. The
 * authoritative check is server-side (User Management /verify-token); this only
 * gates what the UI offers. */
export function officerHasPermission(permission: string): boolean {
  const o = loadOfficer();
  if (!o) return false;
  const want = permission.trim().toUpperCase();
  return o.permissions.some((p) => p.trim().toUpperCase() === want);
}

export function officerHasRole(role: string): boolean {
  const o = loadOfficer();
  if (!o) return false;
  const want = role.trim().toUpperCase();
  return o.roles.some((r) => r.trim().toUpperCase() === want);
}

/** Subscribe to cross-tab officer-session changes (log-in/out in another tab).
 * Mirrors subscribeSession in lib/auth/session.ts. */
export function subscribeOfficer(onChange: (loggedIn: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === FLAG) onChange(isOfficer());
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
