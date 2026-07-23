import type { Metadata } from "next";
import { Suspense } from "react";
import StatusChecker from "./statusChecker";

export const metadata: Metadata = {
  title: "Application Status — CRCS Tanzania",
  description:
    "Check the status of a Citizen Registry application by its Application ID.",
};

export default function StatusPage() {
  return (
    <Suspense fallback={<div>Loading status page...</div>}>
      <StatusChecker />
    </Suspense>
  );
}