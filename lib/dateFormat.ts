/** yyyy-mm-dd → dd/mm/yyyy (display). */
export function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** dd/mm/yyyy → yyyy-mm-dd (storage); "" when incomplete/invalid. */
export function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const y = Number(yyyy);
  const mo = Number(mm);
  const d = Number(dd);
  if (!isValidDate(y, mo, d)) return "";
  return `${yyyy}-${mm}-${dd}`;
}

export function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidDate(y, mo, d)) return null;
  return new Date(y, mo - 1, d);
}

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

function isValidDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function localeTag(locale: string): string {
  return locale === "sw" ? "sw-TZ" : "en-GB";
}
