import type { RegistrationType } from "@/lib/api/registration";

/** The category the user picks at the start of registration.
 *
 * CITIZEN and FOREIGN run the existing citizen wizard (the backend's DOMESTIC /
 * FOREIGN registration types, chosen by place of birth; FOREIGN also passes the
 * travel-document gate). Every other category runs the MIGRANT flow — Stage 1
 * posts to /stage1/migrant with its own `registrationType` and collects travel
 * history, and Stage 2 collects the camp fields. */
export type RegistrationCategory =
  | "CITIZEN"
  | "FOREIGN"
  | "ASYLUM_SEEKER"
  | "REFUGEE"
  | "ALIEN"
  | "UNDOCUMENTED_MIGRANT"
  | "VOLUNTARY_RETURNEE";

/** Which registration flow a category runs. */
export type RegistrationTrack = "citizen" | "migrant";

export const CATEGORY_TRACK: Record<RegistrationCategory, RegistrationTrack> = {
  CITIZEN: "citizen",
  FOREIGN: "citizen",
  ASYLUM_SEEKER: "migrant",
  REFUGEE: "migrant",
  ALIEN: "migrant",
  UNDOCUMENTED_MIGRANT: "migrant",
  VOLUNTARY_RETURNEE: "migrant",
};

/** The `registrationType` sent to /stage1/migrant for migrant-track categories.
 * Citizen / Foreign are not migrant-track and have no entry here. */
export const CATEGORY_REGISTRATION_TYPE: Partial<
  Record<RegistrationCategory, RegistrationType>
> = {
  ASYLUM_SEEKER: "ASYLUM_SEEKER",
  REFUGEE: "REFUGEE",
  ALIEN: "ALIEN",
  UNDOCUMENTED_MIGRANT: "UNDOCUMENTED_MIGRANT",
  VOLUNTARY_RETURNEE: "VOLUNTARY_RETURNEE",
};

export const isMigrantCategory = (c: RegistrationCategory): boolean =>
  CATEGORY_TRACK[c] === "migrant";

/** The migrant-track registration types the backend can report on `/registration/all`.
 * Derived from CATEGORY_REGISTRATION_TYPE so there is a SINGLE source of truth for
 * which types are migrant — citizens come back as DOMESTIC / FOREIGN, which are
 * absent from that map and so are NOT migrant types. */
const MIGRANT_REGISTRATION_TYPES = new Set<RegistrationType>(
  Object.values(CATEGORY_REGISTRATION_TYPE).filter(
    (t): t is RegistrationType => t != null,
  ),
);

/** Coerce a backend `registrationType` string into the migrant `RegistrationType`
 * union, or `undefined` if it's a citizen type (DOMESTIC / FOREIGN) or unknown.
 * This is how resume determines the flow when the local draft cache is gone
 * (e.g. resuming on another device): the category is read from the backend, and
 * only a genuine migrant type routes the wizard into the migrant track. */
export function toMigrantRegistrationType(
  raw: string | undefined | null,
): RegistrationType | undefined {
  const v = (raw ?? "").trim().toUpperCase();
  return MIGRANT_REGISTRATION_TYPES.has(v as RegistrationType)
    ? (v as RegistrationType)
    : undefined;
}
