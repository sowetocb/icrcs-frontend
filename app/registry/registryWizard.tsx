"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardProvider } from "@/components/registry/field";
import Stepper from "@/components/registry/stepper";
import HelpfulTip from "@/components/registry/helpfulTip";
import { useI18n } from "../i18n/localeProvider";
import { loadRegistration, loadRegistrationFor, saveRegistration } from "./registrationStore";
import { loadProfile, type Profile } from "@/lib/auth/profile";
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
} from "@/lib/api/registration";
import { previewToForm } from "@/lib/registry/previewToForm";
import { getErrorMessage } from "@/lib/api/client";
import ApplicationIdDialog from "./applicationIdDialog";
import StepPersonal from "./steps/stepPersonal";
import StepAddress from "./steps/stepCitizenship";
import StepGuardian from "./steps/stepGuardian";
import StepEducation from "./steps/stepEducation";
import StepEmergency from "./steps/stepEmergency";
import StepFamily from "./steps/stepFamily";
import StepReferees from "./steps/stepReferees";
import StepAttachments from "./steps/stepAttachments";
import StepPreviewDeclaration from "./steps/stepPreviewDeclaration";

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
    "pobCountry",
    "marriage",
    "phone",
    "email",
  ],
  // Step 2: Address (permanent Region/District/Ward; current added when unlinked)
  ["permRegion", "permDistrict", "permWard"],
  // Step 3: Parents (father + mother full names + gender + DOB + nationality;
  // phone is optional)
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
  // Step 5: Emergency Contacts (full name + gender required)
  [
    "ec1RelType",
    ...nameFields("ec1"),
    "ec1Gender",
    "ec1Phone",
    "ec2RelType",
    ...nameFields("ec2"),
    "ec2Gender",
    "ec2Phone",
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
  onExit,
  onComplete,
}: {
  selfDone: boolean;
  onExit: () => void;
  onComplete: (data: Record<string, string | boolean>, applicationId: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();

  // The first registration under a profile is the account holder themselves.
  const [isFirstPerson] = useState(() => !selfDone);
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
      ? selfDone
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
  const [formError, setFormError] = useState("");
  const [applicationId, setApplicationId] = useState(
    () => resumable?.applicationId ?? "",
  );
  const [showIdDialog, setShowIdDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState(() => resumable?.subjectId ?? "");
  const [submittedStages, setSubmittedStages] = useState<Set<number>>(
    () => new Set(resumable?.submittedStages ?? []),
  );
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

  const set = (name: string, value: string | boolean) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => (e.includes(name) ? e.filter((n) => n !== name) : e));
    if (name === "dob") validateDob(typeof value === "string" ? value : "");
  };

  function validateDob(dob: string) {
    if (!dob) {
      setErrors((e) => e.filter((n) => n !== "dob"));
      setFormError("");
      return;
    }
    if (isFutureDate(dob)) {
      setErrors((e) => (e.includes("dob") ? e : [...e, "dob"]));
      setFormError(t("registry.futureDateError"));
      return;
    }
    const adult = isAtLeast18(dob);
    const invalid = isFirstPerson ? !adult : adult;
    if (invalid) {
      setErrors((e) => (e.includes("dob") ? e : [...e, "dob"]));
      setFormError(isFirstPerson ? t("registry.ageError") : t("registry.minorError"));
    } else {
      setErrors((e) => e.filter((n) => n !== "dob"));
      setFormError("");
    }
  }

  const isLast = step === TOTAL;
  const agreed = data.agree === true;
  const StepComponent = STEP_COMPONENTS[step - 1];

  function missingFields() {
    let required = REQUIRED_FIELDS[step - 1];

    // Step 1: Place of birth. Tanzanian births need the Ward + Street/Mtaa from
    // the cascade (the backend rejects Stage 1 without a street); foreign births
    // hide those fields entirely.
    if (step === 1) {
      const pobIsTz = !data.pobCountry || data.pobCountry === "Tanzania";
      if (pobIsTz) {
        required = [...required, "pobWard", "pobStreet"];
      } else {
        // Foreign births: drop the TZ cascade fields and require the free-text
        // city of birth instead (the /foreign endpoint rejects a blank one).
        const tzOnly = new Set(["pobRegion", "pobDistrict", "pobWard", "pobVillage"]);
        required = [...required.filter((n) => !tzOnly.has(n)), "pobCityVillage"];
      }
    }


    // Step 2: Region/District/Ward only apply to Tanzania — they're hidden for
    // other countries, so don't require them there.
    if (step === 2) {
      const permIsTz = !data.permCountry || data.permCountry === "Tanzania";
      if (!permIsTz) {
        // Foreign permanent address: drop the TZ cascade, require the city.
        required = [
          ...required.filter((n) => !["permRegion", "permDistrict", "permWard"].includes(n)),
          "permCity",
        ];
      }
      // The current address (when not linked) needs its own R/D/W in Tanzania,
      // or a free-text city when abroad.
      if (data.sameAsPerm !== true) {
        const curIsTz = !data.curCountry || data.curCountry === "Tanzania";
        required = curIsTz
          ? [...required, "curRegion", "curDistrict", "curWard"]
          : [...required, "curCity"];
      }
    }

    // Step 3: Parents' place of birth + residence are mandatory. Each is a
    // cascade — Tanzania needs the Ward (+ Street for residence); abroad needs
    // the country + the free-text city/village.
    if (step === 3) {
      for (const p of ["father", "mother"]) {
        const pobTz = !data[`${p}PobCountry`] || data[`${p}PobCountry`] === "Tanzania";
        required = pobTz
          ? [...required, `${p}PobWard`]
          : [...required, `${p}PobCountry`, `${p}Village`];

        const resTz = !data[`${p}ResCountry`] || data[`${p}ResCountry`] === "Tanzania";
        required = resTz
          ? [...required, `${p}ResWard`, `${p}ResStreet`]
          : [...required, `${p}ResCountry`, `${p}ResCity`];
      }
    }

    // Step 5: Emergency contacts' place of birth + residence are mandatory
    // (same cascade rules as the parents in Step 3).
    if (step === 5) {
      for (const p of ["ec1", "ec2"]) {
        const pobTz = !data[`${p}PobCountry`] || data[`${p}PobCountry`] === "Tanzania";
        required = pobTz
          ? [...required, `${p}PobWard`]
          : [...required, `${p}PobCountry`, `${p}Village`];

        const resTz = !data[`${p}ResCountry`] || data[`${p}ResCountry`] === "Tanzania";
        required = resTz
          ? [...required, `${p}ResWard`, `${p}ResStreet`]
          : [...required, `${p}ResCountry`, `${p}ResCity`];
      }
    }

    // Step 6: Relatives' residence is mandatory — Tanzania needs Ward + Street,
    // abroad needs Country + City (the two mandatory relatives, rel1/rel2).
    if (step === 6) {
      for (const p of ["rel1", "rel2"]) {
        const resTz = !data[`${p}ResCountry`] || data[`${p}ResCountry`] === "Tanzania";
        required = resTz
          ? [...required, `${p}ResWard`, `${p}ResStreet`]
          : [...required, `${p}ResCountry`, `${p}ResCity`];
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
    if (n >= 1 && n <= maxStep) {
      setErrors([]);
      setFormError("");
      setStep(n);
    }
  }

  function saveExit() {
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
    router.push("/dashboard");
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
        setFormError(getErrorMessage(err, t("registry.submitError")));
        return;
      }
      setSubmitting(false);
      onComplete(data, applicationId);
      return;
    }
    const missing = missingFields();
    if (missing.length > 0) {
      setFormError("");
      setErrors(missing);
      return;
    }
    if (step === 1) {
      // Email must be a valid format.
      const email = typeof data.email === "string" ? data.email.trim() : "";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors(["email"]);
        setFormError(t("form.emailInvalid"));
        return;
      }

      const dob = typeof data.dob === "string" ? data.dob : "";
      if (isFutureDate(dob)) {
        setErrors(["dob"]);
        setFormError(t("registry.futureDateError"));
        return;
      }
      const adult = isAtLeast18(dob);
      if (isFirstPerson && !adult) {
        setErrors(["dob"]);
        setFormError(t("registry.ageError"));
        return;
      }
      if (!isFirstPerson && adult) {
        setErrors(["dob"]);
        setFormError(t("registry.minorError"));
        return;
      }
    }

    // Stage 4: adults must supply their National ID (NIDA) number.
    if (step === 4) {
      // Unless they never attended school, at least one school must be filled.
      if (data.neverAttendedSchool !== true) {
        const count = Math.max(1, Number(data.eduCount) || 1);
        let hasSchool = false;
        for (let i = 1; i <= count; i++) {
          if (typeof data[`edu${i}School`] === "string" && (data[`edu${i}School`] as string).trim()) {
            hasSchool = true;
            break;
          }
        }
        if (!hasSchool) {
          setErrors(["edu1School"]);
          setFormError(t("registry.schoolRequired"));
          return;
        }
      }

      const dob = typeof data.dob === "string" ? data.dob : "";
      const adult = dob ? isAtLeast18(dob) : false;
      const nida = typeof data.nidaNumber === "string" ? data.nidaNumber.trim() : "";
      // NIDA is required only for the adult account holder — never for a minor.
      if (isFirstPerson && adult && !nida) {
        setErrors(["nidaNumber"]);
        setFormError(t("registry.nidaRequired"));
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
        setFormError(t("registry.spouseRequired"));
        return;
      }
      // Every started spouse needs a full name + gender + nationality + a
      // residence (Ward/Street in Tanzania, Country/City abroad) — the same
      // mandatory fields the backend enforces on relatives.
      for (let i = 1; i <= spouseCount; i++) {
        const p = `sp${i}`;
        if (!filled(`${p}First`)) continue;
        const resTz = !data[`${p}ResCountry`] || data[`${p}ResCountry`] === "Tanzania";
        const residence = resTz
          ? [`${p}ResWard`, `${p}ResStreet`]
          : [`${p}ResCountry`, `${p}ResCity`];
        const missingSpouse = [
          `${p}First`,
          `${p}Middle`,
          `${p}Last`,
          `${p}Gender`,
          `${p}NatCountry`,
          ...residence,
        ].filter((n) => !filled(n));
        if (missingSpouse.length > 0) {
          setErrors(missingSpouse);
          setFormError(t("registry.required"));
          return;
        }
      }
    }

    // NOTE: Passport Size Photo upload validation is temporarily disabled —
    // Stage 8 can be passed without uploading any document.
    // if (step === 8 && data.passportPhotoUploaded !== "true") {
    //   setFormError(t("registry.attachPhotoRequired"));
    //   return;
    // }

    setErrors([]);
    setFormError("");

    let sid = subjectId;
    let appId = applicationId;
    const updatedStages = new Set(submittedStages);
    const edit = submittedStages.has(step);

    // Submit stage to backend
    if (step >= 1 && step <= 8) {
      setSubmitting(true);
      try {
        if (step === 1) {
          if (edit) {
            await editStage1(sid, data, isFirstPerson);
          } else {
            const photoDataUrl =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : undefined;
            const response = await submitStage1(data, isFirstPerson, photoDataUrl);
            sid = response.subjectId;
            setSubjectId(sid);
            appId = response.applicationId || response.subjectId;
            if (appId) setApplicationId(appId);
            // Track the decoupled photo upload; if it failed (e.g. network), the
            // user retries at the Stage 8 gate without losing any data.
            set("passportPhotoUploaded", response.photoUploaded ? "true" : "");
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
          if (data.passportPhotoUploaded !== "true") {
            const photoData =
              typeof data.stage1PhotoData === "string" ? data.stage1PhotoData : "";
            if (photoData && sid && (await uploadPassportPhoto(sid, photoData))) {
              set("passportPhotoUploaded", "true");
            }
          }
          await (edit ? editStage8(sid, data) : submitStage8(sid, data));
        }
      } catch (err) {
        setSubmitting(false);
        setFormError(getErrorMessage(err, t("registry.submitError")));
        return;
      }
      setSubmitting(false);
      updatedStages.add(step);
      setSubmittedStages(updatedStages);
    }

    const next = Math.min(step + 1, TOTAL);

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
      data,
    });
    setStep(next);
  }

  function handleBack() {
    setErrors([]);
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
                  errors={errors}
                  locked={locked}
                  isFirstPerson={isFirstPerson}
                  onGoToStep={goTo}
                >
                  <StepComponent />
                </WizardProvider>

                {(formError || errors.length > 0) && (
                  <p role="alert" className="mt-6 text-sm font-medium text-danger">
                    {formError || t("registry.required")}
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
    </div>
  );
}
