"use client";

import { useEffect } from "react";

// The application is light-mode only. This provider simply guarantees the dark
// class is never applied, and the no-flash script clears any previously stored
// dark preference before first paint.

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      window.localStorage.removeItem("icrcs-theme");
    } catch {
      // ignore
    }
  }, []);

  return <>{children}</>;
}

// Render-blocking script that strips any persisted dark class before paint, so
// a previously dark session loads as light without a flash.
export const themeNoFlashScript = `(function(){try{document.documentElement.classList.remove('dark');}catch(e){}})();`;
