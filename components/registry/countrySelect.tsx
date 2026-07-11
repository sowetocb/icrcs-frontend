"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import CountryMenu from "./countryMenu";
import { FieldError, useWizard } from "./field";
import { ChevronDown } from "lucide-react";

export default function CountrySelect({
  name,
  placeholder,
  disabled = false,
  excludeTanzania = false,
}: {
  name: string;
  placeholder: string;
  disabled?: boolean;
  /** When true, Tanzania is excluded from the dropdown list. */
  excludeTanzania?: boolean;
}) {
  const { data, set, errors, locked } = useWizard();
  const value = (data[name] as string) ?? "";
  const invalid = errors.includes(name);
  const isDisabled = disabled || locked.includes(name);
  const selected = COUNTRIES.find((c) => c.name === value);

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isDisabled}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/15"
            : "border-input-line focus:border-navy-500 focus:ring-navy-500/15"
        } ${isDisabled ? "cursor-not-allowed bg-line/30 text-muted" : ""}`}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate text-ink">
            <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted/60">{placeholder}</span>
        )}
        <ChevronDown className="shrink-0 text-muted" size={16} aria-hidden="true" />
      </button>

      {open && (
        <CountryMenu
          onClose={() => setOpen(false)}
          onSelect={(c) => set(name, c.name)}
          excludeTanzania={excludeTanzania}
        />
      )}
      <FieldError name={name} />
    </div>
  );
}
