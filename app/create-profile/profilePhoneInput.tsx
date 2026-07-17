"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, flagEmoji, TANZANIA, type Country } from "@/lib/countries";
import { phoneLengthForDial } from "@/lib/phoneLengths";
import CountryMenu from "@/components/registry/countryMenu";
import { ChevronDown } from "lucide-react";

// Infer the country from a stored "+255786849280" value (longest dial match).
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

/**
 * Phone field with a country-code + flag picker. The user types the local
 * number directly; a leading 0 is trimmed and the dial code is prepended, so
 * "0786849280" is stored as "+255786849280".
 */
export default function ProfilePhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  ariaLabel,
  describedBy,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  ariaLabel?: string;
  describedBy?: string;
  placeholder?: string;
}) {
  // The country is DERIVED from the current value's dialing code rather than
  // frozen in state at mount. A value that arrives AFTER mount — e.g. the
  // profile dialog loading the number from the API — would otherwise keep the
  // mount-time default (Tanzania), leaving a foreign number's country code
  // stranded in the national digits. `picked` covers only the transient case
  // where the user chooses a country before typing any digits (value is "" then).
  const [picked, setPicked] = useState<Country | null>(null);
  const country = value ? detectCountry(value) : (picked ?? TANZANIA);
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
  const allDigits = value.replace(/\D/g, "");
  const national = allDigits.startsWith(dialDigits)
    ? allDigits.slice(dialDigits.length)
    : allDigits;

  function commit(dial: string, natDigits: string) {
    // Strip leading zeros — users type local-format numbers (e.g. "0786849280")
    // but the stored value must be international ("+255786849280"). Length is
    // validated per country from the phone-length guide; no leading-digit rule.
    let trimmed = natDigits.replace(/^0+/, "");
    const dialNumeric = dial.replace(/\D/g, "");
    const { max } = phoneLengthForDial(dial);
    // When the user pastes a full E.164 number (e.g. "+255738997834" becomes
    // "255738997834" after digit-only extraction), the dial prefix is already
    // included in natDigits. Strip it so the country code is not counted against
    // the national length cap and digits are not lost during truncation.
    if (dialNumeric && trimmed.length > max && trimmed.startsWith(dialNumeric)) {
      trimmed = trimmed.slice(dialNumeric.length);
    }
    trimmed = trimmed.slice(0, max);
    onChange(trimmed ? `${dial}${trimmed}` : "");
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-lg border bg-surface transition focus-within:ring-2 ${
          invalid
            ? "border-danger focus-within:border-danger focus-within:ring-danger/15"
            : "border-input-line focus-within:border-navy-500 focus-within:bg-card focus-within:ring-navy-500/15"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1.5 border-r border-input-line bg-card px-3 text-sm hover:bg-line/40"
          aria-label={country.name}
        >
          <span className="text-base leading-none">{flagEmoji(country.code)}</span>
          <span className="font-mono text-navy-700">{country.dial}</span>
          <ChevronDown className="text-muted" size={14} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => commit(country.dial, e.target.value.replace(/\D/g, ""))}
          onBlur={onBlur}
          placeholder={placeholder ?? "786 849 280"}
          aria-label={ariaLabel}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70"
        />
      </div>

      {open && (
        <CountryMenu
          onClose={() => setOpen(false)}
          showDial
          onSelect={(c) => {
            setPicked(c);
            // Changing the country code clears any typed number — the old
            // national digits rarely belong to the newly chosen country, so
            // forcing a fresh entry avoids storing a mismatched number.
            commit(c.dial, "");
          }}
        />
      )}
    </div>
  );
}
