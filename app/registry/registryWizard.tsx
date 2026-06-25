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
import { generateApplicationId } from "./applicationId";
import { emailApplicationId } from "./emailApplicationId";
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
  uploadPassportPhoto,
  getStage9Preview,
  getStageData,
} from "@/lib/api/registration";
import { reviewToForm } from "@/lib/registry/reviewToForm";
import { stageToForm } from "@/lib/registry/stageToForm";
import { mapApiFieldErrors } from "@/lib/registry/errorFields";
import { useToast } from "@/components/ui/toast";
import { resolveGenderCode, getPersonDocumentTypes, getEducationLevels, type PersonGroup } from "@/lib/api/lookup";
import { isPhoneComplete } from "@/lib/phoneLengths";
import { SessionExpiredError } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import ApplicationIdDialog from "./applicationIdDialog";
import SessionExpiredDialog from "@/components/auth/sessionExpiredDialog";
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
  type UploadedAttachment,
} from "@/lib/api/files";

const TOTAL = 9;

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

const nameFields = (p: string) => [`${p}First`, `${p}Middle`, `${p}Last`];

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
  ],
  // Step 2: Address (permanent Region/District/Ward; current added when unlinked)
  ["permRegion", "permDistrict", "permWard"],
  // Step 3: Parents (father + mother full names + gender + nationality;
  // phone and DOB are optional)
  [
    ...nameFields("father"),
    "fatherGender",
    "fatherDob",
    "fatherNatCountry",
    ...nameFields("mother"),
    "motherGender",
    "motherDob",
    "motherNatCountry",
  ],
  // Step 4: Education & Employment — employment status is mandatory (the backend
  // requires it); school is validated separately ("at least one if attended").
  ["jobStatus"],
  // Step 5: Emergency Contacts (full name + gender + nationality required)
  [
    "ec1RelType",
    ...nameFields("ec1"),
    "ec1Gender",
    "ec1Phone",
    "ec1NatCountry",
    "ec2RelType",
    ...nameFields("ec2"),
    "ec2Gender",
    "ec2Phone",
    "ec2NatCountry",
  ],
  // Step 6: Family — at least two relatives (full name + gender + nationality;
  // residence is enforced conditionally in missingFields)
  [
    "rel1RelType",
    ...nameFields("rel1"),
    "rel1Gender",
    "rel1Phone",
    "rel1NatCountry",
    "rel2RelType",
    ...nameFields("rel2"),
    "rel2Gender",
    "rel2Phone",
    "rel2NatCountry",
  ],
  // Step 7: Referees (print only — no required fields)
  [],
  // Step 8: Uploads
  [],
  // Step 9: Preview & Declaration
  [],
];

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

function isFutureDate(dob: string): boolean {
  const parts = dob.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return birth.getTime() > today.getTime();
}

function isAtLeast18(dob: string): boolean {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 18;
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
  onExit,
  onComplete,
}: {
  selfDone: boolean;
  /** A non-citizen (foreign) profile registering a Tanzanian-origin minor. The
   * account holder is NOT the subject, so their personal details are neither
   * prefilled nor locked, and the subject is validated as a minor. */
  registeringMinor?: boolean;
  onExit: () => void;
  onComplete: (data: Record<string, string | boolean>, applicationId: string) => void;
}) {
  const { t } = useI18n();
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
  const [profile] = useState<Profile | null>(() => loadProfile());
  const ownerId = profile?.profileId ?? "";
  const locked = profile ? (isFirstPerson ? PERSONAL_LOCK : CONTACT_LOCK) : [];

  // Resolve the in-progress draft ONCE and reuse it for every init value, so
  // step / data / subjectId / submittedStages stay consistent. Prefer the
  // owner-scoped match, but fall back to the device's draft so a profileId
  // hiccup never strands the user's entered data (foreign drafts are already
  // cleared on login).
  const [draft] = useState(() => loadRegistrationFor(ownerId) ?? loadRegistration());
  const resumable = draft && !draft.completed ? draft : null;

  const [step, setStep] = useState(() => resumable?.step ?? 1);
  const [data, setData] = useState<Record<string, string | boolean>>(() => {
    const prof = loadProfile();
    const base: Record<string, string | boolean> = prof
      ? inheritsContact
        ? { phone: prof.phoneNumber, email: prof.email }
        : profileToPersonal(prof)
      : {};
    // The self-service wizard is for Tanzanian citizens (non-citizens are
    // diverted at the citizenship gate), so seed nationality + citizenship type.
    base.nationalityCountry = "Tanzania";
    base.citizenshipTypeId = "1";
    // Saved form data wins over the profile prefill so entered values are kept.
    return resumable?.data ? { ...base, ...resumable.data } : base;
  });
  const [errors, setErrors] = useState<string[]>([]);
  // Specific per-field messages (email format, DOB, NIDA, …). Fields in `errors`
  // without an entry here fall back to a generic "required" message at the field.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
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
  // Readable labels of the fields the user skipped on the current step, shown
  // so they know specifically what to go back and fill.
  const [applicationId, setApplicationId] = useState(
    () => resumable?.applicationId ?? "",
  );
  const [showIdDialog, setShowIdDialog] = useState(false);
  // When a backend call fails because the session expired, show a blocking
  // dialog that signs the user out (the session is already cleared).
  const [sessionExpired, setSessionExpired] = useState(false);
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
  // Whenever the current step advances past the known frontier, push it out.
  useEffect(() => {
    setMaxStep((m) => Math.max(m, step));
  }, [step]);

  // Re-hydrate an already-submitted stage from the backend when the user returns
  // to it (e.g. resuming on a fresh browser, or going back to edit). The API is
  // the source of truth for a submitted stage, so every field it returns
  // overwrites the local value — the form shows exactly what the server stored.
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
        if (!raw || cancelled) return;
        const mapped = await stageToForm(step, raw);
        if (cancelled || Object.keys(mapped).length === 0) return;
        setData((d) => {
          const next = { ...d };
          // `mapped` only holds keys derived from the API response, so assigning
          // them all reflects the server data exactly without wiping unrelated
          // local fields.
          for (const [k, v] of Object.entries(mapped)) next[k] = v;
          return next;
        });
        // Mark hydrated so the skeleton never blocks this stage again — it
        // perishes for good once the data has been successfully fetched.
        hydratedStages.current.add(step);
      } finally {
        if (!cancelled) setStageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, subjectId]);

  // When errors are raised, shift focus to where the problem is: scroll the
  // topmost invalid field into view and focus it (so the user lands exactly on
  // it). Falls back to the form-level banner when no field marker matches.
  useEffect(() => {
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
  }, [errors, formError]);

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
      // Empty or unresolved — pull a fresh profile and use its gender.
      try {
        const fresh = await refreshMyProfile();
        saveProfile(fresh);
        const code = await resolveGenderCode(fresh.gender);
        if (!cancelled && code) setData((d) => ({ ...d, gender: code }));
      } catch {
        // best effort — leave the field for the user
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A subject who isn't the account holder (a dependent — including a minor)
  // inherits the account holder's phone & email. Enforce it from the profile so
  // those fields are populated even when a resumed/empty draft didn't carry them.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inheritsContact]);

  // Programmatic, non-user updates (effect-driven defaults & sync). Updates the
  // data WITHOUT marking the form dirty, so the "unsaved changes" reminder only
  // fires for genuine user edits. No-ops when the value is unchanged.
  const setQuiet = (name: string, value: string | boolean) => {
    setData((d) => (d[name] === value ? d : { ...d, [name]: value }));
  };

  // Real-time blur validation: marks a field invalid immediately when the user
  // leaves it empty (if it is required for the current step) or with a bad
  // email format. Errors added here are cleared normally by set() as the user
  // corrects the field, so there is no double-flash or flickering.
  const blur = (name: string, currentValue?: string) => {
    const v =
      currentValue !== undefined
        ? currentValue
        : typeof data[name] === "string"
          ? (data[name] as string)
          : "";
    const empty = !v.trim();
    if (empty) {
      const required = REQUIRED_FIELDS[step - 1] ?? [];
      if (required.includes(name)) {
        setErrors((e) => (e.includes(name) ? e : [...e, name]));
      }
      return;
    }
    // Email format — only relevant at Step 1.
    if (name === "email") {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_RE.test(v.trim())) {
        setErrors((e) => (e.includes("email") ? e : [...e, "email"]));
        setFieldErrors((fe) => ({ ...fe, email: t("form.emailInvalid") }));
      }
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
    const invalid = isFirstPerson ? !adult : adult;
    if (invalid) {
      flagDob(isFirstPerson ? t("registry.ageError") : t("registry.minorError"));
    } else {
      clearDob();
    }
  }

  const isLast = step === TOTAL;
  const agreed = data.agree === true;
  const StepComponent = STEP_COMPONENTS[step - 1];

  function missingFields() {
    let required = REQUIRED_FIELDS[step - 1];

    // Step 1: Place of birth. Tanzanian births need the Territory + Ward + Street/
    // Mtaa from the cascade (the backend rejects Stage 1 without a street);
    // foreign births hide those fields entirely.
    if (step === 1) {
      const pobIsTz = data.pobCountry === "Tanzania";
      if (pobIsTz) {
        required = [...required, "pobTerritory", "pobWard", "pobStreet"];
      } else if (data.pobCountry) {
        // Foreign births: drop the TZ cascade fields and require the free-text
        // city of birth instead (the /foreign endpoint rejects a blank one).
        const tzOnly = new Set(["pobTerritory", "pobRegion", "pobDistrict", "pobWard", "pobVillage"]);
        required = [...required.filter((n) => !tzOnly.has(n)), "pobCityVillage"];
      } else {
        // No country picked yet — require the country itself.
        // (pobCountry is already in the base REQUIRED_FIELDS list.)
      }
    }


    // Step 2: Region/District/Ward only apply to Tanzania — they're hidden for
    // other countries, so don't require them there.
    if (step === 2) {
      const permIsTz = data.permCountry === "Tanzania";
      if (permIsTz) {
        // Territory is part of the cascade — require it alongside region/district/ward.
        required = [...required, "permTerritory"];
      } else if (!permIsTz && data.permCountry) {
        // Foreign permanent address: drop the TZ cascade, require the city.
        required = [
          ...required.filter((n) => !["permRegion", "permDistrict", "permWard"].includes(n)),
          "permCity",
        ];
      } else if (!data.permCountry) {
        // No country selected yet — drop cascade requirements.
        required = required.filter((n) => !["permRegion", "permDistrict", "permWard"].includes(n));
        required = [...required, "permCountry"];
      }
      // The current address (when not linked) needs its own R/D/W in Tanzania,
      // or a free-text city when abroad.
      if (data.sameAsPerm !== true) {
        const curIsTz = data.curCountry === "Tanzania";
        if (curIsTz) {
          required = [...required, "curTerritory", "curRegion", "curDistrict", "curWard"];
        } else if (data.curCountry) {
          required = [...required, "curCity"];
        } else {
          required = [...required, "curCountry"];
        }
      }
    }

    // Step 3: Parents' place of birth + residence are mandatory. Each is a
    // cascade — Tanzania needs the Ward (+ Street for residence); abroad needs
    // the country + the free-text city/village. No country = require it.
    if (step === 3) {
      for (const p of ["father", "mother"]) {
        const pobCountry = typeof data[`${p}PobCountry`] === "string" ? (data[`${p}PobCountry`] as string).trim() : "";
        if (pobCountry === "Tanzania") {
          // Every level of the cascade is reported (including territory), so the
          // user sees exactly which one is missing.
          required = [...required, `${p}PobTerritory`, `${p}PobRegion`, `${p}PobDistrict`, `${p}PobWard`, `${p}PobStreet`];
        } else if (pobCountry) {
          required = [...required, `${p}Village`];
        } else {
          required = [...required, `${p}PobCountry`];
        }

        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") {
          required = [...required, `${p}ResTerritory`, `${p}ResRegion`, `${p}ResDistrict`, `${p}ResWard`, `${p}ResStreet`];
        } else if (resCountry) {
          required = [...required, `${p}ResCity`];
        } else {
          required = [...required, `${p}ResCountry`];
        }
      }
    }

    // Step 5: Emergency contacts' residence is mandatory; place of birth is
    // strictly optional.
    if (step === 5) {
      for (const p of ["ec1", "ec2"]) {
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") {
          required = [...required, `${p}ResTerritory`, `${p}ResRegion`, `${p}ResDistrict`, `${p}ResWard`, `${p}ResStreet`];
        } else if (resCountry) {
          required = [...required, `${p}ResCity`];
        } else {
          required = [...required, `${p}ResCountry`];
        }
      }
    }

    // Step 6: Relatives' residence is mandatory — Tanzania needs Ward + Street,
    // abroad needs City (the two mandatory relatives, rel1/rel2). No country =
    // require it.
    if (step === 6) {
      for (const p of ["rel1", "rel2"]) {
        const resCountry = typeof data[`${p}ResCountry`] === "string" ? (data[`${p}ResCountry`] as string).trim() : "";
        if (resCountry === "Tanzania") {
          required = [...required, `${p}ResTerritory`, `${p}ResRegion`, `${p}ResDistrict`, `${p}ResWard`, `${p}ResStreet`];
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

  function goTo(n: number) {
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
  // re-login) and send the user to the login screen.
  function signOutToLogin() {
    persistDraft();
    router.push("/login");
  }

  function saveExit() {
    persistDraft();
    notify(t("toast.draftSaved"));
    router.push("/dashboard");
  }

  // Surface a submit failure: an expired session opens the blocking dialog
  // (sign out & back to login); anything else shows the inline form error AND,
  // when the backend pinpoints offending fields, the message inline at exactly
  // those fields.
  function reportSubmitError(err: unknown) {
    if (err instanceof SessionExpiredError) {
      setSessionExpired(true);
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
        if (hit) apiFieldErrors[`attach${hit.id}`] = message;
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
          { keyword: "relative", prefix: "rel", countKey: "relativeCount", min: 2 },
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
    // field — e.g. "Document number may only contain … (received: 'lkjhgjkl;')".
    // When nothing else mapped, locate the form field whose current value is
    // exactly that rejected value and pin the message there.
    if (Object.keys(apiFieldErrors).length === 0) {
      const received = message.match(/received:\s*'([^']*)'/i)?.[1];
      if (received) {
        const hit = Object.entries(data).find(
          ([, v]) => typeof v === "string" && v === received,
        );
        if (hit) apiFieldErrors[hit[0]] = message;
      }
    }
    const fieldKeys = Object.keys(apiFieldErrors);
    if (fieldKeys.length > 0) {
      setFieldErrors(apiFieldErrors);
      setErrors(fieldKeys);
      // The message is now shown inline at the field — no duplicate banner or toast.
      setFormError("");
      return;
    }
    setFormError(message);
    notify(message, "error");
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
      const rel = Math.max(2, Number(String(data.relativeCount ?? "")) || 2);
      for (let i = 1; i <= rel; i++) out.push(`rel${i}Phone`);
      if (data.isMarried === true) {
        const sp = Math.max(1, Number(String(data.spouseCount ?? "")) || 1);
        for (let i = 1; i <= sp; i++) out.push(`sp${i}Phone`);
      }
      if (data.hasChildren === true) {
        const ch = Math.max(1, Number(String(data.childCount ?? "")) || 1);
        for (let i = 1; i <= ch; i++) out.push(`ch${i}Phone`);
      }
      return out;
    }
    return [];
  }

  async function handlePrimary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      onComplete(data, applicationId);
      return;
    }
    const missing = missingFields();
    if (missing.length > 0) {
      setErrors(missing);
      setFieldErrors({});
      setFormError("");
      return;
    }
    if (step === 1) {
      // Each check below pins the message to its own field (no banner).
      // Email must be a valid format.
      const email = typeof data.email === "string" ? data.email.trim() : "";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors(["email"]);
        setFieldErrors({ email: t("form.emailInvalid") });
        setFormError("");
        return;
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
      const adult = isAtLeast18(dob);
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

      // NIDA (optional) must be exactly 20 digits when provided.
      const nidaField = await nidaLengthError([{ group: "applicant", prefix: "" }]);
      if (nidaField) {
        setErrors([nidaField]);
        setFieldErrors({ [nidaField]: t("registry.nidaExactDigits") });
        setFormError("");
        return;
      }
    }

    // Stage 3 — each parent's NIDA document must be exactly 20 digits when given.
    if (step === 3) {
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

      // Each parent must be at least 16 years older than the applicant — raise
      // the error at that parent's date-of-birth field.
      const subjectDob = typeof data.dob === "string" ? data.dob : "";
      for (const p of ["father", "mother"] as const) {
        const pDob = typeof data[`${p}Dob`] === "string" ? (data[`${p}Dob`] as string) : "";
        if (subjectDob && pDob && !atLeastYearsOlder(pDob, subjectDob, 16)) {
          const field = `${p}Dob`;
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

    // Stage 4: if the user said they attended school, at least the primary
    // education (first school) must be filled in.
    if (step === 4 && data.neverAttendedSchool !== true) {
      const filled = (n: string) =>
        typeof data[n] === "string" && (data[n] as string).trim() !== "";
      // Primary school (edu1) needs level, name and city; index number is
      // optional. The completion year is required only for a level marked
      // completed — for the primary school and any started extra school.
      const missing = ["edu1Level", "edu1School", "edu1District"].filter((n) => !filled(n));
      const count = Math.max(1, Number(data.eduCount) || 1);
      // Derive the birth year for completion-year lower bound.
      const dobStr = typeof data.dob === "string" ? data.dob : "";
      const birthYear = dobStr ? new Date(dobStr).getFullYear() : 1900;
      const minYear = Number.isFinite(birthYear) && birthYear > 1900 ? birthYear : 1900;
      const currentYear = new Date().getFullYear();
      const yearErrors: Record<string, string> = {};
      for (let i = 1; i <= count; i++) {
        const p = `edu${i}`;
        if (i > 1 && !filled(`${p}School`)) continue;
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
        const RANK_LABELS = ["Primary", "Ordinary Level", "Advanced Level", "Undergraduate"];
        let eduLevels: { id: number; name: string }[] = [];
        try { eduLevels = await getEducationLevels(); } catch { /* ignore */ }
        function levelRank(levelId: string): number {
          const item = eduLevels.find((l) => String(l.id) === levelId);
          if (!item) return -1;
          const n = item.name.toLowerCase();
          if (n.includes("primary") || n.includes("msingi")) return 0;
          if (n.includes("ordinary") || n.includes("o level") || n.includes("sekondari")) return 1;
          if (n.includes("advanced") || n.includes("a level")) return 2;
          if (n.includes("undergraduate") || n.includes("shahada ya kwanza") || n.includes("degree")) return 3;
          return -1;
        }
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

    // Stage 4: self-employed must provide a text occupation (mandatory).
    if (step === 4 && String(data.jobStatus ?? "") === "Self-employed") {
      const occ = typeof data.selfOccupation === "string" ? data.selfOccupation.trim() : "";
      if (!occ) {
        setErrors(["selfOccupation"]);
        setFieldErrors({ selfOccupation: t("fields.isRequired").replace("{field}", t("fields.occupation")) });
        setFormError("");
        return;
      }
    }

    // Stage 4: employed must provide an employer (mandatory).
    if (step === 4 && String(data.jobStatus ?? "").toLowerCase() === "employed") {
      const emp = typeof data.employer === "string" ? data.employer.trim() : "";
      if (!emp) {
        setErrors(["employer"]);
        setFieldErrors({ employer: t("fields.isRequired").replace("{field}", t("fields.employer")) });
        setFormError("");
        return;
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
          ? [`${p}ResRegion`, `${p}ResDistrict`, `${p}ResWard`, `${p}ResStreet`]
          : resCountry
            ? [`${p}ResCity`]
            : [`${p}ResCountry`];
        const missingSpouse = [
          `${p}First`,
          `${p}Middle`,
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
          ? [`${p}ResRegion`, `${p}ResDistrict`, `${p}ResWard`, `${p}ResStreet`]
          : resCountry
            ? [`${p}ResCity`]
            : [`${p}ResCountry`];
        const missingChild = [
          `${p}First`,
          `${p}Middle`,
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
    if (step === 8) {
      const have = new Set(parseAttachments(data.attachments).map((a) => a.typeId));
      // The passport photo isn't shown as a row here — it's captured at Stage 1
      // and uploaded/merged automatically by the submit path below — so it must
      // not gate this visible pre-check (else Save dead-ends on a hidden row).
      const missing = MANDATORY_ATTACHMENT_TYPE_IDS.filter(
        (id) => id !== PASSPORT_PHOTO_TYPE && !have.has(id),
      );
      if (missing.length > 0) {
        // Flag each missing document at its own row (no generic banner).
        setErrors(missing.map((id) => `attach${id}`));
        setFieldErrors({});
        setFormError("");
        return;
      }
    }

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
            await editStage1(sid, data, isFirstPerson);
            // The photo isn't part of the Stage 1 JSON — it's uploaded
            // separately. On an edit, (re)upload it when the user captured a new
            // photo (a data: URL) so the change actually reaches the backend.
            const photoDataUrl =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : "";
            if (sid && photoDataUrl.startsWith("data:")) {
              const att = await uploadPassportPhoto(sid, photoDataUrl);
              if (att) recordPhotoAttachment(att);
            }
          } else {
            const photoDataUrl =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : undefined;
            const response = await submitStage1(data, isFirstPerson, photoDataUrl);
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
          }
        } else if (step === 2) {
          await (edit ? editStage2(sid, data) : submitStage2(sid, data));
        } else if (step === 3) {
          await (edit ? editStage3(sid, data) : submitStage3(sid, data));
        } else if (step === 4) {
          await (edit
            ? editStage4(sid, data, isFirstPerson)
            : submitStage4(sid, data, isFirstPerson));
        } else if (step === 5) {
          await (edit ? editStage5(sid, data) : submitStage5(sid, data));
        } else if (step === 6) {
          await (edit ? editStage6(sid, data) : submitStage6(sid, data));
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

    // If the user jumped back to edit an earlier stage, return them to where
    // they were; otherwise advance sequentially.
    const next = returnStep && returnStep > step
      ? Math.min(returnStep, TOTAL)
      : Math.min(step + 1, TOTAL);
    setReturnStep(null);

    // After Personal Information: display the Application ID
    const isNewAppId = step === 1 && !applicationId;
    if (step === 1 && !appId) {
      appId = generateApplicationId();
      setApplicationId(appId);
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
      data: mergedData ?? data,
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
    setStep((s) => s - 1);
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

        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-sm font-semibold text-success">
              {t(`registry.s${step}Tag`)}
            </p>
            <h1 className="mt-1 font-display text-4xl font-black tracking-tight text-navy-700">
              {t(`registry.s${step}Heading`)}
            </h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              {t(`registry.s${step}Intro`)}
            </p>

            <form onSubmit={handlePrimary} className="mt-6">
              <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
                <WizardProvider
                  data={data}
                  set={set}
                  setQuiet={setQuiet}
                  blur={blur}
                  errors={errors}
                  fieldErrors={fieldErrors}
                  locked={locked}
                  isFirstPerson={isFirstPerson}
                  onGoToStep={goTo}
                  onSessionExpired={() => setSessionExpired(true)}
                >
                  {stageLoading ? <StageSkeleton /> : <StepComponent />}
                </WizardProvider>

                {/* Field-level errors render inline at each field. Only a
                    genuine form-level message (e.g. a submit/API failure) is
                    surfaced here as a banner — never a grouped list of fields. */}
                {formError && (
                  <p role="alert" data-form-error className="mt-6 text-sm font-medium text-danger">
                    {formError}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 transition hover:text-gold-700"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    {t(`registry.back${step}`)}
                  </button>

                  <button
                    type="submit"
                    disabled={(isLast && !agreed) || submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    )}
                    {isLast ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t("registry.complete")}
                      </>
                    ) : (
                      <>
                        {t("registry.next")}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
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

      {sessionExpired && <SessionExpiredDialog onSignIn={signOutToLogin} />}
    </div>
  );
}
