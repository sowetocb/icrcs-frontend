"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/modal";
import { useI18n } from "../i18n/localeProvider";
import { loadProfile } from "@/lib/auth/profile";

type IconProps = { className?: string };

function FileIcon({ className }: IconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function CameraIcon({ className }: IconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function MailIcon({ className }: IconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export default function DashboardHome() {
  const { t } = useI18n();
  const [showRequirements, setShowRequirements] = useState(false);
  const [userName, setUserName] = useState("");

  // Read the cached profile (stored once after login) — client-only to stay
  // hydration-safe. We never fetch /v1/profile/me here.
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserName([p.firstName, p.lastName].filter(Boolean).join(" "));
    }
  }, []);

  const checklist = [
    { key: "photo", Icon: CameraIcon },
    { key: "birth", Icon: FileIcon },
    { key: "parent", Icon: UsersIcon },
    { key: "letter", Icon: MailIcon },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-700 p-8 text-white shadow-[0_8px_40px_-12px_rgba(13,31,51,0.4)] sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="mt-5 font-display text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
              {t("dashboard.title")}
              <span className="text-gold">.</span>
            </h1>

            <p className="mt-5 max-w-xl leading-relaxed text-navy-3 00">
              {t("dashboard.welcome").replace("{name}", userName)}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/registry"
                className="rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-700"
              >
                {t("dashboard.startRegistration")}
              </Link>
              <button
                type="button"
                onClick={() => setShowRequirements(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 transition hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                {t("dashboard.viewRequirements")}
              </button>
            </div>
          </div>

         
        </div>
      </section>

      {/* Preparation checklist */}
      <section
        id="checklist"
        className="scroll-mt-24 rounded-2xl border border-line bg-card/60 p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy-700">
              {t("dashboard.checklistTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t("dashboard.checklistSubtitle")}
            </p>
          </div>
          <a
            href="/documents/registration-guide.pdf"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("dashboard.downloadGuide")}
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklist.map(({ key, Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-card p-5 transition hover:border-gold/40 hover:shadow-sm"
            >
              <span className="text-gold-700">
                <Icon />
              </span>
              <h3 className="mt-4 text-base font-bold text-navy-700">
                {t(`dashboard.${key}Title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t(`dashboard.${key}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements dialog */}
      <Modal
        open={showRequirements}
        onClose={() => setShowRequirements(false)}
        title={t("dashboard.checklistTitle")}
        closeLabel={t("legal.close")}
      >
        <p className="mb-4 text-sm text-muted">{t("dashboard.checklistSubtitle")}</p>
        <ul className="space-y-4">
          {checklist.map(({ key, Icon }) => (
            <li key={key} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-gold-700">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy-700">
                  {t(`dashboard.${key}Title`)}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {t(`dashboard.${key}Desc`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {/* <a
          href="/documents/registration-guide.pdf"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t("dashboard.downloadGuide")}
        </a> */}
      </Modal>
    </div>
  );
}
