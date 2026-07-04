"use client";

// A route-level template re-mounts on every client navigation (unlike a layout,
// which persists). Wrapping each route in a short fade turns page-to-page moves
// into a smooth cross-fade instead of an abrupt swap / white flash.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
