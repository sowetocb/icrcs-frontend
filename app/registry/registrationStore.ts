// Local persistence for the citizen registration progress/stage.
// Stored in a SESSION cookie (not localStorage) so draft metadata clears when
// the browser closes and on logout. Large binary fields (photo data URLs) are
// never written — cookies have a ~4KB limit.

import {
  deleteClientCookie,
  getClientCookieJson,
  setClientCookieJson,
} from "@/lib/auth/clientCookies";

const KEY = "icrcs-registration";
/** Soft cap so we never blow the browser cookie size limit. */
const MAX_COOKIE_CHARS = 3500;

/** Keys that must never be persisted (data URLs / large blobs). */
const STRIP_DATA_KEYS = new Set([
  "passportPhotoData",
  "stage1PhotoData",
  "profilePhotoData",
]);

/** User's own unsent stage submit — queued after a connection failure only. */
export type PendingStageSubmit = {
  step: number;
  idempotencyKey: string;
  queuedAt: string;
};

export type RegistrationState = {
  step: number; // current form step the user is on
  maxStep?: number; // furthest step ever reached — drives sidebar navigation
  completed: boolean; // true once the wizard is submitted
  applicationId?: string;
  submittedDate?: string;
  stage?: number; // processing stage 0..4 once submitted
  ownerId?: string; // account holder (profileId) this draft belongs to
  subjectId?: string; // backend registration id from Stage 1, used by Stage 2+
  submittedStages?: number[]; // stages already POSTed (revisits use PUT /edit)
  registrationType?: string; // migrant category (MIGRANT/REFUGEE/…) — persisted
  // as metadata (NOT under `data`) so the migrant track survives a refresh
  // without keeping any sensitive form data in localStorage.
  /** Set when a stage submit failed due to connectivity; cleared on success. */
  pendingSubmit?: PendingStageSubmit;
  data?: Record<string, string | boolean>;
};

function stripHeavyFields(state: RegistrationState): RegistrationState {
  if (!state.data) return state;
  const data: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(state.data)) {
    if (STRIP_DATA_KEYS.has(k)) continue;
    if (typeof v === "string" && v.startsWith("data:")) continue;
    data[k] = v;
  }
  return { ...state, data };
}

function fitInCookie(state: RegistrationState): RegistrationState {
  const cleaned = stripHeavyFields(state);
  const full = JSON.stringify(cleaned);
  if (full.length <= MAX_COOKIE_CHARS) return cleaned;
  // Drop form field cache — submitted stages live on the backend and are
  // re-fetched on resume. Keep navigation / identity metadata only.
  const { data: _drop, ...meta } = cleaned;
  return meta;
}

export function loadRegistration(): RegistrationState | null {
  if (typeof window === "undefined") return null;
  try {
    return getClientCookieJson<RegistrationState>(KEY);
  } catch {
    return null;
  }
}

/**
 * Load the draft only when it belongs to the given owner (account holder) and,
 * if `subjectId` is provided, the same registration — so cached data is never
 * read for the wrong person (e.g. a previous account on the same browser, or a
 * different registration). A mismatched draft returns null.
 */
export function loadRegistrationFor(
  ownerId: string,
  subjectId?: string,
): RegistrationState | null {
  const state = loadRegistration();
  if (!state) return null;
  // An unidentified caller (empty ownerId — e.g. an officer, who has no citizen
  // profile) must never receive an owned draft: fail closed so it can't pick up
  // a different user's cached registration.
  if (!ownerId) return null;
  // A draft stamped with a different owner belongs to another person — ignore it.
  if (state.ownerId && state.ownerId !== ownerId) return null;
  // When a specific registration is expected, the draft must match it.
  if (subjectId && state.subjectId && state.subjectId !== subjectId) return null;
  return state;
}

/** Retrieve a saved draft by its Application ID. Used to resume a specific
 * unsubmitted registration (the data is cached and survives logout). */
export function loadRegistrationById(applicationId: string): RegistrationState | null {
  if (!applicationId) return null;
  const state = loadRegistration();
  return state && state.applicationId === applicationId ? state : null;
}

export function saveRegistration(state: RegistrationState): void {
  if (typeof window === "undefined") return;
  try {
    // Drop any leftover localStorage copy from older builds.
    window.localStorage.removeItem(KEY);
    setClientCookieJson(KEY, fitInCookie(state));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearRegistration(): void {
  if (typeof window === "undefined") return;
  try {
    deleteClientCookie(KEY);
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
