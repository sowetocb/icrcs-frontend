"use client";

import { LOCALES } from "./messages";
import { useI18n } from "./localeProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  // One segmented control: flush segments inside a single rounded, bordered
  // container so it doesn't read as two separate buttons.
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-white/25 text-base leading-none shadow-lg shadow-black/60 backdrop-blur-sm">
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
                ? "bg-[#16395c] px-5 py-2.5 font-semibold text-white"
                : "bg-white/10 px-5 py-2.5 font-semibold text-white/90 transition hover:bg-white/20 hover:text-white"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
