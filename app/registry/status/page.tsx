import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import StatusChecker from "./statusChecker";

export const metadata: Metadata = {
  title: "Application Status — CRCS Tanzania",
  description:
    "Check the status of a Citizen Registry application by its Application ID.",
};

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12"><PageSkeleton /></div>}>
      <StatusChecker />
    </Suspense>
  );
}