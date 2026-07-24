"use client";

import { FieldSkeleton, SkeletonBar } from "@/components/ui/skeleton";

/**
 * Placeholder shown in place of a wizard stage while its previously-submitted
 * data is being re-fetched from the backend (see registryWizard's re-hydrate
 * effect). Mimics the typical stage layout — a couple of two-column field rows
 * and a wider block — so the form reveals populated fields without an empty
 * "pop". Purely decorative.
 */
export default function StageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
      <FieldSkeleton />
      <div className="rounded-xl border border-line bg-card p-5">
        <SkeletonBar className="mb-4 h-4 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>
    </div>
  );
}
