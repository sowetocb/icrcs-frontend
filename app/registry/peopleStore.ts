// Everyone registered under the current account/profile. The first person is
// the account holder themselves.

const KEY = "icrcs-people";

export type PersonStatus = "in_progress" | "submitted";

export type Person = {
  applicationId: string;
  submittedDate: string;
  name: string;
  isCreator: boolean;
  status: PersonStatus;
  step?: number; // current/highest wizard step (1..6)
  data: Record<string, string | boolean>;
};

/** A person counts as "registered" once their declaration is submitted. Legacy
 * records saved before status existed are treated as submitted. */
export const isSubmitted = (p: Person) => p.status !== "in_progress";

export function loadPeople(): Person[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Person[]) : [];
  } catch {
    return [];
  }
}

/** Add or update a person by applicationId — so an in-progress registrant
 * appears on the people page from Stage 1 and is updated as stages advance. */
export function upsertPerson(person: Person): void {
  if (typeof window === "undefined") return;
  try {
    const people = loadPeople();
    const i = people.findIndex((p) => p.applicationId === person.applicationId);
    if (i >= 0) people[i] = { ...people[i], ...person };
    else people.push(person);
    window.localStorage.setItem(KEY, JSON.stringify(people));
  } catch {
    // ignore
  }
}

// Backwards-compatible helper used by older codepaths which called
// `addPerson({ applicationId, submittedDate, name, isCreator, data })`.
// Ensures `status` is set to `submitted` when adding a completed registration.
export function addPerson(person: Partial<Person> & { applicationId: string }): void {
  const full: Person = {
    applicationId: person.applicationId,
    submittedDate: person.submittedDate ?? new Date().toISOString(),
    name: person.name ?? "—",
    isCreator: person.isCreator ?? false,
    status: person.status ?? "submitted",
    step: person.step,
    data: person.data ?? {},
  };
  upsertPerson(full);
}

export function clearPeople(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
