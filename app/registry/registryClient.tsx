"use client";

import { useEffect, useState } from "react";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import RegistryLanding from "./registryLanding";
import CategoryGate from "./categoryGate";
import CitizenshipGate from "./citizenshipGate";
import RegistryWizard from "./registryWizard";
import {
  CATEGORY_REGISTRATION_TYPE,
  isMigrantCategory,
  type RegistrationCategory,
} from "@/lib/registry/registrationCategory";
import type { RegistrationType } from "@/lib/api/registration";
import RegistrySuccess from "./registrySuccess";
import { clearRegistration, loadRegistrationFor, saveRegistration } from "./registrationStore";
import { addPerson, loadPeople, isSubmitted } from "./peopleStore";
import { generateApplicationId, formatSubmittedDate } from "./applicationId";
import { loadProfile } from "@/lib/auth/profile";
import { getRegisteredPeople } from "@/lib/api/registry";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/app/i18n/localeProvider";
import { RULES } from "@/lib/validation/rules";

type Mode = "landing" | "category" | "gate" | "wizard" | "success";

// Persisted per-tab (sessionStorage) so a page refresh returns to the same view.
const REGISTRY_MODE_KEY = "icrcs-registry-mode";
// False only on a fresh document load (a hard refresh or first navigation to the
// app); stays true across client-side navigations. This is how we let a refresh
// restore the view the user was on, while a sidebar click still opens landing —
// without relying on the unreliable `performance` navigation type.
let hasMountedInSession = false;

export default function RegistryClient() {
  const { notify } = useToast();
  const { t } = useI18n();
  // On a hard refresh, restore the view the user was on; on a client-side
  // navigation (e.g. a sidebar click), always open the landing page. "wizard"
  // is only restored when an in-progress draft still exists.
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined" || hasMountedInSession) return "landing";
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(REGISTRY_MODE_KEY);
    } catch {
      // sessionStorage unavailable — fall back to landing
    }
    if (saved === "wizard") {
      const ownerId = loadProfile()?.profileId ?? "";
      const draft = loadRegistrationFor(ownerId);
      if (draft && !draft.completed) return "wizard";
    } else if (saved === "gate") {
      return "gate";
    }
    return "landing";
  });
  // True when a verified non-citizen (foreign) profile is registering a
  // Tanzanian-origin minor rather than themselves.
  const [registeringMinor, setRegisteringMinor] = useState(false);
  // The foreign registrant's relationship to the minor ("guardian" | "parent"),
  // chosen in the gate dialog and used to branch Stage 3 (Parents).
  const [minorRelationship, setMinorRelationship] = useState<"guardian" | "parent" | "">("");
  // The migrant-track registrationType (MIGRANT / REFUGEE / ASYLUM_SEEKER) chosen
  // at the category gate; null for the citizen track. Passed to the wizard, which
  // uses it to hit the /stage1/migrant endpoint + show migrant-only steps.
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [submission, setSubmission] = useState<{
    id: string;
    date: string;
    data: Record<string, string | boolean>;
  } | null>(null);

  // Registration gating (read after mount; localStorage is client-only):
  //  - selfDone: the profile owner's registration has been completed.
  //  - hasIncomplete: a registration is in progress (draft not yet completed).
  const [selfDone, setSelfDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadPeople().some(isSubmitted);
  });
  const [hasIncomplete, setHasIncomplete] = useState(() => {
    if (typeof window === "undefined") return false;
    const ownerId = loadProfile()?.profileId ?? "";
    const draft = loadRegistrationFor(ownerId);
    return !!draft && !draft.completed;
  });
  // A dependent (minor) may only be registered once the ACCOUNT HOLDER's own
  // registration has been APPROVED by an officer. Defaults to false so the
  // action stays blocked until the backend confirms approval.
  const [ownerApproved, setOwnerApproved] = useState(false);
  // Persist the current view so a page refresh can restore it (see the mode
  // initializer above).
  useEffect(() => {
    try {
      sessionStorage.setItem(REGISTRY_MODE_KEY, mode);
    } catch {
      // ignore — sessionStorage unavailable
    }
  }, [mode]);

  // After the first mount, any later mount of this component is a client-side
  // navigation, which should open landing rather than restore the saved view.
  useEffect(() => {
    hasMountedInSession = true;
  }, []);

  useEffect(() => {
    // Only this account holder's own draft counts as "in progress".
    const ownerId = loadProfile()?.profileId ?? "";
    const draft = loadRegistrationFor(ownerId);
    
    // Check local storage first (synchronous/fallback)
    const localPeople = loadPeople();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelfDone(localPeople.some(isSubmitted));
    setHasIncomplete(!!draft && !draft.completed);

    // Sync progress from backend
    async function syncProgress() {
      try {
        const remoteList = await getRegisteredPeople();
        if (remoteList.length > 0) {
          // A registration is still "in progress" only while it's PENDING and
          // hasn't completed all 9 forms. Anything else (submitted, approved,
          // pending enrollment, etc.) is finished.
          const isIncomplete = (p: (typeof remoteList)[number]) =>
            p.status === "PENDING" && p.currentStage < 9;

          if (remoteList.some((p) => !isIncomplete(p))) {
            setSelfDone(true);
          }

          // The account holder's own registration is the first one created under
          // the profile (dependents are added afterwards). Registering a minor is
          // gated on that registration being APPROVED.
          const owner = remoteList
            .slice()
            .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))[0];
          setOwnerApproved(!!owner && owner.status.toUpperCase() === "APPROVED");

          // Stale-draft cleanup: if the local draft points to a registration the
          // backend already considers finished (e.g. completed in another
          // browser), drop it so the user isn't prompted to resume a finished
          // registration. A draft without a subjectId is a local-only, not-yet-
          // submitted draft and is left alone.
          const localDraft = loadRegistrationFor(ownerId);
          if (localDraft && !localDraft.completed && localDraft.subjectId) {
            const remoteMatch = remoteList.find(
              (p) => p.subjectId === localDraft.subjectId,
            );
            if (remoteMatch && !isIncomplete(remoteMatch)) {
              clearRegistration();
              setHasIncomplete(false);
            }
          }

          // If any registration is still genuinely incomplete on the backend:
          const remoteIncomplete = remoteList.find(isIncomplete);
          if (remoteIncomplete) {
            setHasIncomplete(true);
            // The backend is the source of truth for progress. Reconcile the
            // local draft with it so the wizard resumes at the right stage.
            const currentDraft = loadRegistrationFor(ownerId);
            // Stages the backend has accepted, and the step to resume at.
            const serverStep = remoteIncomplete.currentStage + 1;
            const serverSubmitted = Array.from(
              { length: remoteIncomplete.currentStage },
              (_, i) => i + 1,
            );

            if (!currentDraft || currentDraft.subjectId !== remoteIncomplete.subjectId) {
              // No matching local draft — seed one from the backend record.
              const nameParts = remoteIncomplete.fullName.trim().split(/\s+/).filter(Boolean);
              const first = nameParts[0] || "";
              const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
              const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

              saveRegistration({
                step: serverStep,
                maxStep: serverStep,
                completed: false,
                ownerId,
                subjectId: remoteIncomplete.subjectId,
                applicationId: remoteIncomplete.applicationId || remoteIncomplete.subjectId,
                submittedStages: serverSubmitted,
                data: {
                  applicantFirst: first,
                  applicantMiddle: middle,
                  applicantLast: last,
                  email: remoteIncomplete.email,
                  phone: remoteIncomplete.phoneNumber,
                },
              });
            } else {
              // Same registration: if the backend is ahead of the local draft
              // (a stage was submitted from another device, or a local submit
              // failed AFTER the server accepted it), advance the local draft so
              // the user resumes at the next unfilled stage instead of
              // re-submitting a completed one. Keep the locally-entered data.
              const mergedSubmitted = Array.from(
                new Set([...(currentDraft.submittedStages ?? []), ...serverSubmitted]),
              ).sort((a, b) => a - b);
              const step = Math.max(currentDraft.step ?? 1, serverStep);
              const advanced =
                step !== currentDraft.step ||
                mergedSubmitted.length !== (currentDraft.submittedStages?.length ?? 0);
              if (advanced) {
                saveRegistration({
                  ...currentDraft,
                  completed: false,
                  ownerId,
                  step,
                  maxStep: Math.max(currentDraft.maxStep ?? 1, step),
                  submittedStages: mergedSubmitted,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to sync registration progress from backend:", err);
      }
    }
    syncProgress();
  }, []);

  function handleComplete(
    data: Record<string, string | boolean>,
    applicationId: string,
  ) {
    const now = new Date();
    // Reuse the ID issued after Personal Information; fall back if absent.
    const id = applicationId || generateApplicationId(now);
    const date = formatSubmittedDate(now);
    // Persist the submitted application so the status check reflects it.
    saveRegistration({
      step: 9,
      completed: true,
      ownerId: loadProfile()?.profileId ?? undefined,
      applicationId: id,
      submittedDate: date,
      stage: 0,
      data,
    });
    // Add to the list of people registered under this profile. A minor
    // registered by a foreign profile is never the account holder.
    const isCreator =
      !registeringMinor && loadPeople().filter(isSubmitted).length === 0;
    const name =
      [data.applicantFirst, data.applicantMiddle, data.applicantLast]
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .join(" ") || "—";
    addPerson({ applicationId: id, submittedDate: date, name, isCreator, status: "submitted", data });
    setSubmission({ id, date, data });
    notify(t(registeringMinor ? "toast.minorRegistered" : "toast.registrationSubmitted"));
    setRegisteringMinor(false);
    setMode("success");
  }

  function startFresh() {
    // Rule 2: cannot start a new registration while one is incomplete.
    if (hasIncomplete) return;
    // Rule 2b: enforce the per-profile registration ceiling.
    const people = loadPeople();
    if (people.filter(isSubmitted).length >= RULES.REGISTRATIONS_PER_PROFILE_MAX) {
      notify(
        t("registry.registrationLimitReached").replace("{max}", String(RULES.REGISTRATIONS_PER_PROFILE_MAX)),
        "error",
      );
      return;
    }
    // Rule 3: once the account holder is registered, "start" means registering a
    // dependent — only allowed when their own registration is APPROVED.
    if (selfDone && !ownerApproved) {
      notify(t("registry.approvalRequiredNote"), "error");
      return;
    }
    clearRegistration();
    setRegisteringMinor(false);
    setRegistrationType(null);
    // Every fresh registration now starts at the category picker, which routes
    // Citizen/Foreign into the existing flow and Migrant/Refugee/Asylum into the
    // migrant track.
    setMode("category");
  }

  // Map the chosen category to a flow. Citizen → Stage 1 directly; Foreign →
  // the travel-document gate (+ minor registration); the migrant-track
  // categories carry their registrationType into the wizard.
  function chooseCategory(category: RegistrationCategory) {
    if (category === "FOREIGN") {
      setRegistrationType(null);
      setMode("gate");
      return;
    }
    if (isMigrantCategory(category)) {
      setRegistrationType(CATEGORY_REGISTRATION_TYPE[category] ?? null);
    } else {
      setRegistrationType(null);
    }
    setMode("wizard");
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-surface">
        <DashboardTopbar />

        {mode === "landing" && (
          <div className="flex flex-1">
            <CitizenSidebar />
            <RegistryLanding
              onStart={startFresh}
              onResume={() => setMode("wizard")}
              selfDone={selfDone}
              hasIncomplete={hasIncomplete}
              ownerApproved={ownerApproved}
            />
          </div>
        )}

        {mode === "category" && (
          <div className="flex flex-1">
            <CitizenSidebar />
            <CategoryGate
              onSelect={chooseCategory}
              onExit={() => setMode("landing")}
            />
          </div>
        )}

        {mode === "gate" && (
          <div className="flex flex-1">
            <CitizenSidebar />
            <CitizenshipGate
              nationality={loadProfile()?.nationality ?? ""}
              onRegisterMinor={(relationship) => {
                setRegisteringMinor(true);
                setMinorRelationship(relationship);
                setMode("wizard");
              }}
              onExit={() => setMode("landing")}
            />
          </div>
        )}

        {mode === "wizard" && (
          <RegistryWizard
            selfDone={selfDone}
            registeringMinor={registeringMinor}
            minorRelationship={minorRelationship}
            registrationType={registrationType ?? undefined}
            onExit={() => setMode("landing")}
            onComplete={handleComplete}
          />
        )}

        {mode === "success" && submission && (
          <RegistrySuccess
            applicationId={submission.id}
            submittedDate={submission.date}
            data={submission.data}
          />
        )}
      </div>
    </AuthGuard>
  );
}
