"use client";

import { useEffect } from "react";

/**
 * Warn the user before leaving the page while there are unsaved changes.
 *
 * Covers the two ways out of a client-rendered page:
 *  - the browser's native prompt for a refresh, tab/window close, or navigation
 *    to an external URL (via `beforeunload`);
 *  - a `confirm()` reminder when an in-app link (an `<a href>`, e.g. the top-bar
 *    navigation) would take the user to a different route;
 *  - a `confirm()` reminder for the browser Back / Forward buttons (Alt+←),
 *    which fire `popstate` in a client-rendered app rather than `beforeunload`.
 *
 * The wizard's own controls (step buttons, Save & Exit) are plain buttons — not
 * anchors — so they aren't intercepted here; Save & Exit persists the draft
 * before navigating, and switching steps keeps the in-memory data.
 */
export function useUnsavedChanges(enabled: boolean, message: string) {
  useEffect(() => {
    if (!enabled) return;

    // Refresh / close / external navigation → native browser prompt.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // In-app link clicks → confirm before leaving the current route.
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      // Compare destinations so in-page anchors / no-op links don't prompt.
      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (
        dest.pathname === window.location.pathname &&
        dest.search === window.location.search
      )
        return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);

    // Back / Forward (Alt+←) → popstate in a client-rendered app. Seed a history
    // entry so the first Back lands here; confirm before letting it through.
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      if (window.confirm(message)) {
        // Allow the navigation: stop guarding and step back past our sentinel.
        window.removeEventListener("popstate", onPopState);
        window.history.back();
      } else {
        // Stay put: re-seed the sentinel so a future Back prompts again.
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, message]);
}
