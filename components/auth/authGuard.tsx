"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { loadSession } from "@/lib/auth/session";

/**
 * Client-side route guard. Wraps protected page content and redirects
 * unauthenticated users to /login. Renders nothing (null) while checking
 * so protected content never flashes to unauthenticated eyes.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      // Not logged in — redirect to login
      router.replace("/login");
    } else {
      Promise.resolve().then(() => {
        setAuthorized(true);
      });
    }
  }, [pathname, router]);

  // Also listen for storage changes (logout from another tab)
  useEffect(() => {
    function onStorageChange(e: StorageEvent) {
      if (e.key === "icrcs-session" && !e.newValue) {
        router.replace("/login");
      }
    }
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [router]);

  if (!authorized) {
    // Show a loading shimmer while we check auth / redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
          <p className="text-sm text-muted">Verifying session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
