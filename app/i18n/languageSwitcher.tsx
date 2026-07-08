"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "./messages";
import { useI18n } from "./localeProvider";
import { Globe } from "lucide-react";

/** Globe + current-language dropdown (styled for the dark header). Click the
 * trigger to reveal a light card menu listing the available languages. */
export default function LanguageSwitcher({
  variant = "onDark",
}: {
  variant?: "onDark" | "onLight";
}) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Minimal, borderless trigger (globe + label only). Colours adapt to the
  // surface the switcher floats over: white on the navy post-login top bar,
  // navy on the light pre-login auth pages.
  const triggerCls =
    variant === "onLight"
      ? "text-navy-700 hover:text-navy-900"
      : "text-white hover:text-white/80";

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current.label}
        className={`inline-flex items-center gap-1 px-1 py-1 text-base font-semibold leading-none transition ${triggerCls}`}
      >
        <Globe size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{current.label}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={current.label}
          className="absolute left-0 z-50 mt-2 min-w-[7rem] overflow-hidden rounded-lg border border-line bg-card py-1 text-sm shadow-xl shadow-black/20"
        >
          {LOCALES.map(({ code, label }) => {
            const active = locale === code;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2 text-left transition ${
                    active
                      ? "bg-navy-700/10 font-semibold text-navy-700"
                      : "text-ink hover:bg-surface"
                  }`}
                >
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
