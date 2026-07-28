// Officer (government user) session — parallel to lib/auth/session.ts.
//
// Tokens: HttpOnly cookies (icrcs-officer-*) set by /api/officer/* — never JS.
// Officer profile + roles: SESSION cookies (cleared on logout / browser close).
// Never localStorage.

import {
  broadcastAuthChange,
  deleteClientCookie,
  getClientCookie,
  getClientCookieJson,
  purgeSensitiveLocalStorage,
  setClientCookie,
  setClientCookieJson,
  subscribeAuthBroadcast,
} from "./clientCookies";

export type OfficerUser = {
  userId?: string;
  username?: string;
  fullName?: string;
  email?: string;
  pfNo?: string;
  position?: string;
  regionName?: string;
  stationId?: number;
  stationName?: string;
  countryName?: string;
  roles: string[];
  permissions: string[];
};

const FLAG = "icrcs-officer-logged-in";
const USER = "icrcs-officer-user";

export function loadOfficer(): OfficerUser | null {
  if (typeof window === "undefined") return null;
  try {
    if (getClientCookie(FLAG) !== "1") return null;
    return getClientCookieJson<OfficerUser>(USER);
  } catch {
    return null;
  }
}

export function saveOfficer(user: OfficerUser): void {
  if (typeof window === "undefined") return;
  try {
    purgeSensitiveLocalStorage();
    const next: OfficerUser = {
      ...user,
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
    setClientCookie(FLAG, "1");
    setClientCookieJson(USER, next);
    broadcastAuthChange({ kind: "officer", loggedIn: true });
  } catch {
    // ignore
  }
}

/** Merge identity fields from GET /v1/officer/profile into the session cookie. */
export function hydrateOfficerProfile(
  profile: Partial<OfficerUser> & { fullName?: string },
): void {
  if (typeof window === "undefined") return;
  if (getClientCookie(FLAG) !== "1") return;
  const prev = loadOfficer() ?? { roles: [], permissions: [] };
  saveOfficer({
    ...prev,
    ...profile,
    roles: prev.roles,
    permissions: prev.permissions,
  });
}

export function clearOfficer(): void {
  if (typeof window === "undefined") return;
  try {
    deleteClientCookie(FLAG);
    deleteClientCookie(USER);
    deleteClientCookie("icrcs_user");
    purgeSensitiveLocalStorage();
    broadcastAuthChange({ kind: "officer", loggedIn: false });
  } catch {
    // ignore
  }
}

export const isOfficer = (): boolean => {
  if (typeof window === "undefined") return false;
  return getClientCookie(FLAG) === "1";
};

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

export const ICRCS_REGISTER_PERMISSION = "ICRCS_REGISTRATION";
export const ICRCS_OFFICER_ROLE = "ICRCS_OFFICER";

/** Whether the signed-in officer is authorized to register in ICRCS. */
export function officerCanRegisterIcrcs(): boolean {
  return (
    officerHasPermission(ICRCS_REGISTER_PERMISSION) ||
    officerHasRole(ICRCS_OFFICER_ROLE)
  );
}

/** Subscribe to cross-tab officer-session changes (log-in/out in another tab). */
export function subscribeOfficer(onChange: (loggedIn: boolean) => void): () => void {
  return subscribeAuthBroadcast((d) => {
    if (d.kind === "officer") onChange(d.loggedIn);
  });
}
