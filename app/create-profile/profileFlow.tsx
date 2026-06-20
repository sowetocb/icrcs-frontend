"use client";

import { useState } from "react";
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
  phoneNumber: "",
  email: "",
  password: "",
};

export default function CreateProfileFlow() {
  const router = useRouter();
  const { t } = useI18n();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [details, setDetails] = useState<RegistrationDetails>(emptyDetails);
  const [preAuthToken, setPreAuthToken] = useState("");

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
    // Persist the account holder's details so their registration auto-fills.
    saveProfile({
      firstName: details.firstName,
      middleName: details.middleName,
      lastName: details.lastName,
      gender: details.gender,
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
      <div className="mb-6 flex items-center gap-2" aria-hidden="true">
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
