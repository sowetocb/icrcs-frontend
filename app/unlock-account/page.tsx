import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/authShell";
import UnlockAccountFlow from "./unlockAccountFlow";

export const metadata: Metadata = {
  title: "Unlock Account — ICRCS Tanzania",
  description: "Unlock your ICRCS account.",
};

export default function UnlockAccountPage() {
  return (
    <AuthShell>
      {/* UnlockAccountFlow reads useSearchParams(); a Suspense boundary is
          required so the static prerender can bail out to client rendering. */}
      <Suspense fallback={null}>
        <UnlockAccountFlow />
      </Suspense>
    </AuthShell>
  );
}
