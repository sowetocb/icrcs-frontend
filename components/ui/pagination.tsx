"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export type PaginationProps = {
  /** Current page (0-indexed). */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of items across all pages. */
  totalItems: number;
  /** Items currently displayed per page. */
  pageSize: number;
  /** Available page-size options. Defaults to [5, 10, 15, 20]. */
  pageSizeOptions?: number[];
  /** Called when the user navigates to a different page. */
  onPageChange: (page: number) => void;
  /** Called when the user changes the page size. */
  onPageSizeChange: (size: number) => void;
  /** i18n translation helper. */
  t: (key: string) => string;
};

/**
 * Reusable pagination bar with rows-per-page selector, First/Prev/Next/Last
 * buttons, page indicator, and a "Showing x to y of z" summary.
 *
 * Follows the reference design from the user's provided screenshot: a
 * left-aligned "Rows: <select>  Showing X to Y of Z" and right-aligned
 * navigation buttons ("First  Prev  1/N  Next  Last").
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 15, 20],
  onPageChange,
  onPageSizeChange,
  t,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card px-4 py-3">
      {/* Left: rows-per-page + summary */}
      <div className="flex items-center gap-4 text-sm text-muted">
        <label className="flex items-center gap-2">
          <span className="font-medium text-navy-700">{t("pagination.rows")}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-2 py-1 text-sm font-semibold text-navy-700 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/30"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden sm:inline">
          {t("pagination.showing")
            .replace("{start}", String(start))
            .replace("{end}", String(end))
            .replace("{total}", String(totalItems))}
        </span>
      </div>

      {/* Right: navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
          className="inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          title={t("pagination.first")}
        >
          <ChevronsLeft size={14} aria-hidden="true" />
          <span className="ml-1 hidden sm:inline">{t("pagination.first")}</span>
        </button>
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          title={t("pagination.prev")}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          <span className="ml-1 hidden sm:inline">{t("pagination.prev")}</span>
        </button>

        <span className="mx-2 inline-flex items-center rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-bold text-white tabular-nums">
          {page + 1}/{totalPages || 1}
        </span>

        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          title={t("pagination.next")}
        >
          <span className="mr-1 hidden sm:inline">{t("pagination.next")}</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          className="inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          title={t("pagination.last")}
        >
          <span className="mr-1 hidden sm:inline">{t("pagination.last")}</span>
          <ChevronsRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
