"use client";

import { useEffect, useState } from "react";
import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";
import RegistryLanding from "./registryLanding";
import CitizenshipGate from "./citizenshipGate";
import RegistryWizard from "./registryWizard";
import RegistrySuccess from "./registrySuccess";
import { clearRegistration, loadRegistrationFor, saveRegistration } from "./registrationStore";
import { addPerson, loadPeople, isSubmitted } from "./peopleStore";
import { generateApplicationId, formatSubmittedDate } from "./applicationId";
import { loadProfile } from "@/lib/auth/profile";
import { getRegisteredPeople } from "@/lib/api/registry";

type Mode = "landing" | "gate" | "wizard" | "success";

export default function RegistryClient() {
  // Opening the Citizen Registry always shows the landing page — the user picks
  // "Resume Registration" to continue an in-progress draft. (The navigation
  // type from `performance` is unreliable here: it reflects the original
  // document load, so a sidebar click after a refresh wrongly looked like a
  // reload and auto-resumed the wizard.)
  const [mode, setMode] = useState<Mode>("landing");
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
                applicationId: remoteIncomplete.subjectId,
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
    // Add to the list of people registered under this profile.
    const isCreator = loadPeople().filter(isSubmitted).length === 0;
    const name =
      [data.applicantFirst, data.applicantMiddle, data.applicantLast]
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .join(" ") || "—";
    addPerson({ applicationId: id, submittedDate: date, name, isCreator, status: "submitted", data });
    setSubmission({ id, date, data });
    setMode("success");
  }

  function startFresh() {
    // Rule 2: cannot start a new registration while one is incomplete.
    if (hasIncomplete) return;
    clearRegistration();
    // Citizenship is verified on an independent gate before the wizard.
    setMode("gate");
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
            />
          </div>
        )}

        {mode === "gate" && (
          <div className="flex flex-1">
            <CitizenSidebar />
            <CitizenshipGate
              onCitizen={() => setMode("wizard")}
              onExit={() => setMode("landing")}
            />
          </div>
        )}

        {mode === "wizard" && (
          <RegistryWizard
            selfDone={selfDone}
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
