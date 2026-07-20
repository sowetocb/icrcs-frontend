"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepDetails, { RegistrationDetails } from "./stepDetails";
import StepOtp from "./stepOtp";
import { register, verifyOtp, resendOtp } from "@/lib/api/auth";
import { saveProfile } from "@/lib/auth/profile";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/app/i18n/localeProvider";

type Step = 1 | 2;

const emptyDetails: RegistrationDetails = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  nationality: "",
  phoneNumber: "",
  email: "",
  password: "",
};

// Persist just enough of the create-profile flow (per-tab) so a page refresh
// returns to the OTP step instead of the details step. The PASSWORD is never
// persisted; only the OTP step needs the pre-auth token + non-secret details.
const CREATE_PROFILE_STATE_KEY = "icrcs-create-profile-state";
let createProfileMountedInSession = false;

function readRestorableCreateProfile(): { details: RegistrationDetails; preAuthToken: string } | null {
  if (typeof window === "undefined" || createProfileMountedInSession) return null;
  try {
    const raw = sessionStorage.getItem(CREATE_PROFILE_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { step?: number; details?: Partial<RegistrationDetails>; preAuthToken?: string };
    // Only step 2 (OTP) is resumable, and it needs the pre-auth token.
    if (s.step === 2 && typeof s.preAuthToken === "string" && s.preAuthToken) {
      return {
        details: { ...emptyDetails, ...(s.details ?? {}), password: "" },
        preAuthToken: s.preAuthToken,
      };
    }
  } catch {
    // ignore malformed state
  }
  return null;
}

export default function CreateProfileFlow() {
  const router = useRouter();
  const { t } = useI18n();
  const { notify } = useToast();
  // Initialise to the SSR-safe defaults (step 1) so the first client render
  // matches the server. Reading sessionStorage in the useState initialiser would
  // make the client jump to step 2 while the server rendered step 1 — a
  // hydration mismatch. The resumable OTP step is restored in the effect below.
  const [step, setStep] = useState<Step>(1);
  const [details, setDetails] = useState<RegistrationDetails>(emptyDetails);
  const [preAuthToken, setPreAuthToken] = useState("");

  // Restore the resumable OTP step AFTER mount (client only). Runs before the
  // persist effect below (declaration order) so it reads the saved state before
  // that effect can clear it. Only a fresh document load (refresh) resumes; a
  // later client-side navigation starts clean (the module-level mounted flag).
  useEffect(() => {
    const restorable = readRestorableCreateProfile();
    createProfileMountedInSession = true;
    if (restorable) {
      setDetails(restorable.details);
      setPreAuthToken(restorable.preAuthToken);
      setStep(2);
    }
  }, []);

  // Persist the resumable OTP step so a refresh returns to it. The password is
  // stripped; step 1 clears the saved state.
  useEffect(() => {
    try {
      if (step === 2) {
        const { password: _password, ...safeDetails } = details;
        void _password;
        sessionStorage.setItem(
          CREATE_PROFILE_STATE_KEY,
          JSON.stringify({ step, details: safeDetails, preAuthToken }),
        );
      } else {
        sessionStorage.removeItem(CREATE_PROFILE_STATE_KEY);
      }
    } catch {
      // ignore — sessionStorage unavailable
    }
  }, [step, details, preAuthToken]);

  // Step 1: collect profile + password, POST /v1/auth/register (triggers email OTP).
  async function handleRegister(data: RegistrationDetails) {
    // The backend requires E.164 (e.g. +255712345678) — strip spaces/formatting.
    const phoneNumber = data.phoneNumber.replace(/[^\d+]/g, "");
    const normalized = { ...data, phoneNumber };
    const { preAuthToken: token } = await register({
      firstName: normalized.firstName,
      middleName: normalized.middleName,
      lastName: normalized.lastName,
      gender: normalized.gender,
      nationality: normalized.nationality,
      phoneNumber: normalized.phoneNumber,
      email: normalized.email,
      password: normalized.password,
    });
    setPreAuthToken(token);
    setDetails(normalized);
    setStep(2);
  }

  // Step 2: verify the OTP; on success we redirect to login page.
  async function handleVerify(otpCode: string) {
    await verifyOtp(otpCode, preAuthToken);
    // Flow complete — drop the resumable state before leaving.
    try {
      sessionStorage.removeItem(CREATE_PROFILE_STATE_KEY);
    } catch {
      // ignore
    }
    // Persist the account holder's details so their registration auto-fills.
    saveProfile({
      firstName: details.firstName,
      middleName: details.middleName,
      lastName: details.lastName,
      gender: details.gender,
      nationality: details.nationality,
      phoneNumber: details.phoneNumber,
      email: details.email,
    });
    notify(t("toast.otpVerified"));
    router.push("/login");
  }

  // Re-send the email OTP for the pending registration; keep the (possibly
  // rotated) pre-auth token so the next verify stays authorised.
  async function handleResend() {
    const { preAuthToken: token } = await resendOtp(details.email, preAuthToken);
    if (token) setPreAuthToken(token);
  }

  return (
    <div className="w-full">
      {/* Step progress */}
      <div className="mb-4 flex items-center gap-2" aria-hidden="true">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              n <= step ? "bg-gold" : "bg-line"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <StepDetails defaultValues={emptyDetails} onNext={handleRegister} />
      )}

      {step === 2 && (
        <StepOtp
          email={details.email}
          onNext={handleVerify}
          onResend={handleResend}
        />
      )}
    </div>
  );
}
