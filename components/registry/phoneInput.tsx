"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, flagEmoji, TANZANIA, type Country } from "@/lib/countries";
import CountryMenu from "./countryMenu";
import { FieldError, useWizard } from "./field";
import { useI18n } from "@/app/i18n/localeProvider";
import { phoneLengthForDial } from "@/lib/phoneLengths";

function chunk(digits: string): string {
  return digits.match(/.{1,3}/g)?.join(" ") ?? "";
}

// Infer the country from a stored "+255 624 839 009" value (longest dial match).
function detectCountry(stored: string): Country {
  const digits = stored.replace(/\D/g, "");
  if (!digits) return TANZANIA;
  let best = TANZANIA;
  let bestLen = -1;
  for (const c of COUNTRIES) {
    const d = c.dial.replace(/\D/g, "");
    if (digits.startsWith(d) && d.length > bestLen) {
      best = c;
      bestLen = d.length;
    }
  }
  return best;
}

export default function PhoneInput({ name }: { name: string }) {
  const { data, set, errors, locked } = useWizard();
  const { t } = useI18n();
  const invalid = errors.includes(name);
  const isLocked = locked.includes(name);
  const stored = (data[name] as string) ?? "";

  const [country, setCountry] = useState<Country>(() => detectCountry(stored));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const dialDigits = country.dial.replace(/\D/g, "");
  const allDigits = stored.replace(/\D/g, "");
  const national = allDigits.startsWith(dialDigits)
    ? allDigits.slice(dialDigits.length)
    : allDigits;
  // Show the raw national digits in the input (not chunked) so editing a digit
  // mid-number doesn't reformat and jump the cursor to the end. The chunked,
  // pretty value is still what's stored (used by the preview / printable form).
  const display = national;

  function commit(dial: string, natDigits: string) {
    // Strip leading zeros — users often type local-format numbers (e.g.
    // "0624839009") but the stored value must be international (+255 624 839 009).
    // Length is validated per country from the phone-length guide; no fixed
    // leading-digit rule is imposed.
    let trimmed = natDigits.replace(/^0+/, "");
    // Cap the national number to the selected country's maximum length.
    trimmed = trimmed.slice(0, phoneLengthForDial(country.dial).max);
    // Store empty when no national digits so the field still reads as "required".
    set(name, trimmed ? `${dial} ${chunk(trimmed)}` : "");
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-lg border bg-card transition focus-within:ring-2 ${
          invalid
            ? "border-danger focus-within:border-danger focus-within:ring-danger/15"
            : "border-line focus-within:border-navy-500 focus-within:ring-navy-500/15"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={isLocked}
          className="flex shrink-0 items-center gap-1.5 border-r border-line bg-surface px-3 text-sm hover:bg-line/40 disabled:cursor-not-allowed"
        >
          <span className="text-base leading-none">{flagEmoji(country.code)}</span>
          <span className="font-mono text-navy-700">{country.dial}</span>
          <svg className="text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={display}
          onChange={(e) => commit(country.dial, e.target.value.replace(/\D/g, ""))}
          placeholder="624 839 009"
          aria-label={t("fields.phone")}
          disabled={isLocked}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 disabled:cursor-not-allowed disabled:text-muted"
        />
      </div>

      {open && (
        <CountryMenu
          onClose={() => setOpen(false)}
          showDial
          onSelect={(c) => {
            setCountry(c);
            commit(c.dial, national);
          }}
        />
      )}
      <FieldError name={name} />
    </div>
  );
}
