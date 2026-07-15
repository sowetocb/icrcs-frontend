"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Shared open/closed state for the mobile navigation drawer, so the drawer
 * toggle can live in the top bar (DashboardTopbar) while the drawer itself lives
 * in a sibling sidebar (CitizenSidebar on dashboard/landing pages, Stepper in the
 * registration wizard). Only one sidebar is mounted at a time, so a single shared
 * flag is unambiguous. On lg+ the sidebar is always visible and this is ignored.
 */
type MobileNavValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MobileNavContext = createContext<MobileNavValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MobileNavContext.Provider>
  );
}

/** Access the shared mobile-nav drawer state. Safe to call outside a provider
 * (returns a no-op closed state) so components don't crash if one is missing. */
export function useMobileNav(): MobileNavValue {
  return (
    useContext(MobileNavContext) ?? {
      open: false,
      setOpen: () => {},
      toggle: () => {},
    }
  );
}
