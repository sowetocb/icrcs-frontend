import type { Metadata } from "next";
import AuthShell from "@/components/auth/authShell";
import UnlockAccountFlow from "./unlockAccountFlow";

export const metadata: Metadata = {
  title: "Unlock Account — ICRCS Tanzania",
  description: "Unlock your ICRCS account.",
};

export default function UnlockAccountPage() {
  return (
    <AuthShell>
      <UnlockAccountFlow />
    </AuthShell>
  );
}
