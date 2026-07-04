"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "./messages";
import { useI18n } from "./localeProvider";
import { Globe, ChevronDown, Check } from "lucide-react";

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

  // Trigger colours adapt to the surface the switcher floats over: white on the
  // navy post-login top bar, bluish (navy) on the light pre-login auth pages.
  const triggerCls =
    variant === "onLight"
      ? "border-navy-700/25 bg-navy-700/5 text-navy-700 shadow-navy-900/10 hover:bg-navy-700/10"
      : "border-white/25 bg-white/10 text-white shadow-black/40 hover:bg-white/20";

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
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-base font-semibold leading-none shadow-lg backdrop-blur-sm transition ${triggerCls}`}
      >
        <Globe size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="">{current.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={current.label}
          className="absolute right-0 z-50 mt-2 min-w-[9rem] overflow-hidden rounded-lg border border-line bg-card py-1 text-sm shadow-xl shadow-black/20"
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
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
                    active
                      ? "bg-navy-700/10 font-semibold text-navy-700"
                      : "text-ink hover:bg-surface"
                  }`}
                >
                  <span>{label}</span>
                  {active && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
