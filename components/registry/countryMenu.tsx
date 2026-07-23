"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";
import { useI18n } from "@/app/i18n/localeProvider";

// Rendered only while open (mounted on demand by the parent), so it starts
// with a fresh search query each time without resetting state in an effect.
export default function CountryMenu({
  onClose,
  onSelect,
  showDial = false,
  excludeTanzania = false,
  only,
  exclude,
}: {
  onClose: () => void;
  onSelect: (country: Country) => void;
  showDial?: boolean;
  /** When true, Tanzania is excluded from the list (for non-citizens picking
   * their nationality — they obviously aren't Tanzanian). */
  excludeTanzania?: boolean;
  /** When provided, ONLY these ISO country codes are selectable (e.g. the
   * countries bordering Tanzania for a transit-country field). */
  only?: string[];
  /** ISO country codes to REMOVE from the list (e.g. Tanzania + the 8 transit
   * countries for the international "Home Country" field). */
  exclude?: string[];
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = COUNTRIES;
    // Restrict to an explicit allow-list of ISO codes when provided (e.g. only
    // Tanzania's bordering countries for a transit-country field).
    if (only && only.length > 0) {
      const allow = new Set(only.map((c) => c.toUpperCase()));
      pool = pool.filter((c) => allow.has(c.code.toUpperCase()));
    }
    // Exclude Tanzania when the caller asks for it (non-citizen nationality).
    if (excludeTanzania) pool = pool.filter((c) => c.code !== "TZ");
    // Remove an explicit deny-list of ISO codes (e.g. the transit countries for
    // the international "Home Country" field).
    if (exclude && exclude.length > 0) {
      const deny = new Set(exclude.map((c) => c.toUpperCase()));
      pool = pool.filter((c) => !deny.has(c.code.toUpperCase()));
    }
    const base = !q
      ? pool
      : pool.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.dial.includes(q) ||
            c.code.toLowerCase() === q,
        );
    // The system is used mostly by Tanzanians — pin Tanzania to the top
    // (only when it's not excluded).
    if (!excludeTanzania) {
      const tz = base.filter((c) => c.code === "TZ");
      const rest = base.filter((c) => c.code !== "TZ");
      return [...tz, ...rest];
    }
    return base;
  }, [query, excludeTanzania, only, exclude]);

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-card shadow-lg">
      <div className="border-b border-line p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("fields.phSearchCountry")}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
      </div>
      <ul className="max-h-60 overflow-y-auto py-1">
        {filtered.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              onClick={() => {
                onSelect(c);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-base text-ink transition hover:bg-surface"
            >
              <span className="text-base leading-none">{flagEmoji(c.code)}</span>
              <span className="flex-1 truncate">{c.name}</span>
              {showDial && <span className="font-mono text-xs text-muted">{c.dial}</span>}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-center text-base text-muted">{t("fields.phNoMatch")}</li>
        )}
      </ul>
    </div>
  );
}
