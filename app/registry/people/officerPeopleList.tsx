"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n/localeProvider";
import { loadOfficer } from "@/lib/auth/officerSession";
import { toProxyUrl } from "@/lib/auth/profile";
import {
  getDeclaredMine,
  getDeclaredAll,
  getDeclaration,
  downloadOfficerDeclarationPdf,
  type DeclaredRegistration,
  type DeclaredPage,
  type DeclarationReview,
} from "@/lib/api/officer";
import { getErrorMessage } from "@/lib/api/client";
import {
  Search,
  RotateCcw,
  AlertCircle,
  FileText,
  LoaderCircle,
  UserCheck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

// ── Status styling ──────────────────────────────────────────────────────────

// Only the backend's real registration statuses. No fabricated values.
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-gold/15 text-gold-700",
  PENDING_ENROLLMENT: "bg-info/15 text-info",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

// ── Tabs ────────────────────────────────────────────────────────────────────

type Tab = "mine" | "station" | "search";

function TabBar({
  active,
  onChange,
  t,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  t: (key: string) => string;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "mine", label: t("officer.tabMine") },
    { key: "station", label: t("officer.tabStation") },
    { key: "search", label: t("officer.tabSearch") },
  ];
  return (
    <div className="flex border-b border-line">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`relative px-5 py-3 text-sm font-semibold transition ${
            active === key
              ? "text-navy-700"
              : "text-muted hover:text-navy-500"
          }`}
        >
          {label}
          {active === key && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t bg-gold" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Paginated table ─────────────────────────────────────────────────────────

function DeclaredTable({
  items,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onView,
  showOfficer,
  t,
}: {
  items: DeclaredRegistration[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (p: number) => void;
  onView: (subjectId: string) => void;
  showOfficer?: boolean;
  t: (key: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      {totalElements > 0 && (
        <p className="mb-3 text-xs font-medium text-muted">
          {t("officer.totalRegistrations").replace("{n}", String(totalElements))}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-navy-50/60">
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colName")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colType")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colNationality")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colStatus")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colDate")}</th>
                {showOfficer && (
                  <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colOfficer")}</th>
                )}
                <th className="px-5 py-3.5 text-right font-semibold text-navy-700">{t("officer.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((r) => (
                <tr key={r.subjectId} className="transition hover:bg-surface/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <UserCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-navy-700">{r.fullName || "—"}</span>
                        <span className="block truncate text-xs text-muted">{r.subjectId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{r.registrationType?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-5 py-3.5 text-muted">{r.nationality || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLE[r.status.toUpperCase()] ?? STATUS_STYLE.PENDING
                      }`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </td>
                  {showOfficer && (
                    <td className="px-5 py-3.5 text-xs text-muted">{r.officerName || "—"}</td>
                  )}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onView(r.subjectId)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {t("officer.viewDetails")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-surface disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span className="text-xs font-medium text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-surface disabled:opacity-40"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

// ── Detail view (inline page, not a modal) ──────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const S = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const humanize = (k: string) =>
  k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/^./, (c) => c.toUpperCase());
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isObj) : [];

/** Resolve a backend file URL for viewing through the same-origin proxy. The
 * backend's GET /v1/files/view is PUBLIC (no auth needed), so the plain proxied
 * path works for officers too — there is NO /v1/officer/files/view endpoint. */
function officerFileUrl(raw: string): string | null {
  return toProxyUrl(raw);
}

/** Flatten an object's primitive fields into label/value rows, recursing ONE
 * level into nested objects (e.g. an address `location`) so their fields show
 * too. Arrays and deeper nesting are handled by dedicated sections. */
function flattenPairs(o: Record<string, unknown>): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === "") continue;
    if (isObj(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (v2 === null || v2 === undefined || v2 === "" || typeof v2 === "object") continue;
        rows.push({ label: humanize(k2), value: S(v2) });
      }
    } else if (!Array.isArray(v)) {
      rows.push({ label: humanize(k), value: S(v) });
    }
  }
  return rows;
}

function KeyGrid({ obj }: { obj: Record<string, unknown> }) {
  const rows = flattenPairs(obj);
  if (rows.length === 0) return null;
  return (
    // Denser grid: up to 3 columns on wide screens and tighter row padding, so
    // the review fits far more per screen and scrolls much less.
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r, i) => (
        <div key={i} className="bg-card px-4 py-2.5">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{r.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-navy-700">{r.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h3 className="mb-3 font-display text-base font-bold text-navy-700">{title}</h3>
      {children}
    </div>
  );
}

/** An array of people/records rendered as labelled cards (parents, contacts, …). */
function CardsSection({
  title,
  items,
  labelFor,
}: {
  title: string;
  items: Record<string, unknown>[];
  labelFor: (item: Record<string, unknown>, i: number) => string;
}) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <div className="space-y-5">
        {items.map((item, i) => (
          <div key={i}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gold-700">
              {labelFor(item, i)}
            </p>
            <KeyGrid obj={item} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function DetailView({
  subjectId,
  onBack,
  t,
}: {
  subjectId: string;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const [data, setData] = useState<DeclarationReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadOfficerDeclarationPdf(subjectId, `Registration Form ${subjectId}`);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const review = await getDeclaration(subjectId);
        if (!cancelled) setData(review);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, t("officer.declaredError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subjectId, t]);

  const d = data ?? {};
  const personal = isObj(d.personalDetails) ? d.personalDetails : {};
  // Drop duplicate identification documents (same type + number appearing more
  // than once), keeping the first of each.
  const documents = (() => {
    const seen = new Set<string>();
    return arr(d.documents).filter((doc) => {
      const key = `${S(doc.documentType).toUpperCase()}|${S(doc.documentNumber)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const attachments = arr(d.attachments);
  const spouses = arr(d.spouses);
  const relatives = arr(d.relatives);
  const children = arr(d.children);

  // Group the declaration into horizontal tabs (mirrors the Preview &
  // Declaration step). Only tabs that actually carry data are shown.
  const tabs: { key: string; label: string; content: ReactNode }[] = [
    {
      key: "personal",
      label: "Personal",
      content: (
        <div className="space-y-5">
          <Section title="Personal Details">
            <KeyGrid
              obj={{ ...personal, citizenshipType: d.citizenshipType, registrationType: d.registrationType }}
            />
          </Section>
          {isObj(d.birthDetails) && (
            <Section title="Birth Details">
              <KeyGrid obj={d.birthDetails} />
            </Section>
          )}
          {isObj(d.physicalDetail) && (
            <Section title="Physical Characteristics">
              <KeyGrid obj={d.physicalDetail} />
            </Section>
          )}
        </div>
      ),
    },
  ];

  if (arr(d.addresses).length > 0) {
    tabs.push({
      key: "address",
      label: "Address",
      content: (
        <CardsSection
          title="Address"
          items={arr(d.addresses)}
          labelFor={(a) => (S(a.addressType) ? `${S(a.addressType)} Address` : "Address")}
        />
      ),
    });
  }

  if (arr(d.parents).length > 0) {
    tabs.push({
      key: "parents",
      label: "Parents",
      content: (
        <CardsSection
          title="Parents"
          items={arr(d.parents)}
          labelFor={(p, i) => S(p.parentType) || `Parent ${i + 1}`}
        />
      ),
    });
  }

  if (arr(d.educationList).length > 0 || isObj(d.employment)) {
    tabs.push({
      key: "education",
      label: "Education & Work",
      content: (
        <div className="space-y-5">
          <CardsSection
            title="Education"
            items={arr(d.educationList)}
            labelFor={(e, i) => S(e.schoolName) || S(e.educationLevel) || `School ${i + 1}`}
          />
          {isObj(d.employment) && (
            <Section title="Employment">
              <KeyGrid obj={d.employment} />
            </Section>
          )}
        </div>
      ),
    });
  }

  if (arr(d.emergencyContacts).length > 0) {
    tabs.push({
      key: "contacts",
      label: "Emergency",
      content: (
        <CardsSection
          title="Emergency Contacts"
          items={arr(d.emergencyContacts)}
          labelFor={(c, i) => [S(c.firstName), S(c.lastName)].filter(Boolean).join(" ") || `Contact ${i + 1}`}
        />
      ),
    });
  }

  if (spouses.length > 0 || relatives.length > 0 || children.length > 0) {
    tabs.push({
      key: "family",
      label: "Family",
      content: (
        <div className="space-y-5">
          <CardsSection
            title="Spouse(s)"
            items={spouses}
            labelFor={(s, i) => [S(s.firstName), S(s.lastName)].filter(Boolean).join(" ") || `Spouse ${i + 1}`}
          />
          <CardsSection
            title="Relatives"
            items={relatives}
            labelFor={(r, i) => [S(r.firstName), S(r.lastName)].filter(Boolean).join(" ") || `Relative ${i + 1}`}
          />
          <CardsSection
            title="Children"
            items={children}
            labelFor={(c, i) => [S(c.firstName), S(c.lastName)].filter(Boolean).join(" ") || `Child ${i + 1}`}
          />
        </div>
      ),
    });
  }

  if (documents.length > 0 || attachments.length > 0 || isObj(d.travelHistory)) {
    tabs.push({
      key: "documents",
      label: "Documents",
      content: (
        <div className="space-y-5">
          {documents.length > 0 && (
            <Section title="Identification Documents">
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-3"
                  >
                    <span className="text-sm font-medium text-navy-700">{S(doc.documentType) || "—"}</span>
                    <span className="font-mono text-sm text-muted">{S(doc.documentNumber) || "—"}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {attachments.length > 0 && (
            <Section title="Attachments">
              <div className="space-y-3">
                {attachments.map((a, i) => {
                  const url = officerFileUrl(S(a.fileUrl));
                  const isImg = S(a.mimeType).startsWith("image/");
                  return (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-line p-3">
                      {isImg && url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={S(a.attachmentType)} className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-navy-50 text-navy-500">
                          <FileText size={22} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-navy-700">{S(a.attachmentType) || "Attachment"}</p>
                        <p className="truncate text-xs text-muted">{S(a.mimeType)}</p>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold/20"
                        >
                          {t("officer.viewDetails")}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          {isObj(d.travelHistory) && (
            <Section title="Travel History">
              <KeyGrid obj={d.travelHistory} />
            </Section>
          )}
        </div>
      ),
    });
  }

  // Fall back to the first tab when the selected one has no data this record.
  const active = tabs.find((tb) => tb.key === activeTab) ?? tabs[0];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 transition hover:text-gold-700"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t("officer.detailBack")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-navy-700">{t("officer.detailTitle")}</h2>
          <p className="mt-1 text-xs font-medium text-muted">
            {t("officer.detailSubjectId")}: <span className="font-mono text-navy-500">{subjectId}</span>
          </p>
        </div>
        {!loading && !error && data && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {t("officer.downloadPdf")}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-navy-500" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" />
          <p className="mt-3 text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-5">
          {/* Horizontal tabs (left → right) — one section group shown at a time,
              like the Preview & Declaration step. */}
          <div className="flex w-full overflow-x-auto border-b border-line">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setActiveTab(tb.key)}
                className={`flex-1 whitespace-nowrap border-b-2 px-3 py-3 text-center text-sm font-semibold transition ${
                  active?.key === tb.key
                    ? "border-navy-700 text-navy-700"
                    : "border-transparent text-muted hover:text-navy-700"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <div>{active?.content}</div>
        </div>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
        <FileText className="h-8 w-8 text-navy-400" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-lg font-bold text-navy-700">{message}</h3>
      <p className="mt-1.5 max-w-md text-center text-sm text-muted">{hint}</p>
    </div>
  );
}

// ── Search tab ──────────────────────────────────────────────────────────────

function SearchTab({
  onView,
  t,
}: {
  onView: (subjectId: string) => void;
  t: (key: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<DeclarationReview | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError("");
    setResult(null);
    setSearched(true);
    try {
      const review = await getDeclaration(trimmed);
      setResult(review);
    } catch (err) {
      setError(getErrorMessage(err, t("officer.searchEmpty")));
    } finally {
      setSearching(false);
    }
  }

  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t("officer.searchHint")}</p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("officer.searchAllPlaceholder")}
            className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-navy-700 outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-50"
        >
          {searching ? (
            <>
              <LoaderCircle size={14} className="animate-spin" />
              {t("officer.searching")}
            </>
          ) : (
            t("officer.searchBtn")
          )}
        </button>
      </form>

      {!searching && searched && error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" />
          <p className="mt-3 text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      {!searching && searched && !error && result && (
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-navy-50/60">
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colName")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colType")}</th>
                <th className="px-5 py-3.5 font-semibold text-navy-700">{t("officer.colStatus")}</th>
                <th className="px-5 py-3.5 text-right font-semibold text-navy-700">{t("officer.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="transition hover:bg-surface/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                      <UserCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-navy-700">
                        {str(result.fullName || result.full_name || result.name) || "—"}
                      </span>
                      <span className="block truncate text-xs text-muted">{query.trim()}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted">
                  {str(result.registrationType || result.registration_type)?.replace(/_/g, " ") || "—"}
                </td>
                <td className="px-5 py-3.5">
                  {str(result.status) ? (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLE[str(result.status).toUpperCase()] ?? "bg-navy-500/15 text-navy-700"
                      }`}
                    >
                      {statusLabel(str(result.status))}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onView(query.trim())}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {t("officer.viewDetails")}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function OfficerPeopleList() {
  const { t } = useI18n();
  const officer = loadOfficer();

  const [tab, setTab] = useState<Tab>("mine");

  // Paginated data for mine / station tabs
  const [minePage, setMinePage] = useState<DeclaredPage | null>(null);
  const [stationPage, setStationPage] = useState<DeclaredPage | null>(null);
  const [minePageNum, setMinePageNum] = useState(0);
  const [stationPageNum, setStationPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detail view (replaces the list inline, not a modal)
  const [detailSubjectId, setDetailSubjectId] = useState<string | null>(null);

  // Search filter for mine/station lists
  const [listSearch, setListSearch] = useState("");

  const fetchMine = useCallback(async (page = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await getDeclaredMine({ page });
      setMinePage(data);
      setMinePageNum(data.page);
    } catch (err) {
      setError(getErrorMessage(err, t("officer.declaredError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchStation = useCallback(async (page = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await getDeclaredAll({ page });
      setStationPage(data);
      setStationPageNum(data.page);
    } catch (err) {
      setError(getErrorMessage(err, t("officer.declaredError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Fetch on tab change
  useEffect(() => {
    if (tab === "mine" && !minePage) fetchMine();
    if (tab === "station" && !stationPage) fetchStation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Initial fetch
  useEffect(() => {
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleView(subjectId: string) {
    setDetailSubjectId(subjectId);
  }

  // Local search filter
  function filterItems(items: DeclaredRegistration[]): DeclaredRegistration[] {
    if (!listSearch.trim()) return items;
    const q = listSearch.trim().toLowerCase();
    return items.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.subjectId.toLowerCase().includes(q) ||
        r.registrationType.toLowerCase().includes(q) ||
        r.nationality.toLowerCase().includes(q),
    );
  }

  // If viewing details, render the detail page
  if (detailSubjectId) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <DetailView subjectId={detailSubjectId} onBack={() => setDetailSubjectId(null)} t={t} />
      </div>
    );
  }

  const activePage = tab === "mine" ? minePage : tab === "station" ? stationPage : null;
  const activeItems = activePage ? filterItems(activePage.items) : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {officer?.fullName && (
            <p className="text-sm font-medium text-gold-700">
              {t("officer.welcome").replace("{name}", officer.fullName)}
            </p>
          )}
          <h1 className="font-display text-2xl font-black tracking-tight text-navy-700 sm:text-3xl">
            {t("officer.declaredTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("officer.declaredSubtitle")}
            {officer?.stationName && (
              <span className="ml-2 inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                {t("officer.station").replace("{station}", officer.stationName)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <TabBar active={tab} onChange={(t) => { setTab(t); setListSearch(""); }} t={t} />

      {/* Tab content */}
      <div className="min-h-[300px]">
        {/* Mine & Station tabs */}
        {(tab === "mine" || tab === "station") && (
          <>
            {/* Search bar for filtering loaded items */}
            {!loading && !error && activePage && activePage.items.length > 0 && (
              <div className="relative mb-6">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={t("officer.searchPlaceholder")}
                  className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-navy-700 outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <LoaderCircle className="h-8 w-8 animate-spin text-navy-500" />
                <p className="mt-4 text-sm text-muted">{t("officer.declaredLoading")}</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger/5 py-16">
                <AlertCircle className="h-10 w-10 text-danger" />
                <p className="mt-4 font-medium text-danger">{error}</p>
                <button
                  type="button"
                  onClick={() => tab === "mine" ? fetchMine(minePageNum) : fetchStation(stationPageNum)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-surface"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  {t("officer.declaredRetry")}
                </button>
              </div>
            )}

            {!loading && !error && activePage && activePage.items.length === 0 && (
              <EmptyState
                message={tab === "mine" ? t("officer.declaredEmpty") : t("officer.stationEmpty")}
                hint={tab === "mine" ? t("officer.declaredEmptyHint") : t("officer.stationEmptyHint")}
              />
            )}

            {!loading && !error && activeItems.length > 0 && activePage && (
              <DeclaredTable
                items={activeItems}
                page={tab === "mine" ? minePageNum : stationPageNum}
                totalPages={activePage.totalPages}
                totalElements={activePage.totalElements}
                onPageChange={(p) => {
                  if (tab === "mine") { setMinePageNum(p); setMinePage(null); fetchMine(p); }
                  else { setStationPageNum(p); setStationPage(null); fetchStation(p); }
                }}
                onView={handleView}
                showOfficer={tab === "station"}
                t={t}
              />
            )}

            {/* Filtered to zero but there ARE items */}
            {!loading && !error && activePage && activePage.items.length > 0 && activeItems.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">{t("people.noResults")}</p>
            )}
          </>
        )}

        {/* Search All tab */}
        {tab === "search" && (
          <SearchTab onView={handleView} t={t} />
        )}
      </div>
    </div>
  );
}
