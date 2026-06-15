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
  const [mode, setMode] = useState<Mode>("landing");
  const [submission, setSubmission] = useState<{
    id: string;
    date: string;
    data: Record<string, string | boolean>;
  } | null>(null);

  // Registration gating (read after mount; localStorage is client-only):
  //  - selfDone: the profile owner's registration has been completed.
  //  - hasIncomplete: a registration is in progress (draft not yet completed).
  const [selfDone, setSelfDone] = useState(false);
  const [hasIncomplete, setHasIncomplete] = useState(false);
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
          // If any registration is completed/submitted:
          const hasRemoteCompleted = remoteList.some(
            (p) => !(p.status === "PENDING" && p.currentStage < 9)
          );
          if (hasRemoteCompleted) {
            setSelfDone(true);
          }

          // If any registration is incomplete (status === "PENDING" && currentStage < 6):
          const remoteIncomplete = remoteList.find(
            (p) => p.status === "PENDING" && p.currentStage < 9
          );
          if (remoteIncomplete) {
            setHasIncomplete(true);
            // If there's no local draft, or the local draft doesn't match this incomplete registration,
            // we write/sync it to local storage so the wizard can resume from it.
            const currentDraft = loadRegistrationFor(ownerId);
            if (!currentDraft || currentDraft.subjectId !== remoteIncomplete.subjectId) {
              const nameParts = remoteIncomplete.fullName.trim().split(/\s+/).filter(Boolean);
              const first = nameParts[0] || "";
              const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
              const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

              saveRegistration({
                step: remoteIncomplete.currentStage + 1,
                completed: false,
                ownerId,
                subjectId: remoteIncomplete.subjectId,
                applicationId: remoteIncomplete.subjectId,
                submittedStages: Array.from(
                  { length: remoteIncomplete.currentStage },
                  (_, i) => i + 1
                ),
                data: {
                  applicantFirst: first,
                  applicantMiddle: middle,
                  applicantLast: last,
                  email: remoteIncomplete.email,
                  phone: remoteIncomplete.phoneNumber,
                },
              });
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
