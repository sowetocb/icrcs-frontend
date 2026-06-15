// Local persistence for the citizen registration progress/stage.
// Survives reloads so "Resume Registration" and the public status check
// reflect the applicant's real progress. Replace with the backend later.

const KEY = "icrcs-registration";

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
  data?: Record<string, string | boolean>;
};

export function loadRegistration(): RegistrationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RegistrationState) : null;
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
  // A draft stamped with a different owner belongs to another person — ignore it.
  if (ownerId && state.ownerId && state.ownerId !== ownerId) return null;
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
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearRegistration(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
