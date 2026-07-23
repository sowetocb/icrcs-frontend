import type { Metadata } from "next";
import AuthShell from "@/components/auth/authShell";
import ForgotFlow from "./forgotFlow";

export const metadata: Metadata = {
  title: "Reset Password — CRCS Tanzania",
  description: "Reset your CRCS account password.",
};

export default function ForgotPage() {
  return (
    <AuthShell>
      <ForgotFlow />
    </AuthShell>
  );
}
