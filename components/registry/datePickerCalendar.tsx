"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n/localeProvider";
import { localeTag, parseIso, toIso } from "@/lib/dateFormat";

const WEEKDAY_COUNT = 7;

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first column index (0 = Mon … 6 = Sun). */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

type Props = {
  value: string;
  maxDate?: string;
  minDate?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
};

export default function DatePickerCalendar({
  value,
  maxDate,
  minDate,
  onSelect,
  onClose,
}: Props) {
  const { t, locale } = useI18n();
  const tag = localeTag(locale);
  const selected = parseIso(value);
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const monthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(tag, { month: "long" });
    return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
  }, [tag]);

  const max = maxDate ? parseIso(maxDate) : null;
  const min = minDate ? parseIso(minDate) : null;

  // Year choices for the dropdown, newest first (DOB entry usually scrolls back).
  // Bound by min/max when given; otherwise span a sensible ~120-year window.
  const years = useMemo(() => {
    const endYear = max ? max.getFullYear() : new Date().getFullYear();
    const startYear = min ? min.getFullYear() : endYear - 120;
    const list: number[] = [];
    for (let y = endYear; y >= startYear; y--) list.push(y);
    return list;
  }, [min, max]);

  // Keep the dropdown valid if the parsed/initial year falls outside the range.
  const yearOptions = years.includes(viewYear) ? years : [viewYear, ...years];

  function isDisabled(y: number, m: number, d: number): boolean {
    const dt = new Date(y, m, d);
    if (max && dt.getTime() > max.getTime()) return true;
    if (min && dt.getTime() < min.getTime()) return true;
    return false;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const leading = weekdayIndex(startOfMonth(viewYear, viewMonth));
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % WEEKDAY_COUNT !== 0) cells.push(null);

  return (
    <div
      className="absolute left-0 top-full z-40 mt-1 w-[min(100%,18rem)] rounded-lg border border-line bg-card p-3 shadow-lg"
      role="dialog"
      aria-label={t("fields.openCalendar")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-md p-1.5 text-navy-700 transition hover:bg-surface"
          aria-label={t("fields.prevMonth")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            aria-label={t("fields.selectMonth")}
            className="rounded-md border border-line bg-card px-1.5 py-1 text-sm font-semibold text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
          >
            {monthLabels.map((label, m) => (
              <option key={label} value={m}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            aria-label={t("fields.selectYear")}
            className="rounded-md border border-line bg-card px-1.5 py-1 text-sm font-semibold text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-md p-1.5 text-navy-700 transition hover:bg-surface"
          aria-label={t("fields.nextMonth")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <span key={`empty-${idx}`} aria-hidden="true" />;
          }
          const iso = toIso(new Date(viewYear, viewMonth, day));
          const disabled = isDisabled(viewYear, viewMonth, day);
          const isSelected = value === iso;
          const isToday = iso === toIso(new Date());

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect(iso);
                onClose();
              }}
              className={`rounded-md py-1.5 text-sm transition ${
                disabled
                  ? "cursor-not-allowed text-muted/40"
                  : isSelected
                    ? "bg-navy-700 font-semibold text-white"
                    : isToday
                      ? "font-semibold text-gold-700 hover:bg-surface"
                      : "text-ink hover:bg-surface"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
