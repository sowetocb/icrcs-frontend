"use client";

import { LOCALES } from "./messages";
import { useI18n } from "./localeProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/20 bg-white/10 p-0.5 text-xs backdrop-blur-sm">
      {LOCALES.map(({ code, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={
              active
                ? "rounded-md bg-white px-2 py-1 font-medium text-navy-700 shadow-sm"
                : "rounded-md px-2 py-1 font-medium text-white/70 transition hover:text-white"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
