"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  Locale,
  Messages,
  messages,
} from "./messages";

const STORAGE_KEY = "icrcs-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a dot-path key, e.g. t("form.signIn"). */
  t: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolve(dict: Messages, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : path;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from storage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in messages && stored !== locale) {
      // Sync the persisted locale from localStorage on first mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync with the active locale.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (path: string) => resolve(messages[locale], path);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within a LocaleProvider");
  return ctx;
}
