import type { Metadata } from "next";
import AuthShell from "@/components/auth/authShell";
import ForgotFlow from "./forgotFlow";

export const metadata: Metadata = {
  title: "Reset Password — ICRCS Tanzania",
  description: "Reset your ICRCS account password.",
};

export default function ForgotPage() {
  return (
    <AuthShell>
      <ForgotFlow />
    </AuthShell>
  );
}
