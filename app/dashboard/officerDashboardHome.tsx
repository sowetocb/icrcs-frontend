"use client";

import Link from "next/link";
import { useI18n } from "../i18n/localeProvider";
import { loadOfficer } from "@/lib/auth/officerSession";
import { ShieldCheck, Users, Lock, Gavel, ArrowRight, Download } from "lucide-react";

// Officer landing dashboard — shown after a government officer signs in (instead
// of the citizen self-registration home). A welcome hero plus a "Quick Access"
// grid of the officer's core duties, and a CTA into the migrant registry.
const DUTIES = [
  { key: "procedures", Icon: ShieldCheck },
  { key: "accuracy", Icon: Users },
  { key: "data", Icon: Lock },
  { key: "laws", Icon: Gavel },
] as const;

export default function OfficerDashboardHome() {
  const { t } = useI18n();
  const officer = loadOfficer();

  // Build a short display name: first + last if fullName has ≥ 3 parts,
  // otherwise use whatever is available.
  const displayName = (() => {
    const raw = officer?.fullName || "";
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
    return raw || officer?.username || "";
  })();

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-700 p-6 text-white shadow-[0_8px_40px_-12px_rgba(13,31,51,0.4)] sm:p-7">
        <h1 className="font-display text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl">
          {t("officerDash.title").replace("{name}", displayName)}
          <span className="text-gold">.</span>
        </h1>

        <div className="mt-3 space-y-2 leading-relaxed text-navy-300">
          {t("officerDash.welcome")
            .split("\n")
            .filter((para) => para.trim().length > 0)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/registry"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-700"
          >
            {t("officerDash.cta")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a
            href="/documents/registration-guide.pdf"
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-700"
          >
            <Download size={16} aria-hidden="true" />
            {t("officerDash.downloadGuide")}
          </a>
        </div>
      </section>

      {/* Quick access — the officer's core duties */}
      <section className="rounded-2xl border border-line bg-card/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-700">
          {t("officerDash.quickAccess")}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DUTIES.map(({ key, Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-card p-4 transition hover:border-gold/40 hover:shadow-sm"
            >
              <span className="text-gold-700">
                <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-bold text-navy-700">
                {t(`officerDash.${key}Title`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {t(`officerDash.${key}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
