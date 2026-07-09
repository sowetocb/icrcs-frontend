"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, flagEmoji, TANZANIA, type Country } from "@/lib/countries";
import CountryMenu from "./countryMenu";
import { FieldError, useWizard } from "./field";
import { ChevronDown } from "lucide-react";
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
  const { data, set, blur, errors, locked } = useWizard();
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
    const dialNumeric = dial.replace(/\D/g, "");
    const { max } = phoneLengthForDial(dial);

    // A pasted full E.164 number (e.g. "+255738997834" → "255738997834" after
    // digit-only extraction) carries the dial prefix inside natDigits. Only drop
    // that prefix for a paste into an EMPTY field, and only when the length is
    // exactly dial + national. A TYPED national number is allowed to begin with
    // the dial digits (e.g. 255 873 964), so the prefix must never be stripped
    // while the user is editing — doing so silently ate their leading "255".
    if (
      dialNumeric &&
      national === "" &&
      trimmed.length === dialNumeric.length + max &&
      trimmed.startsWith(dialNumeric)
    ) {
      trimmed = trimmed.slice(dialNumeric.length);
    }

    // Hard cap: once `max` national digits are entered, reject any further digit
    // (the user must delete one first) instead of truncating — truncation is what
    // made typed digits vanish from the middle/end of the number.
    if (trimmed.length > max) return;

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
          <ChevronDown className="text-muted" size={14} aria-hidden="true" />
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={display}
          onChange={(e) => commit(country.dial, e.target.value.replace(/\D/g, ""))}
          onBlur={() => blur(name, stored)}
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
            // Changing the country code clears any typed number — the old
            // national digits rarely belong to the newly chosen country, so
            // forcing a fresh entry avoids storing a mismatched number.
            commit(c.dial, "");
          }}
        />
      )}
      <FieldError name={name} />
    </div>
  );
}
