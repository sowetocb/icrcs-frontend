"use client";

/** Shared skeleton primitives — use while async data is loading across the app. */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-line/70 ${className}`} aria-hidden="true" />;
}

export function FieldSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="h-11 w-full" />
    </div>
  );
}

export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-2xl border border-line bg-card p-4">
          <SkeletonBar className="h-11 w-11 shrink-0 rounded-xl" />
          <SkeletonBar className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-line bg-card p-4" aria-hidden="true">
      <SkeletonBar className="h-4 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBar key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-card p-5">
          <SkeletonBar className="mb-3 h-4 w-40" />
          <SkeletonBar className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <SkeletonBar className="h-8 w-64" />
      <SkeletonBar className="h-4 w-full max-w-2xl" />
      <FormSkeleton rows={3} />
    </div>
  );
}
