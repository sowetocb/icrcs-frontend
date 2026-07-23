import type { Metadata } from "next";
import AuthShell from "@/components/auth/authShell";
import CreateProfileFlow from "./profileFlow";

export const metadata: Metadata = {
  title: "Create Profile — CRCS Tanzania",
  description:
    "Create your profile for sovereign access to the Integrated Citizen Registry and Control System.",
};

export default function CreateProfilePage() {
  return (
    <AuthShell wide>
      <CreateProfileFlow />
    </AuthShell>
  );
}
