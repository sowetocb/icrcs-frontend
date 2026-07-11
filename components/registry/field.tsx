"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/localeProvider";
import { fieldLabel } from "@/lib/registry/fieldLabels";
import DatePickerCalendar from "./datePickerCalendar";
import { displayToIso, isoToDisplay, todayIso } from "@/lib/dateFormat";
import { Calendar, ChevronDown } from "lucide-react";

type Value = string | boolean;

type WizardContextValue = {
  data: Record<string, Value>;
  set: (name: string, value: Value) => void;
  /** Like `set`, but does NOT mark the form as having unsaved changes. For
   * programmatic defaults/sync (effects), not user edits, so the "unsaved
   * changes" reminder isn't triggered when the user hasn't touched anything. */
  setQuiet: (name: string, value: Value) => void;
  /** Called when a field loses focus. Validates immediately (required check +
   * email format) so errors appear as the user tabs through the form, not only
   * on Save. Pass `currentValue` to avoid stale-closure issues when the value
   * changes in the same onBlur handler before React re-renders. */
  blur: (name: string, currentValue?: string) => void;
  errors: string[];
  /** Optional per-field error message, keyed by field name. Falls back to a
   * generic "required" message for any field listed in `errors` without one. */
  fieldErrors?: Record<string, string>;
  /** Field names that are read-only (e.g. the account holder's locked details). */
  locked: string[];
  /** True while registering the account holder (the first person). */
  isFirstPerson: boolean;
  /** Jump to a completed wizard step (used on the preview screen). */
  onGoToStep?: (step: number) => void;
  /** Raise the wizard's session-expired flow (blocking dialog → sign in). */
  onSessionExpired?: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  data,
  set,
  setQuiet,
  blur,
  errors,
  fieldErrors,
  locked,
  isFirstPerson,
  onGoToStep,
  onSessionExpired,
  children,
}: WizardContextValue & { children: React.ReactNode }) {
  return (
    <WizardContext.Provider
      value={{ data, set, setQuiet, blur, errors, fieldErrors, locked, isFirstPerson, onGoToStep, onSessionExpired }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}

/** Inline error message shown directly beneath an invalid field, so issues are
 * visible at the field itself (not only in an aggregated notice that may scroll
 * off-screen on small displays). Renders nothing when the field is valid. */
export function FieldError({ name }: { name: string }) {
  const { errors, fieldErrors } = useWizard();
  const { t } = useI18n();
  if (!errors.includes(name)) return null;
  // Prefer a backend/explicit message; otherwise name the field exactly
  // ("Last name is required.") instead of the generic "This field is required."
  const label = fieldLabel(name, t);
  const fallback =
    label && label !== t("flabel.fallback")
      ? t("fields.isRequired").replace("{field}", label)
      : t("fields.fieldRequired");
  const message = fieldErrors?.[name] || fallback;
  return (
    <p role="alert" data-field-error={name} className="mt-1 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

const lockedCls = "cursor-not-allowed bg-line/30 text-muted";

// Form controls keep the white `card` fill but use the stronger `input-line`
// outline (rather than the hairline `line` used for dividers) so an empty field
// is clearly visible — an accessibility aid for low-vision users.
const baseInput =
  "w-full rounded-lg bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:ring-2";
const okBorder = "border border-input-line focus:border-navy-500 focus:ring-navy-500/15";
const errBorder = "border border-danger focus:border-danger focus:ring-danger/15";
const inputCls = (invalid: boolean) =>
  `${baseInput} ${invalid ? errBorder : okBorder}`;

export function Field({
  label,
  children,
  className = "",
  required = false,
  optional = false,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  /** Append a red asterisk to mark the field as mandatory. */
  required?: boolean;
  /** Append a muted "(Optional)" / "(Si lazima)" tag. */
  optional?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-navy-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
          {optional && (
            <span className="ml-1 font-normal text-muted">({t("fields.optional")})</span>
          )}
        </label>
      )}
      {children}
    </div>
  );
}

export function TextInput({
  name,
  placeholder,
  type = "text",
  disabled = false,
  maxLength,
  numeric = false,
  lettersOnly = false,
  allowChars,
  min,
  max,
}: {
  name: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  /** Restrict input to digits only (e.g. NIDA), with a numeric keypad on mobile. */
  numeric?: boolean;
  /** Restrict input to letters and spaces only (strict text) — names/city. */
  lettersOnly?: boolean;
  /** A regex character-class body (e.g. "A-Za-z0-9 ") of the ONLY characters
   * allowed; anything outside it is stripped as the user types. */
  allowChars?: string;
  /** Numeric bounds (type="number"): the value is clamped to [min, max] on blur. */
  min?: number;
  max?: number;
}) {
  const { data, set, blur, errors, locked } = useWizard();
  const invalid = errors.includes(name);
  const isLocked = locked.includes(name) || disabled;
  const value = (data[name] as string) ?? "";
  // Numeric → digits only; letters-only → letters plus spaces, apostrophes and
  // hyphens (real names like "Mwakang'ata" or "Marry-Stella"), nothing else;
  // otherwise strip leading whitespace while typing (mid-word spaces are kept).
  const sanitize = (raw: string) =>
    numeric
      ? raw.replace(/\D/g, "")
      : lettersOnly
        ? raw.replace(/[^\p{L} '’-]/gu, "")
        : allowChars
          ? raw.replace(new RegExp(`[^${allowChars}]`, "gu"), "")
          : raw.replace(/^\s+/, "");
  // For a bounded numeric field, keep the typed value inside [min, max] live:
  // the upper bound is enforced immediately; the lower bound only once the entry
  // is full-width (so partial input like "1" isn't snapped up to "1900").
  const applyBounds = (s: string): string => {
    if (!numeric || s === "" || (min === undefined && max === undefined)) return s;
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    if (max !== undefined && n > max) return String(max);
    const fullWidth = maxLength ?? String(max ?? min ?? "").length;
    if (min !== undefined && s.length >= fullWidth && n < min) return String(min);
    return s;
  };
  return (
    <>
      <input
        type={type}
        data-field={name}
        value={value}
        maxLength={maxLength}
        min={min}
        max={max}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) => set(name, applyBounds(sanitize(e.target.value)))}
        // Re-sanitize on blur (clears any stale junk), then clamp a bounded
        // number into [min, max]. Finally run blur validation so required-field
        // and format errors appear as soon as the user leaves the input.
        onBlur={(e) => {
          let v = sanitize(e.target.value).trim();
          if (v !== "" && (min !== undefined || max !== undefined)) {
            const n = Number(v);
            v = Number.isFinite(n) ? String(Math.min(max ?? n, Math.max(min ?? n, n))) : "";
          }
          if (v !== value) set(name, v);
          blur(name, v);
        }}
        placeholder={placeholder}
        disabled={isLocked}
        className={`${inputCls(invalid)} ${isLocked ? lockedCls : ""}`}
      />
      <FieldError name={name} />
    </>
  );
}

export function DateInput({
  name,
  disableFuture = true,
  minDate,
  maxDate,
}: {
  name: string;
  /** Block dates after today (default for birth-date fields). */
  disableFuture?: boolean;
  minDate?: string;
  maxDate?: string;
}) {
  const { t } = useI18n();
  const { data, set, blur, errors, locked } = useWizard();
  const invalid = errors.includes(name);
  const isLocked = locked.includes(name);
  const iso = (data[name] as string) ?? "";
  const effectiveMax = maxDate ?? (disableFuture ? todayIso() : undefined);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display/enter dates as dd/mm/yyyy; store ISO (yyyy-mm-dd) for the API.
  const [text, setText] = useState(() => isoToDisplay(iso));
  const [lastIso, setLastIso] = useState(iso);
  if (iso !== lastIso) {
    setLastIso(iso);
    setText(isoToDisplay(iso));
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(out);
    set(name, displayToIso(out));
  }

  function selectFromCalendar(nextIso: string) {
    set(name, nextIso);
    setText(isoToDisplay(nextIso));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          data-field={name}
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={text}
          onChange={handleTextChange}
          onBlur={() => blur(name, iso)}
          disabled={isLocked}
          className={`${inputCls(invalid)} pr-10 ${text ? "text-ink" : "text-muted/60"} ${isLocked ? lockedCls : ""}`}
        />
        <button
          type="button"
          onClick={() => !isLocked && setOpen((o) => !o)}
          disabled={isLocked}
          aria-label={t("fields.openCalendar")}
          aria-expanded={open}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:bg-surface hover:text-navy-700 ${
            isLocked ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <Calendar size={18} aria-hidden="true" />
        </button>
      </div>

      {open && !isLocked && (
        <DatePickerCalendar
          value={iso}
          minDate={minDate}
          maxDate={effectiveMax}
          onSelect={selectFromCalendar}
          onClose={() => setOpen(false)}
        />
      )}
      <FieldError name={name} />
    </div>
  );
}

export function Select({
  name,
  placeholder,
  options,
  disabled = false,
  onValueChange,
}: {
  name: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const { data, set, errors, locked } = useWizard();
  const invalid = errors.includes(name);
  const isLocked = locked.includes(name) || disabled;
  const value = (data[name] as string) ?? "";
  return (
    <>
      <div className="relative">
        <select
          data-field={name}
          value={value}
          onChange={(e) => {
            set(name, e.target.value);
            onValueChange?.(e.target.value);
          }}
          aria-label={placeholder}
          disabled={isLocked}
          className={`${inputCls(invalid)} appearance-none pr-9 ${value ? "text-ink" : "text-muted/60"} ${isLocked ? lockedCls : ""}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          size={16}
          aria-hidden="true"
        />
      </div>
      <FieldError name={name} />
    </>
  );
}

export function FileInput({ name }: { name: string }) {
  const { data, set, errors } = useWizard();
  const { t } = useI18n();
  const invalid = errors.includes(name);
  const fileName = (data[name] as string) || "";
  return (
    <label
      className={`flex cursor-pointer items-center overflow-hidden rounded-lg border bg-card text-sm ${
        invalid ? "border-danger" : "border-input-line"
      }`}
    >
      <span className="shrink-0 border-r border-input-line bg-surface px-4 py-2.5 font-medium text-navy-700">
        {t("fields.chooseFile")}
      </span>
      <span className="truncate px-3 text-muted">
        {fileName || t("fields.noFile")}
      </span>
      <input
        type="file"
        className="sr-only"
        onChange={(e) => set(name, e.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}
