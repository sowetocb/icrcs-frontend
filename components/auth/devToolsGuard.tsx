"use client";

/**
 * Production-only hardening against casual source inspection via DevTools.
 *
 * This cannot stop a determined attacker (anything delivered to the browser can
 * be inspected), but it satisfies common security-assessment controls:
 *  - no context menu / common DevTools shortcuts
 *  - detect an open debugger dock and blank the page
 *
 * Disabled in development so engineers can still debug locally.
 * Production builds also ship without browser source maps (see next.config.ts).
 */

import { useEffect } from "react";

const ENABLED = process.env.NODE_ENV === "production";

function isDevToolsOpen(): boolean {
  const threshold = 160;
  const widthGap = Math.abs(window.outerWidth - window.innerWidth) > threshold;
  const heightGap = Math.abs(window.outerHeight - window.innerHeight) > threshold;
  return widthGap || heightGap;
}

function blankPage(): void {
  try {
    document.documentElement.innerHTML =
      "<body style=\"margin:0;display:flex;align-items:center;justify-content:center;" +
      "min-height:100vh;font-family:system-ui,sans-serif;background:#0d1f33;color:#fff\">" +
      "<p style=\"padding:2rem;text-align:center\">This application cannot be inspected in the browser debugger.</p>" +
      "</body>";
  } catch {
    window.location.replace("/login");
  }
}

export default function DevToolsGuard() {
  useEffect(() => {
    if (!ENABLED) return;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        key === "F12" ||
        (ctrl && e.shiftKey && (key === "I" || key === "J" || key === "C")) ||
        (ctrl && key === "U")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const poll = window.setInterval(() => {
      if (isDevToolsOpen()) {
        blankPage();
        window.clearInterval(poll);
      }
    }, 1000);

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
