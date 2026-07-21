"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardProvider } from "@/components/registry/field";
import Stepper from "@/components/registry/stepper";
import HelpfulTip from "@/components/registry/helpfulTip";
import { useI18n } from "../i18n/localeProvider";
import { loadRegistration, loadRegistrationFor, saveRegistration } from "./registrationStore";
import { useUnsavedChanges } from "./useUnsavedChanges";
import { loadProfile, saveProfile, type Profile } from "@/lib/auth/profile";
import { refreshMyProfile } from "@/lib/api/auth";
import { emailApplicationId } from "./emailApplicationId";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import {
  submitStage1,
  submitStage2,
  submitStage3,
  submitStage4,
  submitStage5,
  submitStage6,
  submitStage7,
  submitStage8,
  submitStage9,
  editStage1,
  editStage2,
  editStage3,
  editStage4,
  editStage5,
  editStage6,
  editStage8,
  submitStage1Migrant,
  editStage1Migrant,
  submitTravelHistory,
  editTravelHistory,
  getTravelHistory,
  uploadPassportPhoto,
  getStage9Preview,
  getStageData,
  setRegistrationOfficerMode,
} from "@/lib/api/registration";
import type { RegistrationType } from "@/lib/api/registration";
import { isOfficer } from "@/lib/auth/officerSession";
import { reviewToForm } from "@/lib/registry/reviewToForm";
import { stageToForm, travelHistoryToForm } from "@/lib/registry/stageToForm";
import { mapApiFieldErrors } from "@/lib/registry/errorFields";
import { localizeBackendMessage } from "@/lib/api/errorMessagesSw";
import { useToast } from "@/components/ui/toast";
import { resolveGenderCode, getPersonDocumentTypes, getEducationLevels, type PersonGroup } from "@/lib/api/lookup";
import { isPhoneComplete } from "@/lib/phoneLengths";
import { RULES, docNumberRuleFor, type DocNumberRule } from "@/lib/validation/rules";
import { SessionExpiredError } from "@/lib/api/auth";
import { setSignoutNotice } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/api/client";
import ApplicationIdDialog from "./applicationIdDialog";
import StepPersonal from "./steps/stepPersonal";
import StepAddress from "./steps/stepCitizenship";
import StepGuardian from "./steps/stepGuardian";
import StepEducation from "./steps/stepEducation";
import StepEmergency from "./steps/stepEmergency";
import StepFamily from "./steps/stepFamily";
import StepReferees from "./steps/stepReferees";
import StepAttachments, { parseAttachments } from "./steps/stepAttachments";
import StepPreviewDeclaration from "./steps/stepPreviewDeclaration";
import StageSkeleton from "@/components/registry/stageSkeleton";
import {
  ATTACHMENT_TYPES,
  PASSPORT_PHOTO_TYPE,
  MANDATORY_ATTACHMENT_TYPE_IDS,
  PARENT_BIRTH_CERT_TYPE_IDS,
  setFilesOfficerMode,
  type UploadedAttachment,
} from "@/lib/api/files";

const TOTAL = 9;
// The Referees stage (step 7) is GET-only and accepts no user input, so it is
// removed from the wizard flow: navigation skips it and the stepper hides it.
// Internal step numbers stay 1:1 with the backend stages (submit/resume/sync are
// untouched); the stage-7 GET is still traversed silently for backend sequencing.
const REFEREE_STEP = 7;
const skipReferee = (n: number): number => (n === REFEREE_STEP ? REFEREE_STEP + 1 : n);

const STEP_COMPONENTS = [
  StepPersonal,       // 1
  StepAddress,        // 2
  StepGuardian,       // 3
  StepEducation,      // 4
  StepEmergency,      // 5
  StepFamily,         // 6
  StepReferees,       // 7
  StepAttachments,    // 8
  StepPreviewDeclaration, // 9
];

// Middle name is OPTIONAL for every person at every stage — only First and Last
// are required. (Middle still validates its FORMAT when provided; see blur().)
const nameFields = (p: string) => [`${p}First`, `${p}Last`];

// Required field names for each step (declaration is gated by its checkbox).
const REQUIRED_FIELDS: string[][] = [
  // Step 1: Personal Information
  [
    ...nameFields("applicant"),
    "stage1PhotoData",
    "gender",
    "dob",
    "nationalityCountry",
    "pobCountry",
    "marriage",
    "phone",
    "email",
    // Physical characteristics required by v002 (all categories).
    "eyeColor",
    "hairColor",
    "languageSpoken",
  ],
  // Step 2: Address (permanent Region/District/Ward; current added when unlinked)
  ["permRegion", "permDistrict", "permWard"],
  // Step 3: Parents — full names, DOB, nationality, residence country required.
  [
    ...nameFields("father"),
    "fatherGender",
    "fatherDob",
    "fatherNatCountry",
    "fatherResCountry",
    ...nameFields("mother"),
    "motherGender",
    "motherDob",
    "motherNatCountry",
    "motherResCountry",
  ],
  // Step 4: Education & Employment — employment status is mandatory (the backend
  // requires it); school is validated separately ("at least one if attended").
  ["jobStatus"],
  // Step 5: Emergency Contacts — the backend requires AT LEAST ONE contact
  // (RULES.EMERGENCY_CONTACTS_MIN = 1). So only the first contact's fields are
  // always required; the second is optional and validated conditionally (see
  // ec2Active in missingFields) — required in full only once the user starts it.
  [
    "ec1RelType",
    ...nameFields("ec1"),
    "ec1Gender",
    "ec1Phone",
    "ec1NatCountry",
    "ec1ResCountry",
  ],
  // Step 6: Family — at least two relatives (full name + dob + gender + nationality +
  // residence country; phone is optional per backend; cascade is in missingFields)
  [
    "rel1RelType",
    ...nameFields("rel1"),
    "rel1Dob",
    "rel1Gender",
    "rel1NatCountry",
    "rel1ResCountry",
    "rel2RelType",
    ...nameFields("rel2"),
    "rel2Dob",
    "rel2Gender",
    "rel2NatCountry",
    "rel2ResCountry",
  ],
  // Step 7: Referees (print only — no required fields)
  [],
  // Step 8: Uploads
  [],
  // Step 9: Preview & Declaration
  [],
];

// Migrant flow only: stages 4–6 open with a "do you have this info?" question.
// Answering NO skips the whole stage (no fields, no validation, empty submit);
// YES reveals the normal form. Keyed by step → the boolean gate field.
// Stage 4 is NOT a whole-stage gate: employment is always required/submitted on
// the migrant track, and only the EDUCATION section is gated (locally, inside
// stepEducation via `mHasEducation`). Stages 5 & 6 are fully skippable.
const MIGRANT_STAGE_GATE: Record<number, string> = {
  5: "mHasEmergency",
  6: "mHasFamily",
};

// Data-key prefixes cleared when a migrant answers NO to a stage gate, so the
// (now hidden) stage submits empty even if fields were filled before toggling.
const MIGRANT_STAGE_CLEAR: Record<number, RegExp> = {
  5: /^ec\d/,
  6: /^(rel\d|sp\d|ch\d|isMarried|hasChildren|relativeCount|spouseCount|childCount)/,
};

// The account holder's personal details are locked on their own registration.
const PERSONAL_LOCK = [
  "applicantFirst",
  "applicantMiddle",
  "applicantLast",
  "gender",
  "phone",
  "email",
];
// Dependents inherit (and cannot edit) the account holder's contact details.
const CONTACT_LOCK = ["phone", "email"];

// Allowed characters in any name field (First / Middle / Last).
// Uses the canonical pattern from rules.ts so the wizard and schemas agree.
const NAME_RE = RULES.NAME_PATTERN;

function isFutureDate(dob: string): boolean {
  const parts = dob.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return birth.getTime() > today.getTime();
}

function isAtLeastAge(dob: string, minAge: number): boolean {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= minAge;
}
function isAtLeast18(dob: string): boolean { return isAtLeastAge(dob, RULES.CONTACT_MIN_AGE); }
function isAtLeast16(dob: string): boolean { return isAtLeastAge(dob, RULES.SPOUSE_MIN_AGE); }

/** True when the given DOB implies an age above the backend's absolute maximum. */
function isExceedsMaxAge(dob: string): boolean {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const years = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years > RULES.MAX_AGE_YEARS;
}

/** True when `olderDob` is at least `years` years before `youngerDob`. Unknown/
 * unparseable dates pass (the check is skipped). */
function atLeastYearsOlder(olderDob: string, youngerDob: string, years: number): boolean {
  const older = new Date(olderDob);
  const younger = new Date(youngerDob);
  if (Number.isNaN(older.getTime()) || Number.isNaN(younger.getTime())) return true;
  const threshold = new Date(older);
  threshold.setFullYear(threshold.getFullYear() + years);
  return threshold.getTime() <= younger.getTime();
}

function profileToPersonal(p: Profile): Record<string, string | boolean> {
  return {
    applicantFirst: p.firstName,
    applicantMiddle: p.middleName,
    applicantLast: p.lastName,
    gender: p.gender,
    phone: p.phoneNumber,
    email: p.email,
  };
}

export default function RegistryWizard({
  selfDone,
  registeringMinor = false,
  minorRelationship = "",
  foreignMinor = false,
  registrationType,
  onExit,
  onComplete,
}: {
  selfDone: boolean;
  /** A non-citizen (foreign) profile registering a Tanzanian-origin minor. The
   * account holder is NOT the subject, so their personal details are neither
   * prefilled nor locked, and the subject is validated as a minor. */
  registeringMinor?: boolean;
  /** When registering a minor, the registrant's relationship to them, chosen at
   * the gate ("guardian" | "parent"). Drives Stage 3 (Parents vs Guardian). */
  minorRelationship?: "guardian" | "parent" | "";
  /** A Tanzanian citizen registering a FOREIGN MINOR: same as a Tanzanian-minor
   * registration except the minor's nationality is freely picked, not locked to
   * Tanzania. */
  foreignMinor?: boolean;
  /** Migrant-track category (MIGRANT / REFUGEE / ASYLUM_SEEKER) chosen at the
   * category picker; undefined for the citizen track. Accepted now so the picker
   * can route through here; the migrant Stage-1 endpoint + steps are wired in a
   * later phase. */
  registrationType?: RegistrationType;
  onExit: () => void;
  onComplete: (
    data: Record<string, string | boolean>,
    applicationId: string,
    subjectId: string,
  ) => void;
}) {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();

  // The first registration under a profile is the account holder themselves —
  // EXCEPT when a foreign profile is registering a minor, where the subject is a
  // dependent, not the account holder. Derived (not state) so it reacts when
  // selfDone updates asynchronously after the backend sync confirms the account
  // holder's registration exists.
  const isFirstPerson = !selfDone && !registeringMinor;
  // Contact details are inherited (not the names) when the subject isn't the
  // account holder — i.e. a normal dependent or a foreign profile's minor.
  const inheritsContact = selfDone || registeringMinor;
  // Profile is fetched from the backend on mount — never from localStorage.
  // This avoids relying on stale cached data for sensitive information.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(() => !isOfficer());
  const ownerId = profile?.profileId ?? loadProfile()?.profileId ?? "";
  const locked = profile ? (isFirstPerson ? PERSONAL_LOCK : CONTACT_LOCK) : [];

  // Resolve the in-progress draft ONCE and reuse it for every init value, so
  // step / subjectId / submittedStages stay consistent. The draft stores ONLY
  // navigation metadata (step, subjectId, submittedStages, applicationId) —
  // never sensitive form data. Form data is always fetched from the backend.
  const [draft] = useState(() => loadRegistrationFor(ownerId) ?? loadRegistration());
  const resumable = draft && !draft.completed ? draft : null;

  const [step, setStep] = useState(() => skipReferee(resumable?.step ?? 1));
  const [data, setData] = useState<Record<string, string | boolean>>(() => {
    // Start with minimal non-sensitive defaults. The backend-fetched profile
    // will populate personal fields via the mount effect below.
    const base: Record<string, string | boolean> = {};
    // Recover the migrant category from EITHER draft convention: the top-level
    // metadata field OR the legacy `data.registrationType` (different save paths
    // and the resume seeds write it in different places). This must survive a
    // refresh — when the registryClient prop is gone — or the wizard forgets it
    // is a migrant registration (uploads wrongly become mandatory, migrant-only
    // fields disappear, etc.).
    const draftRegType =
      resumable?.registrationType ||
      (typeof resumable?.data?.registrationType === "string"
        ? resumable.data.registrationType
        : "");
    const regType = draftRegType || registrationType || "";
    // Officers registering migrants must NOT get a pre-filled nationality — the
    // migrant's nationality needs to be selected by the officer. A foreign minor
    // likewise has a freely-picked nationality (not Tanzania).
    if ((isOfficer() && regType) || foreignMinor) {
      base.nationalityCountry = "";
    } else {
      base.nationalityCountry = "Tanzania";
    }
    // Migrants/refugees/asylum seekers are non-citizens (citizenshipTypeId 2);
    // the citizen track stays 1.
    base.citizenshipTypeId = regType ? "2" : "1";
    // The registrationType must survive refresh — stored in the draft metadata.
    base.registrationType = regType;
    return base;
  });

  // The active category: the draft's stored value (survives refresh/resume) wins,
  // falling back to the prop for a freshly-picked category.
  const activeRegistrationType: RegistrationType | undefined =
    (typeof data.registrationType === "string" && data.registrationType
      ? (data.registrationType as RegistrationType)
      : registrationType) || undefined;
  // Migrant track (Migrant / Refugee / Asylum Seeker). Drives the Stage-1 migrant
  // endpoint + travel-history submission and the migrant-only fields in the steps.
  const isMigrant = !!activeRegistrationType;
  const [errors, setErrors] = useState<string[]>([]);
  // Specific per-field messages (email format, DOB, NIDA, …). Fields in `errors`
  // without an entry here fall back to a generic "required" message at the field.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  // Bumped each time a SAVE is attempted (and only then). The error-focus effect
  // keys off this — not off `errors` directly — so that focus moves to the first
  // problem only on a save, never while the user is typing (which continuously
  // shrinks `errors` as fields become valid and would otherwise yank focus from
  // field to field). See the focus effect below.
  const [saveAttempt, setSaveAttempt] = useState(0);
  // True while a submitted stage's data is being re-fetched from the backend, so
  // the step renders a skeleton instead of empty/stale fields until it arrives.
  const [stageLoading, setStageLoading] = useState(false);
  // True once the user edits a field and false again after the data is saved —
  // drives the "unsaved changes" reminder when leaving the page.
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty, t("registry.unsavedWarning"));
  // Stages already hydrated from the backend this session — the skeleton only
  // blocks the FIRST load; later visits already have the data, so it never
  // reappears (the refresh then happens silently behind the populated form).
  const hydratedStages = useRef<Set<number>>(new Set());
  // documentTypeId values for NIDA and TIN, cached so blur() can distinguish
  // them from other doc types synchronously without an async lookup.
  const nidaTypeIds = useRef<Set<number>>(new Set());
  const tinTypeIds  = useRef<Set<number>>(new Set());
  // Per-document-type number rule (length/charset), keyed by the backend type id,
  // so blur() can length-check any document type (Driving Licence / Voter's ID /
  // Birth Certificate, …), not just NIDA/TIN.
  const docRuleById = useRef<Map<number, DocNumberRule>>(new Map());
  // Readable labels of the fields the user skipped on the current step, shown
  // so they know specifically what to go back and fill.
  const [applicationId, setApplicationId] = useState(
    () => resumable?.applicationId ?? "",
  );
  const [showIdDialog, setShowIdDialog] = useState(false);
  // When a backend call fails because the session expired, show a blocking
  // dialog that signs the user out (the session is already cleared).
  const [submitting, setSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState(() => resumable?.subjectId ?? "");
  const [submittedStages, setSubmittedStages] = useState<Set<number>>(
    () => new Set(resumable?.submittedStages ?? []),
  );
  // When the user jumps back to an earlier stage for editing, we remember
  // the stage they came from so that after saving they are returned to it.
  const [returnStep, setReturnStep] = useState<number | null>(null);
  // Furthest step the user has ever reached. Drives sidebar navigation so they
  // can jump back and forth across everything they've already visited — even
  // after stepping back to edit an earlier stage. Recovered from the draft's
  // saved frontier (plus any submitted stages) on resume.
  const [maxStep, setMaxStep] = useState(() =>
    Math.max(
      resumable?.maxStep ?? 1,
      resumable?.step ?? 1,
      ...(resumable?.submittedStages ?? []),
    ),
  );
  // Route every stage submit to the officer namespace (/v1/officer/registration/*)
  // when a government officer is registering, or the citizen namespace otherwise.
  // Set before any submit can fire (submits require user interaction post-mount).
  useEffect(() => {
    const officer = isOfficer();
    setRegistrationOfficerMode(officer);
    // File uploads (passport photo + Stage 8 documents) must also route to the
    // officer namespace so the proxy attaches the officer cookie — otherwise the
    // upload hits /v1/files/upload with no officer auth and returns 401.
    setFilesOfficerMode(officer);
    return () => {
      setRegistrationOfficerMode(false);
      setFilesOfficerMode(false);
    };
  }, []);

  // Whenever the current step advances past the known frontier, push it out.
  useEffect(() => {
    setMaxStep((m) => Math.max(m, step));
  }, [step]);

  // Fetch the profile from the backend on mount — the single source of truth
  // for the account holder's personal details. If this fails, the form stays
  // empty and the user is informed politely. Never fall back to localStorage.
  useEffect(() => {
    // Officers register migrants (no citizen profile) — skip the fetch.
    if (isOfficer()) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await refreshMyProfile();
        if (cancelled) return;
        setProfile(fresh);
        // Populate personal fields from the backend-fetched profile.
        setData((d) => {
          const next = { ...d };
          if (isFirstPerson) {
            const personal = profileToPersonal(fresh);
            for (const [k, v] of Object.entries(personal)) {
              if (!next[k] || next[k] === "") next[k] = v;
            }
          } else if (inheritsContact) {
            if (!next.phone || next.phone === "") next.phone = fresh.phoneNumber;
            if (!next.email || next.email === "") next.email = fresh.email;
          }
          // Bind nationality from the backend profile (not from cache). A foreign
          // minor keeps its freely-picked nationality — don't force Tanzania.
          if (!(isOfficer() && registrationType) && !foreignMinor) {
            next.nationalityCountry = isFirstPerson
              ? (fresh.nationality || "Tanzania")
              : "Tanzania";
          }
          return next;
        });
      } catch {
        if (!cancelled) {
          setFormError(t("registry.profileLoadError"));
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist navigation metadata (NOT form data) on every step change so a hard
  // refresh restores the exact stage the user is on.
  useEffect(() => {
    saveRegistration({
      step,
      maxStep: Math.max(maxStep, step),
      completed: false,
      ownerId: ownerId || undefined,
      applicationId: applicationId || undefined,
      subjectId: subjectId || undefined,
      submittedStages: [...submittedStages],
      registrationType: typeof data.registrationType === "string" ? data.registrationType : undefined,
      // No `data` field — sensitive form data is never stored in localStorage.
    });
    // Runs on step change only; captures the latest identity from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Re-hydrate an already-submitted stage from the backend when the user returns
  // to it (e.g. resuming on a fresh browser, or going back to edit). The API is
  // the ONLY source of truth for a submitted stage — if the fetch fails, the
  // form stays empty and the user is informed. No fallback to cached data.
  useEffect(() => {
    if (!subjectId || !submittedStages.has(step)) {
      setStageLoading(false);
      return;
    }
    let cancelled = false;
    // Show the skeleton only the first time this stage is hydrated; on later
    // visits the data is already present, so refresh without blocking the form.
    const firstLoad = !hydratedStages.current.has(step);
    if (firstLoad) setStageLoading(true);
    (async () => {
      try {
        const raw = await getStageData(subjectId, step);
        if (cancelled) return;
        if (!raw) {
          // The backend returned no data — inform the user.
          setFormError(t("registry.stageLoadError"));
          return;
        }
        const mapped = await stageToForm(step, raw);
        // Migrant Stage 1 stores Travel History on a SEPARATE endpoint, so pull
        // it alongside the stage data and merge it in — otherwise the whole
        // Travel History section resumes blank on a fresh device.
        if (step === 1 && isMigrant) {
          const th = await getTravelHistory(subjectId).catch(() => null);
          if (th) Object.assign(mapped, await travelHistoryToForm(th));
        }
        if (cancelled) return;
        const hasData = Object.keys(mapped).length > 0;
        // The gate on a migrant's stages 4/5/6 must reflect the server on resume:
        // data present → open on "Yes" (so it's shown); a submitted-but-empty
        // stage (answered "No") → "No". So even an empty response is applied when
        // there's a gate to settle. Nothing to do only when neither applies.
        const gate = isMigrant ? MIGRANT_STAGE_GATE[step] : undefined;
        if (!hasData && !gate) return;
        setData((d) => {
          const next = { ...d };
          // `mapped` only holds keys derived from the API response, so assigning
          // them all reflects the server data exactly without wiping unrelated
          // local fields.
          for (const [k, v] of Object.entries(mapped)) next[k] = v;
          if (gate) {
            if (hasData) next[gate] = true;
            // Only settle an UNSET gate to "No" — never override the user's own
            // in-session choice.
            else if (next[gate] !== true && next[gate] !== false) next[gate] = false;
          }
          // Stage 4's EDUCATION section has its own local gate (mHasEducation),
          // not a whole-stage gate. Open it on resume when the server returned
          // schooling so the fetched entries show; employment renders regardless.
          if (isMigrant && step === 4) {
            const hasEducation =
              next.neverAttendedSchool === false ||
              Object.keys(mapped).some((k) => /^edu\d/.test(k));
            if (hasEducation && next.mHasEducation !== true) next.mHasEducation = true;
          }
          return next;
        });
        // Mark hydrated so the skeleton never blocks this stage again — it
        // perishes for good once the data has been successfully fetched.
        hydratedStages.current.add(step);
      } catch {
        // The backend is unreachable — inform the user politely and leave
        // the form empty rather than showing stale cached data.
        if (!cancelled) {
          setFormError(t("registry.stageLoadError"));
        }
      } finally {
        if (!cancelled) setStageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, subjectId]);

  // The Preview & Declaration step renders its summary from the local `data`,
  // but the per-step effect above only hydrates the stage the user has actually
  // visited. Resuming on a fresh browser and landing straight on the preview
  // would then show only Personal Information (which also falls back to the
  // cross-browser profile) while every other section sits empty. So when the
  // preview is reached, pull EVERY submitted form stage from the backend and
  // merge it into `data` — the summary then reflects all the server has stored.
  useEffect(() => {
    if (step !== TOTAL || !subjectId) return;
    let cancelled = false;
    (async () => {
      // Stages 1–6 carry form data; 7 (referees), 8 (uploads) and 9 (preview)
      // have none. Hydrate any submitted stage not already loaded this session
      // (so freshly-edited, already-hydrated stages aren't clobbered).
      const pending = [1, 2, 3, 4, 5, 6].filter(
        (n) => submittedStages.has(n) && !hydratedStages.current.has(n),
      );
      for (const n of pending) {
        const raw = await getStageData(subjectId, n);
        if (cancelled) return;
        if (!raw) continue;
        const mapped = await stageToForm(n, raw);
        if (cancelled) return;
        const hasData = Object.keys(mapped).length > 0;
        const gate = isMigrant ? MIGRANT_STAGE_GATE[n] : undefined;
        if (!hasData && !gate) continue;
        setData((d) => {
          const next = { ...d };
          for (const [k, v] of Object.entries(mapped)) next[k] = v;
          // Gated migrant stage: data present → "Yes"; submitted but empty →
          // "No" (only when the gate is still unset — never override a choice).
          if (gate) {
            if (hasData) next[gate] = true;
            else if (next[gate] !== true && next[gate] !== false) next[gate] = false;
          }
          // Stage 4 education local gate — open it when schooling came back.
          if (isMigrant && n === 4) {
            const hasEducation =
              next.neverAttendedSchool === false ||
              Object.keys(mapped).some((k) => /^edu\d/.test(k));
            if (hasEducation && next.mHasEducation !== true) next.mHasEducation = true;
          }
          return next;
        });
        hydratedStages.current.add(n);
      }
      // Migrant Travel History lives on its own endpoint — pull it for the
      // preview so the summary reflects it (Stage 1 must have been submitted).
      if (isMigrant && submittedStages.has(1)) {
        const th = await getTravelHistory(subjectId).catch(() => null);
        if (cancelled) return;
        if (th) {
          const mapped = await travelHistoryToForm(th);
          if (cancelled) return;
          if (Object.keys(mapped).length > 0) {
            setData((d) => {
              const next = { ...d };
              for (const [k, v] of Object.entries(mapped)) next[k] = v;
              return next;
            });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, subjectId, submittedStages]);

  // Pre-load NIDA and TIN type IDs once so blur() can validate them
  // synchronously without an async lookup on every keystroke.
  useEffect(() => {
    getPersonDocumentTypes()
      .then((types) => {
        const nida = new Set<number>();
        const tin  = new Set<number>();
        const ruleMap = new Map<number, DocNumberRule>();
        for (const docs of Object.values(types)) {
          for (const d of docs) {
            const code = (d.code ?? "").toUpperCase();
            const name = (d.name ?? "").toUpperCase();
            if (code.includes("NIDA") || name.includes("NIDA")) nida.add(d.id);
            if (/\bTIN\b/.test(code) || /\bTIN\b/.test(name))  tin.add(d.id);
            ruleMap.set(d.id, docNumberRuleFor(name || code));
          }
        }
        nidaTypeIds.current = nida;
        tinTypeIds.current  = tin;
        docRuleById.current = ruleMap;
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a SAVE raises errors, shift focus to where the problem is: scroll the
  // topmost invalid field into view and focus it (so the user lands exactly on
  // it). Falls back to the form-level banner when no field marker matches.
  //
  // This intentionally keys off `saveAttempt` (bumped only on a save click), NOT
  // off `errors`. Keying off `errors` re-ran on every keystroke: as the user
  // typed and each field's error cleared, the effect would fire again and steal
  // focus to the next still-invalid field — splitting a name across fields.
  useEffect(() => {
    if (saveAttempt === 0) return;
    if (errors.length === 0 && !formError) return;
    const id = window.setTimeout(() => {
      // Collect the in-DOM markers for the errored fields (an input to focus,
      // or its error message), then pick whichever sits highest on the page.
      const found: HTMLElement[] = [];
      for (const name of errors) {
        const sel = `[data-field="${CSS.escape(name)}"], [data-field-error="${CSS.escape(name)}"]`;
        const el = document.querySelector<HTMLElement>(sel);
        if (el && !found.includes(el)) found.push(el);
      }
      const target =
        found.sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        )[0] || document.querySelector<HTMLElement>("[data-form-error]");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus the field itself when the marker is a focusable control.
      if (target.matches("input, select, textarea, button")) {
        target.focus({ preventScroll: true });
      }
    }, 50);
    return () => window.clearTimeout(id);
    // Reads `errors`/`formError` but is gated on `saveAttempt` so it runs only
    // on a save, not on every keystroke that mutates the error list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAttempt]);

  // The account holder's gender (prefilled from the profile, then locked) must be
  // the M/F/O code the gender select uses. A profile cached before normalisation
  // may carry a lookup id ("1"), a name ("MALE"), or — if it was saved before the
  // backend's gender shape was handled — nothing at all. Normalise what we have;
  // if it's empty/unresolved, refetch the (now correctly mapped) profile.
  useEffect(() => {
    if (!isFirstPerson) return;
    const g = typeof data.gender === "string" ? data.gender.trim() : "";
    if (/^[MFO]$/i.test(g)) return; // already a valid code
    let cancelled = false;
    (async () => {
      if (g) {
        const code = await resolveGenderCode(g);
        if (cancelled) return;
        if (/^[MFO]$/i.test(code)) {
          setData((d) => ({ ...d, gender: code }));
          return;
        }
      }
      // Empty or unresolved — use the profile fetched on mount. Officers
      // register migrants (no citizen profile) — nothing to resolve.
      if (isOfficer()) return;
      if (profile) {
        const code = await resolveGenderCode(profile.gender);
        if (!cancelled && code) setData((d) => ({ ...d, gender: code }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // A subject who isn't the account holder (a dependent — including a minor)
  // inherits the account holder's phone & email from the backend-fetched profile.
  useEffect(() => {
    if (!inheritsContact || !profile) return;
    setData((d) => {
      const phone = typeof d.phone === "string" ? d.phone.trim() : "";
      const email = typeof d.email === "string" ? d.email.trim() : "";
      const nextPhone = !phone && profile.phoneNumber ? profile.phoneNumber : d.phone;
      const nextEmail = !email && profile.email ? profile.email : d.email;
      if (nextPhone === d.phone && nextEmail === d.email) return d;
      return { ...d, phone: nextPhone, email: nextEmail };
    });
    // Re-run when the profile arrives from the backend (async).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inheritsContact, profile]);

  // Programmatic, non-user updates (effect-driven defaults & sync). Updates the
  // data WITHOUT marking the form dirty, so the "unsaved changes" reminder only
  // fires for genuine user edits. No-ops when the value is unchanged.
  const setQuiet = (name: string, value: string | boolean) => {
    setData((d) => (d[name] === value ? d : { ...d, [name]: value }));
  };

  // Persist the gate-chosen relationship into the form data so Stage 3 can
  // branch (Parents vs Guardian) and it survives a refresh.
  useEffect(() => {
    if (registeringMinor && minorRelationship && data.minorRelationship !== minorRelationship) {
      setQuiet("minorRelationship", minorRelationship);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeringMinor, minorRelationship]);

  // Real-time blur validation. Runs when the user leaves any field.
  // Empty fields → required check. Non-empty fields → type-specific format rules.
  // Errors are cleared automatically by set() as the user types, so there is no
  // flickering. Every message here is a friendly frontend string — never raw
  // backend text.
  const blur = (name: string, currentValue?: string) => {
    const v =
      currentValue !== undefined
        ? currentValue
        : typeof data[name] === "string"
          ? (data[name] as string)
          : "";
    const trimmed = v.trim();
    const empty = !trimmed;

    // ── Identification document number — handled before the generic empty block ─
    // The number field is only visible when a type is selected. Validate as a
    // unit: required when a type is chosen, and format-checked when non-empty.
    if (/IdDoc\d+Number$/i.test(name)) {
      const typeKey = name.replace(/Number$/, "Type");
      const typeId = Number(String(data[typeKey] ?? ""));
      if (!typeId) return; // no type selected → field hidden → nothing to validate
      if (empty) {
        setErrors((e) => (e.includes(name) ? e : [...e, name]));
        setFieldErrors((fe) => ({ ...fe, [name]: t("fields.docNumberReq") }));
        return;
      }
      const isNida = nidaTypeIds.current.has(typeId);
      const isTin  = tinTypeIds.current.has(typeId);
      const flag = (msg: string) => {
        setErrors((e) => (e.includes(name) ? e : [...e, name]));
        setFieldErrors((fe) => ({ ...fe, [name]: msg }));
      };
      if (isNida) {
        if (trimmed.length !== 20) flag(t("registry.nidaExactDigits"));
      } else if (isTin) {
        // TIN: 9 digits (Business) or 10 digits (Individual), all numeric.
        if (!/^\d+$/.test(trimmed) || (trimmed.length !== 9 && trimmed.length !== 10)) {
          flag(t("registry.tinInvalid"));
        }
      } else {
        // Every other type (Driving Licence / Voter's ID / Birth Certificate / …)
        // is length-checked against its per-type rule so a number can't be an
        // arbitrary long blob. Falls back to the generic 3–50 range.
        const rule = docRuleById.current.get(typeId) ?? RULES.DOC_NUMBER_RULES.DEFAULT;
        if (rule.numeric && !/^\d+$/.test(trimmed)) {
          flag(t("registry.docNumberRange").replace("{min}", String(rule.min)).replace("{max}", String(rule.max)));
        } else if (trimmed.length < rule.min || trimmed.length > rule.max) {
          flag(t("registry.docNumberRange").replace("{min}", String(rule.min)).replace("{max}", String(rule.max)));
        }
      }
      return;
    }

    // ── Empty: required check ────────────────────────────────────────────────
    if (empty) {
      // "Required" errors for an EMPTY field are shown on Save, not from an
      // incidental blur — e.g. clicking a dropdown/date picker moves focus off
      // the field and would otherwise flag it "required" before the user is
      // done. Before the first save attempt this is silent; after a save, live
      // feedback resumes so fields visibly clear as they're fixed. (Format
      // checks for NON-empty values below are unaffected — they always run.)
      if (saveAttempt === 0) return;
      const required = REQUIRED_FIELDS[step - 1] ?? [];
      if (required.includes(name)) {
        setErrors((e) => (e.includes(name) ? e : [...e, name]));
      }
      // Conditional required fields on Step 4.
      // Normalize (drop spaces/hyphens) — the stored value is the backend status
      // name (e.g. "Self Employed"), not a fixed "self-employed" literal.
      const jobStatus = String(data.jobStatus ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (step === 4) {
        const isEmployed = jobStatus === "employed";
        const isSelfEmployed = jobStatus === "selfemployed";
        if ((isEmployed || isSelfEmployed) && name === "occupation") {
          setErrors((e) => (e.includes(name) ? e : [...e, name]));
        }
        if ((isEmployed || isSelfEmployed) && name === "otherOccupation" &&
            String(data.occupation) === "19") {
          setErrors((e) => (e.includes(name) ? e : [...e, name]));
        }
        if (isEmployed && name === "employer") {
          setErrors((e) => (e.includes(name) ? e : [...e, name]));
          if (!String(data.occupation ?? "").trim())
            setErrors((e) => (e.includes("occupation") ? e : [...e, "occupation"]));
        }
        // First school's level/name/district are required when the user attended school.
        if (
          data.neverAttendedSchool !== true &&
          (name === "edu1Level" || name === "edu1School" || name === "edu1District")
        ) {
          setErrors((e) => (e.includes(name) ? e : [...e, name]));
        }
        // Completion year: required when the matching school is marked "Completed".
        const yearMatch = name.match(/^edu(\d+)Year$/);
        if (yearMatch && data[`edu${yearMatch[1]}Completed`] === true) {
          setErrors((e) => (e.includes(name) ? e : [...e, name]));
        }
      }
      // NOTE: the second emergency contact is OPTIONAL — it is validated only on
      // Save (see the ec2Active branch in missingFields), NOT live on blur. Live
      // blur-flagging while the user is still filling ec2 raised a "required"
      // error just from moving focus away (e.g. opening the Nationality dropdown),
      // which is premature for an optional section.

      // Step 6 conditional required fields — spouses need all person fields + phone;
      // children need all person fields except phone (ChildItemRequest has no phoneNumber).
      // Guard against stale closure values from picker components (e.g. CountryMenu
      // auto-focuses its search input on mount, firing onBlur on the picker button
      // with the previous empty countryName before onChange has updated the data).
      if (step === 6) {
        const live = typeof data[name] === "string" ? (data[name] as string).trim() : "";
        if (!live) {
          if (data.isMarried === true && /^sp\d+(First|Middle|Last|Dob|Gender|Phone|NatCountry|ResCountry)$/.test(name))
            setErrors((e) => (e.includes(name) ? e : [...e, name]));
          if (data.hasChildren === true && /^ch\d+(First|Middle|Last|Dob|Gender|NatCountry|ResCountry)$/.test(name))
            setErrors((e) => (e.includes(name) ? e : [...e, name]));
        }
      }
      return;
    }

    // ── Non-empty: format / length rules ────────────────────────────────────

    const flag = (msg: string) => {
      setErrors((e) => (e.includes(name) ? e : [...e, name]));
      setFieldErrors((fe) => ({ ...fe, [name]: msg }));
    };

    // 1. Phone number — must satisfy country-specific length
    if (name === "phone" || name.endsWith("Phone")) {
      if (!isPhoneComplete(trimmed)) flag(t("fields.phoneInvalid"));
      return;
    }

    // 2. Email — standard format
    if (name === "email") {
      if (!RULES.EMAIL_PATTERN.test(trimmed)) flag(t("form.emailInvalid"));
      return;
    }

    // 3. Name fields (First / Middle / Last) — letters, spaces, hyphens, apostrophes
    if (name.endsWith("First") || name.endsWith("Middle") || name.endsWith("Last")) {
      if (trimmed.length < 2) { flag(t("registry.nameTooShort")); return; }
      if (!NAME_RE.test(trimmed))  { flag(t("registry.nameInvalid")); return; }
      return;
    }

    // 4. Date of birth fields — no future dates; age minimums per person type
    if (name === "dob" || name.endsWith("Dob")) {
      if (isFutureDate(trimmed)) { flag(t("registry.futureDateError")); return; }
      if (isExceedsMaxAge(trimmed)) { flag(t("registry.dobTooOld").replace("{max}", String(RULES.MAX_AGE_YEARS))); return; }
      if (/^ec\d+Dob$/.test(name) && !isAtLeast18(trimmed)) {
        flag(t("registry.ecAgeError"));
      }
      if ((name === "fatherDob" || name === "motherDob") && !isAtLeast18(trimmed)) {
        flag(t("registry.parentAgeError"));
      }
      if (/^sp\d+Dob$/.test(name) && !isAtLeast16(trimmed)) {
        flag(t("registry.spouseAgeError"));
      }
      // Applicant dob age rule is handled live by validateDob() via set()
      return;
    }

    // 4b. Height — optional, but when supplied the backend requires 50–280 cm.
    // (Reached only when non-empty, so an empty value stays valid/optional.)
    if (name === "heightCm") {
      const cm = Number(trimmed);
      if (!Number.isFinite(cm) || cm < RULES.HEIGHT_CM_MIN || cm > RULES.HEIGHT_CM_MAX) {
        flag(
          t("registry.heightRange")
            .replace("{min}", String(RULES.HEIGHT_CM_MIN))
            .replace("{max}", String(RULES.HEIGHT_CM_MAX)),
        );
      }
      return;
    }

    // 4c. Special mark — ORG-class free text (max enforced by the input). Reject
    // the symbol soup the backend's ORG validator refuses.
    if (name === "specialMark") {
      if (!RULES.ORG_PATTERN.test(trimmed)) flag(t("registry.orgInvalid"));
      return;
    }

    // 5. Employer, school name / district — min 2 chars. `employer`
    // (organizationName) and the school name are ORG-class, so they also reject
    // the symbol soup the backend's ORG validator refuses (District/otherOccupation
    // are plain text, only length-checked).
    if (name === "employer" || name === "otherOccupation" || /^edu\d+(School|District)$/.test(name)) {
      if (trimmed.length < 2) { flag(t("registry.textTooShort")); return; }
      const isOrg = name === "employer" || /^edu\d+School$/.test(name);
      if (isOrg && !RULES.ORG_PATTERN.test(trimmed)) flag(t("registry.orgInvalid"));
      return;
    }

    // 6. City / village text fields — only rendered when the paired country is a
    // non-Tanzania foreign country. Conditionally required + min 2 characters.
    {
      const geoCountryKey: string | null = (() => {
        if (name === "pobCityVillage") return "pobCountry";
        if (name === "permCity")       return "permCountry";
        if (name === "curCity")        return data.sameAsPerm === true ? null : "curCountry";
        // "{prefix}Village" → country at "{prefix}PobCountry"  (e.g. fatherVillage)
        if (name.endsWith("Village"))  return `${name.slice(0, -7)}PobCountry`;
        // "{prefix}ResCity" → country at "{prefix}ResCountry"  (e.g. ec1ResCity)
        if (name.endsWith("ResCity"))  return `${name.slice(0, -7)}ResCountry`;
        return null;
      })();
      if (geoCountryKey !== null) {
        const country = String(data[geoCountryKey] ?? "").trim();
        // Only validate when a non-Tanzania country is selected (field is visible).
        if (country && country !== "Tanzania") {
          if (empty) {
            setErrors((e) => (e.includes(name) ? e : [...e, name]));
            setFieldErrors((fe) => ({ ...fe, [name]: t("fields.fieldRequired") }));
          } else if (trimmed.length < 2) {
            flag(t("registry.textTooShort"));
          }
        }
        return;
      }
    }

    // 7. Education completion year — must be a year between birth year and today
    if (/^edu\d+Year$/.test(name)) {
      const yr = Number(trimmed);
      const currentYear = new Date().getFullYear();
      const dobStr = typeof data.dob === "string" ? data.dob : "";
      const birthYear = dobStr ? new Date(dobStr).getFullYear() : RULES.EDU_YEAR_MIN;
      const minYear = Number.isFinite(birthYear) && birthYear > RULES.EDU_YEAR_MIN ? birthYear : RULES.EDU_YEAR_MIN;
      if (!Number.isFinite(yr) || yr < minYear || yr > currentYear) {
        flag(
          t("registry.completionYearRange")
            .replace("{min}", String(minYear))
            .replace("{year}", String(currentYear)),
        );
      }
      return;
    }
  };

  const set = (name: string, value: string | boolean) => {
    // Only mark the form dirty on an ACTUAL change. Some controlled inputs
    // (notably on Firefox) emit a change event carrying the unchanged value on
    // mount/restore — that must not trip the unsaved-changes reminder.
    if (data[name] !== value) setDirty(true);
    setData((d) => (d[name] === value ? d : { ...d, [name]: value }));
    setErrors((e) => (e.includes(name) ? e.filter((n) => n !== name) : e));
    setFieldErrors((fe) => {
      if (!(name in fe)) return fe;
      const next = { ...fe };
      delete next[name];
      return next;
    });
    if (name === "dob") validateDob(typeof value === "string" ? value : "");
    // Live NIDA length check on any identification-document number field
    // (applicant: idDoc{n}Number; parents: father/motherIdDoc{n}Number).
    if (/IdDoc\d+Number$/i.test(name)) {
      void validateNidaField(name, typeof value === "string" ? value : "");
    }
  };

  // A NIDA document number must be exactly 20 digits. This pins the message to
  // the exact number field — live, in both Personal (stage 1) and Parents
  // (stage 3) — so the rule is visible while typing, not only on Save. Mirrors
  // the authoritative Save-time check in nidaLengthError(); the field's own type
  // selection is read from the current data snapshot (chosen before the number).
  async function validateNidaField(numberField: string, value: string) {
    // applicant fields use the bare "idDoc" prefix; parents use "<group>IdDoc".
    const applicant = numberField.match(/^idDoc(\d+)Number$/);
    const parent = numberField.match(/^(father|mother)IdDoc(\d+)Number$/);
    let group: PersonGroup;
    let typeField: string;
    if (applicant) {
      group = "applicant";
      typeField = `idDoc${applicant[1]}Type`;
    } else if (parent) {
      group = parent[1] as PersonGroup;
      typeField = `${parent[1]}IdDoc${parent[2]}Type`;
    } else {
      return;
    }

    let types;
    try {
      types = await getPersonDocumentTypes();
    } catch {
      return;
    }
    const nidaId = types[group]?.find(
      (d) =>
        (d.code ?? "").toUpperCase().includes("NIDA") ||
        (d.name ?? "").toUpperCase().includes("NIDA"),
    )?.id;
    // Only enforce when this row's selected type is NIDA.
    if (!nidaId || Number(String(data[typeField] ?? "")) !== nidaId) return;

    const num = value.trim();
    const bad = num !== "" && num.length !== 20;
    setErrors((e) =>
      bad
        ? e.includes(numberField)
          ? e
          : [...e, numberField]
        : e.filter((n) => n !== numberField),
    );
    setFieldErrors((fe) => {
      if (bad) return { ...fe, [numberField]: t("registry.nidaExactDigits") };
      if (!(numberField in fe)) return fe;
      const next = { ...fe };
      delete next[numberField];
      return next;
    });
  }

  // Merge a typed attachment uploaded in an earlier stage into the attachments
  // list so Stage 8 registers it with the backend (the photo and birth
  // certificate are uploaded at Stage 1, before the Uploads stage).
  function mergeAttachment(
    d: Record<string, string | boolean>,
    att: UploadedAttachment,
    typeId: number,
    name: string,
  ): Record<string, string | boolean> {
    const list = parseAttachments(d.attachments).filter((a) => a.typeId !== typeId);
    list.push({
      id: `att-${typeId}`,
      typeId,
      name,
      fileId: att.fileId,
      fileUrl: att.fileUrl,
      mimeType: att.mimeType,
      fileSizeBytes: att.fileSizeBytes,
      fileHash: att.fileHash,
    });
    return { ...d, attachments: JSON.stringify(list) };
  }

  // Merge the passport photo (uploaded at Stage 1) into the attachments list so
  // Stage 8 registers it with the backend — which requires the passport photo.
  function mergePhotoAttachment(
    d: Record<string, string | boolean>,
    att: UploadedAttachment,
  ): Record<string, string | boolean> {
    return {
      ...mergeAttachment(d, att, PASSPORT_PHOTO_TYPE, "Passport Size Photo"),
      passportPhotoUploaded: "true",
    };
  }
  function recordPhotoAttachment(att: UploadedAttachment) {
    setData((d) => mergePhotoAttachment(d, att));
  }



  // Live DOB validation (runs on every date change). The reason is pinned to the
  // DOB field via fieldErrors — never the bottom banner — so the message reads
  // "…must be under 18…" at the field instead of a misleading generic "required"
  // text plus a detached banner. Mirrors the proceed-handler checks for step 1.
  function validateDob(dob: string) {
    const flagDob = (message: string) => {
      setErrors((e) => (e.includes("dob") ? e : [...e, "dob"]));
      setFieldErrors((fe) => ({ ...fe, dob: message }));
    };
    const clearDob = () => {
      setErrors((e) => e.filter((n) => n !== "dob"));
      setFieldErrors((fe) => {
        if (!("dob" in fe)) return fe;
        const next = { ...fe };
        delete next.dob;
        return next;
      });
    };

    if (!dob) {
      clearDob();
      return;
    }
    if (isFutureDate(dob)) {
      flagDob(t("registry.futureDateError"));
      return;
    }
    const adult = isAtLeast18(dob);
    // Officers can register a person of ANY age — skip the adult/minor gate.
    if (!isOfficer()) {
      const invalid = isFirstPerson ? !adult : adult;
      if (invalid) {
        flagDob(isFirstPerson ? t("registry.ageError") : t("registry.minorError"));
        return;
      }
    }
    clearDob();
  }

  const isLast = step === TOTAL;
  const agreed = data.agree === true;
  const StepComponent = STEP_COMPONENTS[step - 1];

  // Returns only the FIRST incomplete level of a Tanzania cascade so that
  // errors never appear on fields that are still disabled (Region can't be
  // picked before Territory, District before Region, etc.).
  function cascadeRequired(pfx: string, needsStreet: boolean): string[] {
    // Flag EVERY empty level of the cascade at once (not just the first), so a
    // save surfaces all the missing required fields together rather than making
    // the user fix them one at a time down the Territory → Ward chain.
    const missing: string[] = [];
    if (!Number(data[`${pfx}TerritoryId`]))                          missing.push(`${pfx}Territory`);
    if (!Number(data[`${pfx}RegionId`]))                            missing.push(`${pfx}Region`);
    if (!Number(data[`${pfx}DistrictId`]))                          missing.push(`${pfx}District`);
    if (!Number(data[`${pfx}WardId`]))                              missing.push(`${pfx}Ward`);
    if (needsStreet && !String(data[`${pfx}StreetId`] ?? "").trim()) missing.push(`${pfx}Street`);
    return missing;
  }

  function missingFields() {
    let required = REQUIRED_FIELDS[step - 1];

    // Step 1: Place of birth. Tanzanian births need the Territory + Ward + Street/
    // Mtaa from the cascade (the backend rejects Stage 1 without a street);
    // foreign births hide those fields entirely.
    if (step === 1) {
      const pobIsTz = data.pobCountry === "Tanzania";
      if (pobIsTz) {
        required = [...required, ...cascadeRequired("pob", true)];
      } else if (data.pobCountry) {
        // Foreign births: drop the TZ cascade fields and require the free-text
        // city of birth instead (the /foreign endpoint rejects a blank one).
        const tzOnly = new Set(["pobTerritory", "pobRegion", "pobDistrict", "pobWard", "pobVillage"]);
        required = [...required.filter((n) => !tzOnly.has(n)), "pobCityVillage"];
      } else {
        // No country picked yet — require the country itself.
        // (pobCountry is already in the base REQUIRED_FIELDS list.)
      }
      // Marriage is hidden for all non-first-person registrations (forceSingle=true)
      // and auto-set to Single — remove it so a slow lookup doesn't falsely block.
      if (!isFirstPerson) {
        required = required.filter((n) => n !== "marriage");
      }
      // Phone and email are OPTIONAL for migrants (many have neither) and for
      // every officer registration (officers only register migrants) — still
      // format-validated on blur when filled, just not required. The officer
      // check is a safety net for when the migrant category isn't resolvable.
      if (isMigrant || isOfficer()) {
        required = required.filter((n) => n !== "phone" && n !== "email");
      }
      // Migrant Travel History: when the applicant says they HAVE a travel
      // document, the backend requires its type ("Document type is required when
      // hasDocument is true"). Enforce it here with a friendly, field-anchored
      // message so the raw backend error never surfaces — and so the travel-
      // history POST can't fail and abort an already-created Stage 1.
      if (isMigrant && data.hasTravelDoc === true) {
        required = [...required, "travelDocType"];
      }
    }


    // Step 2: Region/District/Ward only apply to Tanzania — they're hidden for
    // other countries, so don't require them there.
    if (step === 2) {
      const permCascadeStatic = ["permRegion", "permDistrict", "permWard"];
      const permIsTz = data.permCountry === "Tanzania";
      if (permIsTz) {
        // Strip the static cascade fields and let cascadeRequired pick the first missing level.
        required = required.filter((n) => !permCascadeStatic.includes(n));
        required = [...required, ...cascadeRequired("perm", true)];
      } else if (data.permCountry) {
        // Foreign permanent address: drop the TZ cascade, require the city.
        required = [
          ...required.filter((n) => !permCascadeStatic.includes(n)),
          "permCity",
        ];
      } else {
        // No country selected yet — drop cascade requirements; permCountry is
        // already in the base REQUIRED_FIELDS list so the user sees that error.
        required = required.filter((n) => !permCascadeStatic.includes(n));
        required = [...required, "permCountry"];
      }
      // The current address (when not linked) needs its own R/D/W in Tanzania,
      // or a free-text city when abroad.
      if (data.sameAsPerm !== true) {
        const curIsTz = data.curCountry === "Tanzania";
        if (curIsTz) {
          required = [...required, ...cascadeRequired("cur", true)];
        } else if (data.curCountry) {
          required = [...required, "curCity"];
        } else {
          required = [...required, "curCountry"];
        }
      }
    }

    // Step 3: Parents' residence is mandatory — Tanzania needs Ward + Street;
    // abroad needs the country + free-text city. No country = require it.
    // When a GUARDIAN says they don't know the parents, only a single guardian's
    // details are collected instead of father + mother.
    if (step === 3) {
      const guardianOnly = data.minorRelationship === "guardian" && data.knowsParents === "no";
      const persons = guardianOnly ? ["guardian"] : ["father", "mother"];
      if (guardianOnly) {
        required = [
          "guardianFirst",
          "guardianLast",
          "guardianDob",
          "guardianNatCountry",
          "guardianResCountry",
        ];
      }
      for (const p of persons) {
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") {
          required = [...required, ...cascadeRequired(`${p}Res`, true)];
        } else if (resCountry) {
          required = [...required, `${p}ResCity`];
        } else {
          required = [...required, `${p}ResCountry`];
        }
      }
    }

    // Step 4: Employment is hidden for minors and auto-set to "Student".
    // !isFirstPerson is the definitive check (all dependents must be under 18).
    if (step === 4 && !isFirstPerson) {
      required = required.filter((n) => n !== "jobStatus");
    }

    // Step 5: Emergency contacts. Only the FIRST contact is mandatory (backend
    // minimum is 1). The second is optional, but if the user has STARTED it, the
    // whole contact must be completed — a partial contact fails the backend.
    if (step === 5) {
      // A contact's residence (mandatory for a required contact) → cascade.
      const resCascade = (p: string) => {
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") return cascadeRequired(`${p}Res`, true);
        if (resCountry) return [`${p}ResCity`];
        return [`${p}ResCountry`];
      };
      // First contact — always required (its person fields are in REQUIRED_FIELDS).
      required = [...required, ...resCascade("ec1")];
      // Second contact — "active" once any of its fields carries a value.
      const ec2Fields = [
        "ec2RelType", ...nameFields("ec2"), "ec2Gender", "ec2Phone", "ec2NatCountry", "ec2ResCountry",
      ];
      const ec2Active = ec2Fields.some(
        (f) => typeof data[f] === "string" && (data[f] as string).trim() !== "",
      );
      if (ec2Active) {
        required = [...required, ...ec2Fields, ...resCascade("ec2")];
      }
    }

    // Step 6: conditional required fields for spouses and children, plus
    // residence cascade for relatives (mandatory), spouses, and children.
    if (step === 6) {
      const SP_FIELDS = ["First", "Last", "Dob", "Gender", "Phone", "NatCountry"];
      const CH_FIELDS = ["First", "Last", "Dob", "Gender", "NatCountry"];
      const residencePrefixes: string[] = ["rel1", "rel2"];
      if (data.isMarried === true) {
        const spCount = Math.max(1, Number(data.spouseCount) || 1);
        for (let i = 1; i <= spCount; i++) {
          const p = `sp${i}`;
          required = [...required, ...SP_FIELDS.map((s) => `${p}${s}`)];
          residencePrefixes.push(p);
        }
      }
      if (data.hasChildren === true) {
        const chCount = Math.max(1, Number(data.childCount) || 1);
        for (let i = 1; i <= chCount; i++) {
          const p = `ch${i}`;
          required = [...required, ...CH_FIELDS.map((s) => `${p}${s}`)];
          residencePrefixes.push(p);
        }
      }
      for (const p of residencePrefixes) {
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") {
          required = [...required, ...cascadeRequired(`${p}Res`, true)];
        } else if (resCountry) {
          required = [...required, `${p}ResCity`];
        } else {
          required = [...required, `${p}ResCountry`];
        }
      }
    }

    // Step 4 (education) is validated separately — see the custom "at least one
    // school" check below — so no static required fields here.

    return required.filter((name) => {
      const v = data[name];
      return typeof v !== "string" || v.trim() === "";
    });
  }

  function goTo(target: number) {
    // The Referees step is removed from the flow; never land on it.
    const n = skipReferee(target);
    // Allow navigation to any stage already reached (not just earlier ones), so
    // editing an earlier stage doesn't lock the user out of later completed ones.
    if (n >= 1 && n <= maxStep && n !== step) {
      // Switching stages doesn't persist the current step — warn if it has
      // unsaved edits, since they aren't written until the stage is saved.
      if (dirty && !window.confirm(t("registry.unsavedWarning"))) return;
      setErrors([]);
      setFieldErrors({});
      setFormError("");
      // If jumping backwards, record the current step so we can return after save.
      if (n < step) {
        setReturnStep(step);
      } else {
        setReturnStep(null);
      }
      setStep(n);
    }
  }

  function persistDraft() {
    saveRegistration({
      step,
      maxStep,
      completed: false,
      ownerId: ownerId || undefined,
      applicationId: applicationId || undefined,
      subjectId: subjectId || undefined,
      submittedStages: [...submittedStages],
      data,
    });
    setDirty(false);
  }

  // Session expired mid-flow: keep the draft (so it can be resumed after
  // re-login), then automatically sign the user out to the login screen — no
  // blocking dialog. The login screen shows a notice explaining why.
  function signOutToLogin() {
    persistDraft();
    setSignoutNotice("expired");
    router.push("/login");
  }

  function saveExit() {
    persistDraft();
    notify(t("toast.draftSaved"));
    router.push("/dashboard");
  }

  // Surface a submit failure: an expired session automatically signs the user
  // out and returns them to login (with an explanatory notice); anything else
  // shows the inline form error AND, when the backend pinpoints offending
  // fields, the message inline at exactly those fields.
  function reportSubmitError(err: unknown) {
    if (err instanceof SessionExpiredError) {
      signOutToLogin();
      return;
    }
    const apiFieldErrors = mapApiFieldErrors(err);
    const message = getErrorMessage(err, t("registry.submitError"));
    // Stage 8: a backend "<document> is required" rejection is pinned to that
    // document's upload row (matched by its label) instead of the generic
    // bottom banner, so the error shows at exactly the field it concerns.
    if (step === 8) {
      const lower = message.toLowerCase();
      // "At least one parent Birth Certificate (father or mother)" concerns two
      // rows at once — pin it to both the Father (2) and Mother (3) rows.
      if (lower.includes("parent") && lower.includes("birth")) {
        apiFieldErrors["attach2"] = message;
        apiFieldErrors["attach3"] = message;
      } else {
        const hit = ATTACHMENT_TYPES.find((a) => lower.includes(a.label.toLowerCase()));
        if (hit) {
          // The passport photo row is hidden from Stage 8 (captured at Stage 1).
          // Instead of pinning the error to an invisible field, surface a
          // friendly banner directing the user back to Personal Information.
          if (hit.id === PASSPORT_PHOTO_TYPE) {
            const shown = localizeBackendMessage(t("registry.photoMissing"), locale);
            setFormError(shown);
            notify(shown, "error");
            return;
          }
          apiFieldErrors[`attach${hit.id}`] = message;
        }
      }
    }
    // A backend NIDA rejection ("NIDA number must be exactly 20 digits") names no
    // field — pin it to the offending NIDA document-number field on this stage
    // (the one whose number isn't 20 digits, else the first one filled).
    if (Object.keys(apiFieldErrors).length === 0 && message.toUpperCase().includes("NIDA")) {
      const prefixes = step === 1 ? ["idDoc"] : step === 3 ? ["fatherIdDoc", "motherIdDoc"] : [];
      let target = "";
      let firstFilled = "";
      for (const pre of prefixes) {
        const count = Math.max(1, Number(String(data[`${pre}Count`] ?? "")) || 1);
        for (let i = 1; i <= count; i++) {
          const key = `${pre}${i}Number`;
          const v = typeof data[key] === "string" ? (data[key] as string).trim() : "";
          if (!v) continue;
          if (!firstFilled) firstFilled = key;
          if (v.replace(/\D/g, "").length !== 20) {
            target = key;
            break;
          }
        }
        if (target) break;
      }
      const field = target || firstFilled;
      if (field) apiFieldErrors[field] = message;
    }
    // Stages 3/5/6: backend errors like "Relative date of birth is required"
    // or "Father phone number is required" carry no structured field info —
    // detect the person type + field keyword in the message and pin to the
    // corresponding form field (first empty instance).
    if (Object.keys(apiFieldErrors).length === 0 && [3, 5, 6].includes(step)) {
      const lower = message.toLowerCase();
      // Person groups relevant to the current stage.
      type PersonGroup = { keyword: string; prefix: string; countKey?: string; min: number };
      const stageGroups: Record<number, PersonGroup[]> = {
        3: [
          { keyword: "father", prefix: "father", min: 1 },
          { keyword: "mother", prefix: "mother", min: 1 },
        ],
        5: [
          { keyword: "emergency", prefix: "ec", countKey: "ecCount", min: 2 },
          { keyword: "contact",   prefix: "ec", countKey: "ecCount", min: 2 },
        ],
        6: [
          { keyword: "relative", prefix: "rel", countKey: "relativeCount", min: RULES.RELATIVES_MIN },
          { keyword: "spouse",   prefix: "sp",  countKey: "spouseCount",   min: 1 },
          { keyword: "child",    prefix: "ch",  countKey: "childCount",    min: 1 },
        ],
      };
      // Map error-message keywords to the form-field suffix.
      const fieldKeywords: { keyword: string; suffix: string }[] = [
        { keyword: "date of birth", suffix: "Dob" },
        { keyword: "dob",           suffix: "Dob" },
        { keyword: "first name",    suffix: "First" },
        { keyword: "middle name",   suffix: "Middle" },
        { keyword: "last name",     suffix: "Last" },
        { keyword: "gender",        suffix: "Gender" },
        { keyword: "sex",           suffix: "Gender" },
        { keyword: "phone",         suffix: "Phone" },
        { keyword: "nationality",   suffix: "NatCountry" },
        { keyword: "occupation",    suffix: "OccType" },
        { keyword: "relationship",  suffix: "RelType" },
        { keyword: "country",       suffix: "ResCountry" },
        { keyword: "residence",     suffix: "ResCountry" },
      ];
      const groups = stageGroups[step] ?? [];
      for (const pg of groups) {
        if (!lower.includes(pg.keyword)) continue;
        const fk = fieldKeywords.find((k) => lower.includes(k.keyword));
        if (!fk) break;
        // Single-object parents (father/mother) have no count/index — they use
        // the prefix directly (e.g. "fatherDob"). Indexed groups (rel, sp, ch,
        // ec) pin to the first empty instance.
        if (!pg.countKey) {
          apiFieldErrors[`${pg.prefix}${fk.suffix}`] = message;
        } else {
          const count = Math.max(pg.min, Number(String(data[pg.countKey] ?? "")) || pg.min);
          let target = `${pg.prefix}1${fk.suffix}`;
          for (let i = 1; i <= count; i++) {
            const key = `${pg.prefix}${i}${fk.suffix}`;
            const v = typeof data[key] === "string" ? (data[key] as string).trim() : "";
            if (!v) { target = key; break; }
          }
          apiFieldErrors[target] = message;
        }
        break;
      }
    }

    // Some backend validation messages name the rejected value but not the
    // field — e.g. "Only letters … allowed (received: '-')". Locate the form
    // field whose current value matches and pin a FRIENDLY frontend message
    // there (never the raw backend text, which leaks internal field names and
    // is not suitable to display to users).
    if (Object.keys(apiFieldErrors).length === 0) {
      const received = message.match(/received:\s*'([^']*)'/i)?.[1];
      if (received !== undefined) {
        const hit = Object.entries(data).find(
          ([, v]) => typeof v === "string" && v === received,
        );
        if (hit) {
          const [fieldName] = hit;
          let friendlyMsg: string;
          if (fieldName.endsWith("First") || fieldName.endsWith("Middle") || fieldName.endsWith("Last")) {
            friendlyMsg = locked.includes(fieldName)
              ? t("registry.profileNameInvalid")
              : t("registry.nameInvalid");
          } else if (fieldName === "email") {
            friendlyMsg = t("form.emailInvalid");
          } else if (fieldName === "phone" || fieldName.endsWith("Phone")) {
            friendlyMsg = t("fields.phoneInvalid");
          } else if (/IdDoc\d+Number$/i.test(fieldName)) {
            const tKey = fieldName.replace(/Number$/, "Type");
            const tId = Number(String(data[tKey] ?? ""));
            friendlyMsg = nidaTypeIds.current.has(tId)
              ? t("registry.nidaExactDigits")
              : tinTypeIds.current.has(tId)
                ? t("registry.tinInvalid")
                : t("fields.docNumberReq");
          } else {
            friendlyMsg = t("fields.isRequired").replace("{field}", fieldName);
          }
          apiFieldErrors[fieldName] = friendlyMsg;
        }
      }
    }

    // Replace any raw backend messages that came through mapApiFieldErrors with
    // friendly frontend equivalents based on field type.
    for (const [fieldName, msg] of Object.entries(apiFieldErrors)) {
      // Only sanitise messages that look like backend technical output
      // (contain "received:", field path syntax like "firstName:", or are very
      // long). User-facing messages are typically short and contain no colons.
      const looksRaw = /received:|^\w+\.\w+:|^[a-z]+[A-Z]/.test(msg) || msg.length > 120;
      if (!looksRaw) continue;
      if (fieldName.endsWith("First") || fieldName.endsWith("Middle") || fieldName.endsWith("Last")) {
        apiFieldErrors[fieldName] = locked.includes(fieldName)
          ? t("registry.profileNameInvalid")
          : t("registry.nameInvalid");
      } else if (fieldName === "email") {
        apiFieldErrors[fieldName] = t("form.emailInvalid");
      } else if (fieldName === "phone" || fieldName.endsWith("Phone")) {
        apiFieldErrors[fieldName] = t("fields.phoneInvalid");
      } else if (/IdDoc\d+Number$/i.test(fieldName)) {
        const tKey = fieldName.replace(/Number$/, "Type");
        const tId = Number(String(data[tKey] ?? ""));
        apiFieldErrors[fieldName] = nidaTypeIds.current.has(tId)
          ? t("registry.nidaExactDigits")
          : tinTypeIds.current.has(tId)
            ? t("registry.tinInvalid")
            : t("fields.docNumberReq");
      } else {
        // Generic fallback — tell the user something is wrong with this field
        // without showing the technical backend detail.
        apiFieldErrors[fieldName] = t("fields.fieldRequired");
      }
    }

    const fieldKeys = Object.keys(apiFieldErrors);
    if (fieldKeys.length > 0) {
      // Localize any still-English backend message to Swahili before showing it
      // at the field (frontend-sourced messages aren't in the map, so they pass
      // through unchanged).
      for (const k of fieldKeys) {
        apiFieldErrors[k] = localizeBackendMessage(apiFieldErrors[k], locale);
      }
      setFieldErrors(apiFieldErrors);
      setErrors(fieldKeys);
      // Backend errors arrive after the save's initial saveAttempt bump (which
      // ran while errors were still empty) — re-arm so focus lands on them.
      setSaveAttempt((n) => n + 1);
      // The message is now shown inline at the field — no duplicate banner or toast.
      setFormError("");
      return;
    }
    const shown = localizeBackendMessage(message, locale);
    setFormError(shown);
    notify(shown, "error");
  }

  // Validate that any NIDA document in an identification-documents repeater is
  // exactly 20 digits. The repeater stores each document's documentTypeId as its
  // type value, so the NIDA id is resolved from the lookup per person group.
  // Returns the offending field name, or null when all NIDA numbers are valid.
  async function nidaLengthError(
    groups: { group: PersonGroup; prefix: string }[],
  ): Promise<string | null> {
    let types;
    try {
      types = await getPersonDocumentTypes();
    } catch {
      return null;
    }
    // Keep the synchronous caches in sync so blur() can validate immediately
    // after the first submit attempt (types may load after the mount effect).
    if (nidaTypeIds.current.size === 0 || tinTypeIds.current.size === 0) {
      const nida = new Set<number>();
      const tin  = new Set<number>();
      for (const docs of Object.values(types)) {
        for (const d of docs) {
          const code = (d.code ?? "").toUpperCase();
          const name = (d.name ?? "").toUpperCase();
          if (code.includes("NIDA") || name.includes("NIDA")) nida.add(d.id);
          if (/\bTIN\b/.test(code) || /\bTIN\b/.test(name))  tin.add(d.id);
        }
      }
      if (nidaTypeIds.current.size === 0) nidaTypeIds.current = nida;
      if (tinTypeIds.current.size  === 0) tinTypeIds.current  = tin;
    }
    for (const { group, prefix } of groups) {
      // Detect NIDA the same way the dropdowns label it — by name OR code — so a
      // missing `code` doesn't let an invalid NIDA slip past the client check
      // (which would then surface as a generic backend banner).
      const nidaId = types[group].find(
        (d) =>
          (d.code ?? "").toUpperCase().includes("NIDA") ||
          (d.name ?? "").toUpperCase().includes("NIDA"),
      )?.id;
      if (!nidaId) continue;
      const fieldPrefix = prefix ? `${prefix}IdDoc` : "idDoc";
      const countKey = prefix ? `${prefix}IdDocCount` : "idDocCount";
      const count = Math.max(1, Number(String(data[countKey] ?? "")) || 1);
      for (let i = 1; i <= count; i++) {
        if (Number(String(data[`${fieldPrefix}${i}Type`] ?? "")) !== nidaId) continue;
        const num = String(data[`${fieldPrefix}${i}Number`] ?? "").trim();
        if (num && num.length !== 20) return `${fieldPrefix}${i}Number`;
      }
    }
    return null;
  }

  // Phone fields shown on the current stage (validated for a country-valid
  // length on submit).
  function stagePhoneFields(): string[] {
    if (step === 1) return ["phone"];
    if (step === 3) return ["fatherPhone", "motherPhone"];
    if (step === 5) return ["ec1Phone", "ec2Phone"];
    if (step === 6) {
      const out: string[] = [];
      const rel = Math.max(RULES.RELATIVES_MIN, Number(String(data.relativeCount ?? "")) || RULES.RELATIVES_MIN);
      for (let i = 1; i <= rel; i++) out.push(`rel${i}Phone`);
      if (data.isMarried === true) {
        const sp = Math.max(1, Number(String(data.spouseCount ?? "")) || 1);
        for (let i = 1; i <= sp; i++) out.push(`sp${i}Phone`);
      }
      // Children have no phone field (ChildItemRequest has no phoneNumber)
      return out;
    }
    return [];
  }

  async function handlePrimary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Re-arm the error-focus effect for this save. Any setErrors() below now
    // lands focus on the first invalid field; a clean save changes no errors so
    // the effect's guard makes this a no-op.
    setSaveAttempt((n) => n + 1);
    if (isLast) {
      if (!agreed) return;
      // Stage 9 — Declaration (final submit).
      setSubmitting(true);
      try {
        await submitStage9(subjectId);
      } catch (err) {
        setSubmitting(false);
        reportSubmitError(err);
        return;
      }
      setSubmitting(false);
      onComplete(data, applicationId, subjectId);
      return;
    }

    // Migrant flow: stages 4–6 are gated by a "do you have this info?" question.
    // Unanswered → require it. "No" → skip the whole stage (clear its fields so
    // the submit is empty) and bypass all field validation below.
    const migrantGateField = isMigrant ? MIGRANT_STAGE_GATE[step] : undefined;
    if (migrantGateField && data[migrantGateField] !== true && data[migrantGateField] !== false) {
      setErrors([migrantGateField]);
      setFieldErrors({ [migrantGateField]: t("registry.pleaseAnswer") });
      setFormError("");
      return;
    }
    const gateSkip = !!migrantGateField && data[migrantGateField] === false;
    // When skipping, submit an EMPTY stage: clear the stage's fields for both the
    // payload and the saved draft (they're hidden anyway). A cleared COPY is used
    // for this submit because setData below only applies on the next render.
    const stageData: Record<string, string | boolean> = gateSkip
      ? Object.fromEntries(
          Object.entries(data).map(([k, v]) =>
            MIGRANT_STAGE_CLEAR[step]?.test(k) ? [k, ""] : [k, v],
          ),
        )
      : data;
    if (gateSkip) setData(stageData);

    if (!gateSkip) {
    const missing = missingFields();
    if (missing.length > 0) {
      setErrors(missing);
      setFieldErrors({});
      setFormError("");
      return;
    }

    // Pre-submit: validate every filled name field with frontend rules so the
    // user never sees a raw backend "received: '-'" message.
    {
      const nameErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (typeof v !== "string") continue;
        if (!(k.endsWith("First") || k.endsWith("Middle") || k.endsWith("Last"))) continue;
        const trimmed = v.trim();
        if (!trimmed) continue; // already caught by missingFields()
        if (trimmed.length < 2) {
          nameErrors[k] = t("registry.nameTooShort");
        } else if (!NAME_RE.test(trimmed)) {
          // Locked fields (profile name) need a special message directing the
          // user to fix their profile, not the form field.
          nameErrors[k] = locked.includes(k)
            ? t("registry.profileNameInvalid")
            : t("registry.nameInvalid");
        }
      }
      const nameErrKeys = Object.keys(nameErrors);
      if (nameErrKeys.length > 0) {
        setErrors(nameErrKeys);
        setFieldErrors(nameErrors);
        setFormError("");
        return;
      }
    }

    if (step === 1) {
      // Each check below pins the message to its own field (no banner).
      // Email must be a valid format.
      const email = typeof data.email === "string" ? data.email.trim() : "";
      if (email && !RULES.EMAIL_PATTERN.test(email)) {
        setErrors(["email"]);
        setFieldErrors({ email: t("form.emailInvalid") });
        setFormError("");
        return;
      }

      // Migrant travel document: the issue date must be before the expiry date
      // (backend: "Issued date must be before expiry date"). Validate here so the
      // travel-history submission can't fail AFTER Stage 1 is already created.
      // ISO YYYY-MM-DD strings compare chronologically as plain strings.
      if (isMigrant && data.hasTravelDoc === true) {
        const issued = typeof data.travelIssuedDate === "string" ? data.travelIssuedDate : "";
        const expiry = typeof data.travelExpiryDate === "string" ? data.travelExpiryDate : "";
        if (issued && expiry && issued >= expiry) {
          setErrors(["travelExpiryDate"]);
          setFieldErrors({ travelExpiryDate: t("registry.travelDatesInvalid") });
          setFormError("");
          return;
        }
      }

      // Phone must have at least 7 digits to be a valid number.
      const phoneRaw = typeof data.phone === "string" ? data.phone.trim() : "";
      const phoneDigits = phoneRaw.replace(/[^\d]/g, "");
      if (phoneRaw && phoneDigits.length < 7) {
        setErrors(["phone"]);
        setFieldErrors({ phone: t("register.phoneInvalid") });
        setFormError("");
        return;
      }

      const dob = typeof data.dob === "string" ? data.dob : "";
      if (isFutureDate(dob)) {
        setErrors(["dob"]);
        setFieldErrors({ dob: t("registry.futureDateError") });
        setFormError("");
        return;
      }
      if (isExceedsMaxAge(dob)) {
        setErrors(["dob"]);
        setFieldErrors({ dob: t("registry.dobTooOld").replace("{max}", String(RULES.MAX_AGE_YEARS)) });
        setFormError("");
        return;
      }
      const adult = isAtLeastAge(dob, RULES.CLAIM_MIN_AGE);
      // Officers can register a person of ANY age — skip the adult/minor gate.
      if (!isOfficer()) {
        if (isFirstPerson && !adult) {
          setErrors(["dob"]);
          setFieldErrors({ dob: t("registry.ageError") });
          setFormError("");
          return;
        }
        if (!isFirstPerson && adult) {
          setErrors(["dob"]);
          setFieldErrors({ dob: t("registry.minorError") });
          setFormError("");
          return;
        }
      }

      // Each selected document type must have a number entered.
      const docCount1 = Math.max(1, Number(String(data.idDocCount ?? "")) || 1);
      for (let n = 1; n <= docCount1; n++) {
        const typeId = Number(String(data[`idDoc${n}Type`] ?? ""));
        if (!typeId) continue;
        const num = String(data[`idDoc${n}Number`] ?? "").trim();
        const field = `idDoc${n}Number`;
        if (!num) {
          setErrors([field]);
          setFieldErrors({ [field]: t("fields.docNumberReq") });
          setFormError("");
          return;
        }
        if (tinTypeIds.current.has(typeId)) {
          if (!/^\d+$/.test(num) || (num.length !== 9 && num.length !== 10)) {
            setErrors([field]); setFieldErrors({ [field]: t("registry.tinInvalid") }); setFormError(""); return;
          }
        } else if (!nidaTypeIds.current.has(typeId) && num.length < 3) {
          setErrors([field]); setFieldErrors({ [field]: t("registry.docNumberTooShort") }); setFormError(""); return;
        }
      }

      // NIDA (optional) must be exactly 20 digits when provided.
      const nidaField = await nidaLengthError([{ group: "applicant", prefix: "" }]);
      if (nidaField) {
        setErrors([nidaField]);
        setFieldErrors({ [nidaField]: t("registry.nidaExactDigits") });
        setFormError("");
        return;
      }
    }

    // Stage 3 — each parent's document number required when type is selected; NIDA
    // must be exactly 20 digits.
    if (step === 3) {
      for (const pfx of ["father", "mother"]) {
        const count = Math.max(1, Number(String(data[`${pfx}IdDocCount`] ?? "")) || 1);
        for (let n = 1; n <= count; n++) {
          const typeId = Number(String(data[`${pfx}IdDoc${n}Type`] ?? ""));
          if (!typeId) continue;
          const num = String(data[`${pfx}IdDoc${n}Number`] ?? "").trim();
          const field = `${pfx}IdDoc${n}Number`;
          if (!num) {
            setErrors([field]);
            setFieldErrors({ [field]: t("fields.docNumberReq") });
            setFormError("");
            return;
          }
          if (tinTypeIds.current.has(typeId)) {
            if (!/^\d+$/.test(num) || (num.length !== 9 && num.length !== 10)) {
              setErrors([field]); setFieldErrors({ [field]: t("registry.tinInvalid") }); setFormError(""); return;
            }
          } else if (!nidaTypeIds.current.has(typeId) && num.length < 3) {
            setErrors([field]); setFieldErrors({ [field]: t("registry.docNumberTooShort") }); setFormError(""); return;
          }
        }
      }
      const nidaField = await nidaLengthError([
        { group: "father", prefix: "father" },
        { group: "mother", prefix: "mother" },
      ]);
      if (nidaField) {
        setErrors([nidaField]);
        setFieldErrors({ [nidaField]: t("registry.nidaExactDigits") });
        setFormError("");
        return;
      }

      // Each parent must be an adult (≥ 18) and at least 16 years older than the
      // applicant — raise the error at that parent's date-of-birth field.
      const subjectDob = typeof data.dob === "string" ? data.dob : "";
      for (const p of ["father", "mother"] as const) {
        const pDob = typeof data[`${p}Dob`] === "string" ? (data[`${p}Dob`] as string) : "";
        const field = `${p}Dob`;
        if (pDob && !isAtLeast18(pDob)) {
          setErrors([field]);
          setFieldErrors({ [field]: t("registry.parentAgeError") });
          setFormError("");
          return;
        }
        if (subjectDob && pDob && !atLeastYearsOlder(pDob, subjectDob, 16)) {
          setErrors([field]);
          setFieldErrors({ [field]: t(`registry.${p}TooYoung`) });
          setFormError("");
          return;
        }
      }
    }

    // Every phone field on this stage must be a valid number for its country —
    // reported at the exact field, not as a generic banner.
    const badPhone = stagePhoneFields().find((f) => {
      const v = typeof data[f] === "string" ? (data[f] as string) : "";
      return v !== "" && !isPhoneComplete(v);
    });
    if (badPhone) {
      setErrors([badPhone]);
      setFieldErrors({ [badPhone]: t("fields.phoneInvalid") });
      setFormError("");
      return;
    }
    // Stage 5: each emergency contact must be at least 18 years old (when a DOB
    // is provided). Pinned to the offending date-of-birth field.
    if (step === 5) {
      for (const p of ["ec1", "ec2"]) {
        const ecDob = typeof data[`${p}Dob`] === "string" ? (data[`${p}Dob`] as string).trim() : "";
        if (ecDob && !isAtLeast18(ecDob)) {
          const field = `${p}Dob`;
          setErrors([field]);
          setFieldErrors({ [field]: t("registry.ecAgeError") });
          setFormError("");
          return;
        }
      }
    }

    // Stage 6 — cross-field checks the backend enforces (each pinned to its own
    // field, no banner):
    if (step === 6) {
      // A spouse must be the opposite gender of the applicant (REGISTRATION_
      // SPOUSE_GENDER_MISMATCH). Only checked when the applicant's own gender is
      // a definite M/F — an "O"/unknown value can't determine an opposite.
      const appGender = String(data.gender ?? "").trim().toUpperCase();
      if (data.isMarried === true && (appGender === "M" || appGender === "F")) {
        const opposite = appGender === "M" ? "F" : "M";
        const spCount = Math.max(1, Number(data.spouseCount) || 1);
        for (let i = 1; i <= spCount; i++) {
          const g = String(data[`sp${i}Gender`] ?? "").trim().toUpperCase();
          if (g && g !== opposite) {
            const field = `sp${i}Gender`;
            setErrors([field]);
            setFieldErrors({ [field]: t("registry.spouseGenderMismatch") });
            setFormError("");
            return;
          }
        }
      }

      // Each spouse must be at least SPOUSE_MIN_AGE (16) years old
      // (REGISTRATION_SPOUSE_UNDERAGE). Pinned to the offending DOB field.
      if (data.isMarried === true) {
        const spCount = Math.max(1, Number(data.spouseCount) || 1);
        for (let i = 1; i <= spCount; i++) {
          const spDob = String(data[`sp${i}Dob`] ?? "").trim();
          if (spDob && !isAtLeast16(spDob)) {
            const field = `sp${i}Dob`;
            setErrors([field]);
            setFieldErrors({ [field]: t("registry.spouseAgeError") });
            setFormError("");
            return;
          }
        }
      }

      // A declared child must be born on/after the applicant's 16th birthday
      // (REGISTRATION_CHILD_DOB_INVALID — a minor can't have declared children).
      const dobStr = typeof data.dob === "string" ? data.dob.trim() : "";
      if (data.hasChildren === true && dobStr) {
        const sixteenth = new Date(dobStr);
        sixteenth.setFullYear(sixteenth.getFullYear() + RULES.MIN_APPLICANT_AGE_FOR_DECLARING_CHILDREN);
        const chCount = Math.max(1, Number(data.childCount) || 1);
        for (let i = 1; i <= chCount; i++) {
          const cStr = String(data[`ch${i}Dob`] ?? "").trim();
          if (!cStr) continue;
          if (new Date(cStr) < sixteenth) {
            const field = `ch${i}Dob`;
            setErrors([field]);
            setFieldErrors({ [field]: t("registry.childDobInvalid") });
            setFormError("");
            return;
          }
        }
      }
    }

    // Stage 4: if the user said they attended school, at least the primary
    // education (first school) must be filled in. On the migrant track the whole
    // education section is gated by `mHasEducation` — skip this check unless the
    // migrant opted into providing education (else it fires on a hidden section).
    if (
      step === 4 &&
      data.neverAttendedSchool !== true &&
      (!isMigrant || data.mHasEducation === true)
    ) {
      const filled = (n: string) =>
        typeof data[n] === "string" && (data[n] as string).trim() !== "";
      // Primary school (edu1) needs level, name and city; index number is
      // optional. The completion year is required only for a level marked
      // completed — for the primary school and any started extra school.
      const missing = ["edu1Level", "edu1School", "edu1District"].filter((n) => !filled(n));
      const count = Math.max(1, Number(data.eduCount) || 1);
      // Derive the birth year for completion-year lower bound.
      const dobStr = typeof data.dob === "string" ? data.dob : "";
      const birthYear = dobStr ? new Date(dobStr).getFullYear() : RULES.EDU_YEAR_MIN;
      const minYear = Number.isFinite(birthYear) && birthYear > RULES.EDU_YEAR_MIN ? birthYear : RULES.EDU_YEAR_MIN;
      const currentYear = new Date().getFullYear();
      const yearErrors: Record<string, string> = {};
      for (let i = 1; i <= count; i++) {
        const p = `edu${i}`;
        if (i > 1 && !filled(`${p}School`)) continue;
        // EVERY school in the repeater is sent as an EducationItemRequest, and
        // the backend requires educationLevelId + city (the District field) +
        // schoolName on EACH item — not just the first. Without this, a second
        // school with only a name shipped `city: null` and was rejected.
        if (i > 1) {
          for (const suffix of ["Level", "District"]) {
            if (!filled(`${p}${suffix}`)) missing.push(`${p}${suffix}`);
          }
        }
        if (filled(`${p}Year`)) {
          const year = Number((data[`${p}Year`] as string).trim());
          if (!Number.isFinite(year) || year < minYear || year > currentYear) {
            yearErrors[`${p}Year`] = t("registry.completionYearRange")
              .replace("{min}", String(minYear))
              .replace("{year}", String(currentYear));
          }
        } else if (data[`${p}Completed`] === true) {
          // Completed but no year → required.
          missing.push(`${p}Year`);
        }
      }
      const invalidYears = Object.keys(yearErrors);
      if (missing.length > 0 || invalidYears.length > 0) {
        setErrors([...missing, ...invalidYears]);
        setFieldErrors(yearErrors);
        setFormError(missing.length > 0 ? t("registry.schoolRequired") : "");
        return;
      }

      // Resolve each filled school's education-level rank from the lookup
      // (Primary=0, Ordinary=1, Advanced=2, Undergraduate=3; -1 = unknown).
      // Shared by the Primary-required check and the level-gap check below.
      const RANK_LABELS = ["Primary", "Ordinary Level", "Advanced Level", "Undergraduate"];
      let eduLevels: { id: number; name: string }[] = [];
      try { eduLevels = await getEducationLevels(); } catch { /* ignore */ }
      const levelRank = (levelId: string): number => {
        const item = eduLevels.find((l) => String(l.id) === levelId);
        if (!item) return -1;
        const n = item.name.toLowerCase();
        if (n.includes("primary") || n.includes("msingi")) return 0;
        if (n.includes("ordinary") || n.includes("o level") || n.includes("sekondari")) return 1;
        if (n.includes("advanced") || n.includes("a level")) return 2;
        if (n.includes("undergraduate") || n.includes("shahada ya kwanza") || n.includes("degree")) return 3;
        return -1;
      };

      // At least one education entry must be Primary level (backend rejects a
      // history with no Primary — REGISTRATION_PRIMARY_EDUCATION_REQUIRED). Only
      // enforced when the level lookup resolved, so an unknown lookup never
      // false-blocks. Pinned to the first school's level field.
      if (eduLevels.length > 0) {
        let hasPrimary = false;
        for (let i = 1; i <= count; i++) {
          const p = `edu${i}`;
          if (!filled(`${p}Level`)) continue;
          if (i > 1 && !filled(`${p}School`)) continue;
          if (levelRank(String(data[`${p}Level`])) === 0) { hasPrimary = true; break; }
        }
        if (!hasPrimary) {
          setErrors(["edu1Level"]);
          setFieldErrors({ edu1Level: t("registry.primaryEducationRequired") });
          setFormError("");
          return;
        }
      }

      // Education level gap validation: the gap between completion years of
      // successive levels must meet the minimum:
      //   Primary → Ordinary: 4 years
      //   Ordinary → Advanced: 3 years
      //   Advanced → Undergraduate: 3 years
      // Levels are matched by name keywords from the lookup.
      if (count > 1) {
        // Collect all completed schools with valid years and resolve their level rank.
        type EduEntry = { rank: number; year: number; field: string; label: string };
        const GAP_RULES: { from: number; to: number; gap: number }[] = [
          // Adjacent levels
          { from: 0, to: 1, gap: 4 },  // Primary → Ordinary
          { from: 1, to: 2, gap: 3 },  // Ordinary → Advanced
          { from: 2, to: 3, gap: 3 },  // Advanced → Undergraduate
          // Transitive (when intermediate levels are skipped)
          { from: 0, to: 2, gap: 7 },  // Primary → Advanced (4+3)
          { from: 1, to: 3, gap: 6 },  // Ordinary → Undergraduate (3+3)
          { from: 0, to: 3, gap: 10 }, // Primary → Undergraduate (4+3+3)
        ];
        // RANK_LABELS, eduLevels and levelRank are resolved once above.
        const entries: EduEntry[] = [];
        for (let i = 1; i <= count; i++) {
          const p = `edu${i}`;
          if (!filled(`${p}School`) || !filled(`${p}Year`) || !filled(`${p}Level`)) continue;
          const rank = levelRank(String(data[`${p}Level`]));
          if (rank < 0) continue;
          entries.push({
            rank,
            year: Number((data[`${p}Year`] as string).trim()),
            field: `${p}Year`,
            label: RANK_LABELS[rank] || "",
          });
        }
        // Sort by rank to compare adjacent levels.
        entries.sort((a, b) => a.rank - b.rank);
        for (const rule of GAP_RULES) {
          const from = entries.find((e) => e.rank === rule.from);
          const to = entries.find((e) => e.rank === rule.to);
          if (from && to && to.year - from.year < rule.gap) {
            setErrors([to.field]);
            setFieldErrors({
              [to.field]: t("registry.eduGapError")
                .replace("{gap}", String(rule.gap))
                .replace("{from}", RANK_LABELS[rule.from])
                .replace("{to}", RANK_LABELS[rule.to]),
            });
            setFormError("");
            return;
          }
        }
      }
    }

    // Stage 4: validate occupation / employer fields based on employment status.
    if (step === 4) {
      // Stored value is the backend status name (e.g. "Self Employed"), so
      // normalize (drop spaces/hyphens) before comparing.
      const jobStatus = String(data.jobStatus ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const isEmployed = jobStatus === "employed";
      const isSelfEmployed = jobStatus === "selfemployed";
      if (isEmployed || isSelfEmployed) {
        const occ = typeof data.occupation === "string" ? data.occupation.trim() : "";
        if (!occ) {
          setErrors(["occupation"]);
          setFieldErrors({ occupation: t("fields.isRequired").replace("{field}", t("fields.occupation")) });
          setFormError("");
          return;
        }
        if (occ === "19") {
          const other = typeof data.otherOccupation === "string" ? data.otherOccupation.trim() : "";
          if (!other) {
            setErrors(["otherOccupation"]);
            setFieldErrors({ otherOccupation: t("fields.isRequired").replace("{field}", t("fields.otherOccupation")) });
            setFormError("");
            return;
          }
        }
        if (isEmployed) {
          const emp = typeof data.employer === "string" ? data.employer.trim() : "";
          if (!emp) {
            setErrors(["employer"]);
            setFieldErrors({ employer: t("fields.isRequired").replace("{field}", t("fields.employer")) });
            setFormError("");
            return;
          }
        }
      }
    }

    // Stage 6: if married, at least one spouse must be filled.
    if (step === 6 && data.isMarried === true) {
      const spouseCount = Math.max(1, Number(data.spouseCount) || 1);
      const filled = (n: string) =>
        typeof data[n] === "string" && (data[n] as string).trim() !== "";
      let hasSpouse = false;
      for (let i = 1; i <= spouseCount; i++) {
        if (filled(`sp${i}First`)) {
          hasSpouse = true;
          break;
        }
      }
      if (!hasSpouse) {
        setErrors(["sp1First"]);
        setFieldErrors({ sp1First: t("registry.spouseRequired") });
        setFormError(t("registry.spouseRequired"));
        return;
      }
      // Every started spouse needs a full name + gender + nationality + a
      // residence (Ward/Street in Tanzania, Country/City abroad) — the same
      // mandatory fields the backend enforces on relatives.
      for (let i = 1; i <= spouseCount; i++) {
        const p = `sp${i}`;
        if (!filled(`${p}First`)) continue;
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        const residence = resCountry === "Tanzania"
          ? cascadeRequired(`${p}Res`, true)
          : resCountry
            ? [`${p}ResCity`]
            : [`${p}ResCountry`];
        const missingSpouse = [
          `${p}First`,
          `${p}Last`,
          `${p}Gender`,
          `${p}NatCountry`,
          ...residence,
        ].filter((n) => !filled(n));
        if (missingSpouse.length > 0) {
          // Each field reports its own explicit message inline (no banner).
          setErrors(missingSpouse);
          setFieldErrors({});
          setFormError("");
          return;
        }
      }
    }

    // Stage 6: if "I have children" is ticked, every started child needs the
    // same complete record as a spouse (full name + gender + nationality +
    // residence), and at least one child must be filled.
    if (step === 6 && data.hasChildren === true) {
      const childCount = Math.max(1, Number(data.childCount) || 1);
      const filled = (n: string) =>
        typeof data[n] === "string" && (data[n] as string).trim() !== "";
      if (!Array.from({ length: childCount }, (_, i) => i + 1).some((i) => filled(`ch${i}First`))) {
        setErrors(["ch1First"]);
        setFieldErrors({ ch1First: t("registry.required") });
        setFormError(t("registry.required"));
        return;
      }
      for (let i = 1; i <= childCount; i++) {
        const p = `ch${i}`;
        if (!filled(`${p}First`)) continue;
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        const residence = resCountry === "Tanzania"
          ? cascadeRequired(`${p}Res`, true)
          : resCountry
            ? [`${p}ResCity`]
            : [`${p}ResCountry`];
        const missingChild = [
          `${p}First`,
          `${p}Last`,
          `${p}Gender`,
          `${p}NatCountry`,
          ...residence,
        ].filter((n) => !filled(n));
        if (missingChild.length > 0) {
          // Each field reports its own explicit message inline (no banner).
          setErrors(missingChild);
          setFieldErrors({});
          setFormError("");
          return;
        }
      }
    }

    // Stage 8 — the applicant's and a parent's birth certificate / affidavit
    // MUST be uploaded before the stage can be submitted.
    //
    // EXCEPT on the migrant track (Migrant / Refugee / Asylum Seeker / Alien /
    // Undocumented Migrant / Voluntary Returnee) AND every officer registration
    // (officers only ever register migrants): these applicants frequently have no
    // civil documents at all, so uploads are COMPLETELY optional and this gate is
    // skipped. The officer check is a safety net for when the migrant category
    // isn't resolvable this deep in the flow.
    if (step === 8 && !isMigrant && !isOfficer()) {
      const have = new Set(parseAttachments(data.attachments).map((a) => a.typeId));
      // The passport photo isn't shown as a row here — it's captured at Stage 1
      // and uploaded/merged automatically by the submit path below — so it must
      // not gate this visible pre-check (else Save dead-ends on a hidden row).
      const missing = MANDATORY_ATTACHMENT_TYPE_IDS.filter(
        (id) => id !== PASSPORT_PHOTO_TYPE && !have.has(id),
      );
      // Backend business rule: AT LEAST ONE parent birth certificate (father OR
      // mother). Neither type is mandatory on its own, so it can't be expressed
      // via MANDATORY_ATTACHMENT_TYPE_IDS — check the pair here. Previously this
      // wasn't enforced at all and the backend rejected the submit instead.
      const needsParentCert = !PARENT_BIRTH_CERT_TYPE_IDS.some((id) => have.has(id));
      if (missing.length > 0 || needsParentCert) {
        // Flag each missing document at its own row (no generic banner). When no
        // parent certificate is present, flag BOTH parent rows — either satisfies it.
        const rows = [
          ...missing,
          ...(needsParentCert ? PARENT_BIRTH_CERT_TYPE_IDS : []),
        ];
        setErrors(rows.map((id) => `attach${id}`));
        setFieldErrors(
          needsParentCert
            ? Object.fromEntries(
                PARENT_BIRTH_CERT_TYPE_IDS.map((id) => [
                  `attach${id}`,
                  t("registry.parentCertRequired"),
                ]),
              )
            : {},
        );
        setFormError("");
        return;
      }

      // Enforce the total attachment ceiling (REGISTRATION_ATTACHMENT_LIMIT_EXCEEDED).
      const allAttachments = parseAttachments(data.attachments);
      if (allAttachments.length > RULES.ATTACHMENTS_MAX) {
        setErrors([]);
        setFieldErrors({});
        setFormError(t("registry.attachTooMany").replace("{max}", String(RULES.ATTACHMENTS_MAX)));
        return;
      }
    }
    } // end if (!gateSkip) — validation is skipped when a migrant answered "No"

    setErrors([]);
    setFieldErrors({});
    setFormError("");

    let sid = subjectId;
    let appId = applicationId;
    const updatedStages = new Set(submittedStages);
    const edit = submittedStages.has(step);
    // Holds the form data merged with the server-compiled preview (fetched after
    // Stage 8) so Stage 9 (Preview & Declaration) reflects the backend record.
    let mergedData: Record<string, string | boolean> | null = null;

    // Submit stage to backend
    if (step >= 1 && step <= 8) {
      setSubmitting(true);
      try {
        if (step === 1) {
          if (edit) {
            if (activeRegistrationType) {
              await editStage1Migrant(sid, data, activeRegistrationType);
            } else {
              await editStage1(sid, data, isFirstPerson);
            }
            // The photo isn't part of the Stage 1 JSON — it's uploaded
            // separately. On an edit, (re)upload it when the user captured a new
            // photo (a data: URL) so the change actually reaches the backend.
            const photoDataUrl =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : "";
            if (sid && photoDataUrl.startsWith("data:")) {
              const att = await uploadPassportPhoto(sid, photoDataUrl);
              if (att) recordPhotoAttachment(att);
            }
            // Migrant Stage 1 also carries travel history (same subjectId).
            // Non-fatal: Stage 1 is already saved, so a travel-history hiccup
            // must never abort it (it can be retried by re-saving Stage 1).
            if (isMigrant && sid) {
              try {
                await editTravelHistory(sid, data);
              } catch (thErr) {
                // Stage 1 is saved, but the user MUST know travel history didn't
                // save (e.g. bad dates) — surface the real backend message.
                console.error("Travel history update failed:", thErr);
                notify(getErrorMessage(thErr, t("registry.travelHistorySaveError")), "error");
              }
            }
          } else {
            const photoDataUrl =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : undefined;
            const response = activeRegistrationType
              ? await submitStage1Migrant(data, activeRegistrationType, photoDataUrl)
              : await submitStage1(data, isFirstPerson, photoDataUrl);
            sid = response.subjectId;
            setSubjectId(sid);
            appId = response.applicationId || response.subjectId;
            if (appId) setApplicationId(appId);
            // Track the decoupled photo upload; if it failed (e.g. network), the
            // user retries at the Stage 8 gate without losing any data. On
            // success, record it in the attachments so Stage 8 can register it.
            if (response.photoAttachment) {
              recordPhotoAttachment(response.photoAttachment);
            } else {
              set("passportPhotoUploaded", response.photoUploaded ? "true" : "");
            }
            // Migrant Stage 1 also carries travel history, submitted against the
            // subjectId that Stage 1 just created. Non-fatal: the registration
            // already exists, so this must never abort Stage 1 (which would
            // suppress the Application ID dialog and leave it looking incomplete).
            if (isMigrant && sid) {
              try {
                await submitTravelHistory(sid, data);
              } catch (thErr) {
                // Stage 1 is created, but the user MUST know travel history didn't
                // save (e.g. bad dates) — surface the real backend message.
                console.error("Travel history submit failed:", thErr);
                notify(getErrorMessage(thErr, t("registry.travelHistorySaveError")), "error");
              }
            }
          }
        } else if (step === 2) {
          await (edit ? editStage2(sid, data) : submitStage2(sid, data));
        } else if (step === 3) {
          await (edit ? editStage3(sid, data) : submitStage3(sid, data));
        } else if (step === 4) {
          // stageData === data unless a migrant answered "No" (then it's empty).
          await (edit
            ? editStage4(sid, stageData, isFirstPerson)
            : submitStage4(sid, stageData, isFirstPerson));
        } else if (step === 5) {
          await (edit ? editStage5(sid, stageData) : submitStage5(sid, stageData));
        } else if (step === 6) {
          await (edit ? editStage6(sid, stageData) : submitStage6(sid, stageData));
        } else if (step === 7) {
          // Referees — GET only, nothing to submit
          await submitStage7(sid);
        } else if (step === 8) {
          // The passport photo is mandatory at Stage 1 (Personal Information),
          // NOT here. We only best-effort retry the upload if it failed earlier
          // (e.g. a network blip) — it must never block the Uploads stage.
          // Ensure the passport photo is in the attachments the backend requires.
          // If it isn't (Stage 1 upload failed), retry the upload now and merge
          // it into the payload (local copy — setData is async).
          let data8 = data;
          // The passport must be in the payload with a real fileUrl. A stale
          // entry (e.g. an earlier id, or one with no fileUrl) doesn't count —
          // re-derive the passport from the Stage 1 photo in that case.
          const hasPhoto = parseAttachments(data.attachments).some(
            (a) => a.typeId === PASSPORT_PHOTO_TYPE && !!a.fileUrl,
          );
          if (!hasPhoto) {
            const photoData =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : "";
            let att: UploadedAttachment | null = null;
            if (photoData.startsWith("data:")) {
              // Freshly captured this session — upload it now.
              att = sid ? await uploadPassportPhoto(sid, photoData) : null;
            } else if (photoData) {
              // Already uploaded at Stage 1 (a re-hydrated file URL): that URL IS
              // the stored photo, so register it directly — no re-upload (which
              // would be a CORS-blocked cross-origin fetch).
              att = { fileId: "", fileUrl: photoData, mimeType: "image/jpeg", fileSizeBytes: 0, fileHash: "" };
            }
            if (att) {
              data8 = mergePhotoAttachment(data, att);
              recordPhotoAttachment(att);
            }
          }
          await (edit ? editStage8(sid, data8) : submitStage8(sid, data8));
          // Pull the server-compiled preview so Stage 9 (Preview & Declaration)
          // shows everything the backend stored across all stages. /stage9/preview
          // (not /review) works before the declaration is submitted. Non-fatal —
          // a failure just falls back to the locally-entered data.
          try {
            const preview = await getStage9Preview(sid);
            if (preview) {
              mergedData = { ...data, ...(await reviewToForm(preview)) };
              setData(mergedData);
            }
          } catch {
            // ignore — Stage 9 uses the locally-entered data
          }
        }
      } catch (err) {
        setSubmitting(false);
        reportSubmitError(err);
        return;
      }
      setSubmitting(false);
      updatedStages.add(step);
      setSubmittedStages(updatedStages);
      notify(t("toast.stageSaved"));
    }

    // Where to land after saving:
    //  • Editing an already-submitted stage (the GET→PUT edit path): the stage is
    //    just updated in place, so jump straight to the LATEST stage reached
    //    (maxStep) — the user shouldn't be forced to re-walk every completed
    //    stage after correcting one earlier field.
    //  • A brand-new stage: advance sequentially (or return to an explicit
    //    backward-jump marker if one is set).
    let next = edit
      ? Math.min(Math.max(maxStep, step + 1), TOTAL)
      : returnStep && returnStep > step
        ? Math.min(returnStep, TOTAL)
        : Math.min(step + 1, TOTAL);
    setReturnStep(null);
    // Skip the removed Referees step. Traverse its GET-only backend stage first
    // (for sequencing) then land on Uploads; the GET is non-fatal if it fails.
    if (next === REFEREE_STEP) {
      try {
        if (sid) await submitStage7(sid);
      } catch {
        // Referees stage is GET-only and informational — never block progress.
      }
      next = REFEREE_STEP + 1;
    }

    // After Personal Information: display the REAL Application ID from the
    // backend. NEVER fabricate one — fall back to the backend subjectId, and if
    // the backend returned nothing usable, skip the dialog rather than show a
    // made-up value.
    const isNewAppId = step === 1 && !applicationId;
    if (step === 1 && !appId) {
      appId = sid;
      if (appId) setApplicationId(appId);
    }
    if (step === 1 && appId && isNewAppId) {
      const fullName = ["applicantFirst", "applicantMiddle", "applicantLast"]
        .map((k) => data[k])
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .join(" ");
      void emailApplicationId({
        email: typeof data.email === "string" ? data.email : "",
        applicationId: appId,
        fullName,
      });
      setShowIdDialog(true);
    }

    saveRegistration({
      step: next,
      maxStep: Math.max(maxStep, next),
      completed: false,
      ownerId: ownerId || undefined,
      applicationId: appId || undefined,
      subjectId: sid || undefined,
      submittedStages: [...updatedStages],
      data: mergedData ?? stageData,
    });
    // The stage's data is now persisted — no longer dirty.
    setDirty(false);
    setStep(next);
  }

  function handleBack() {
    // Going back — whether exiting from Stage 1 or stepping to an earlier stage —
    // doesn't persist the current step, so remind the user of unsaved edits first.
    if (dirty && !window.confirm(t("registry.unsavedWarning"))) return;
    setErrors([]);
    setFieldErrors({});
    setFormError("");
    if (step === 1) {
      onExit();
      return;
    }
    // Going back from Uploads (8) skips the removed Referees step (7) to Family (6).
    setStep((s) => (s - 1 === REFEREE_STEP ? REFEREE_STEP - 1 : s - 1));
  }

  return (
    <div className="flex flex-1">
      <Stepper
        current={step}
        maxStep={maxStep}
        submitted={submittedStages}
        onGo={goTo}
        onSaveExit={saveExit}
      />

        <main className="flex-1 px-4 py-5 lg:px-[10%]">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-base font-semibold text-success">
              {t(`registry.s${step}Tag`)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-navy-700">
              {t(`registry.s${step}Heading`)}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
              {t(`registry.s${step}Intro`)}
            </p>

            <form onSubmit={handlePrimary} className="mt-4">
              <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <WizardProvider
                  data={data}
                  set={set}
                  setQuiet={setQuiet}
                  blur={blur}
                  errors={errors}
                  fieldErrors={fieldErrors}
                  locked={locked}
                  isFirstPerson={isFirstPerson}
                  isMigrant={isMigrant}
                  isOfficerMode={isOfficer()}
                  foreignMinor={foreignMinor}
                  subjectId={subjectId}
                  onGoToStep={goTo}
                  onSessionExpired={signOutToLogin}
                >
                  {stageLoading ? <StageSkeleton /> : <StepComponent />}
                </WizardProvider>

                {/* Field-level errors render inline at each field. Only a
                    genuine form-level message (e.g. a submit/API failure) is
                    surfaced here as a banner — never a grouped list of fields. */}
                {formError && (
                  <p role="alert" data-form-error className="mt-6 text-base font-medium text-danger">
                    {formError}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-base font-semibold text-navy-700 transition hover:text-gold-700"
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                    {t(`registry.back${step}`)}
                  </button>

                  <button
                    type="submit"
                    disabled={(isLast && !agreed) || submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && (
                      <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                    )}
                    {isLast ? (
                      <>
                        <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                        {t("registry.complete")}
                      </>
                    ) : (
                      <>
                        {t("registry.next")}
                        <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <HelpfulTip />
          </div>
        </main>

      <ApplicationIdDialog
        open={showIdDialog}
        applicationId={applicationId}
        email={typeof data.email === "string" ? data.email : ""}
        onContinue={() => setShowIdDialog(false)}
      />
    </div>
  );
}
