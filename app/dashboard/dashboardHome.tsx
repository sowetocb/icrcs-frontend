"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/modal";
import { useI18n } from "../i18n/localeProvider";
import { loadProfile } from "@/lib/auth/profile";
import { isOfficer, loadOfficer } from "@/lib/auth/officerSession";
import { FileText, Camera, Users, Mail, Download } from "lucide-react";

type IconProps = { className?: string };

function FileIcon({ className }: IconProps) {
  return <FileText className={className} size={28} strokeWidth={1.8} aria-hidden="true" />;
}
function CameraIcon({ className }: IconProps) {
  return <Camera className={className} size={28} strokeWidth={1.8} aria-hidden="true" />;
}
function UsersIcon({ className }: IconProps) {
  return <Users className={className} size={28} strokeWidth={1.8} aria-hidden="true" />;
}
function MailIcon({ className }: IconProps) {
  return <Mail className={className} size={28} strokeWidth={1.8} aria-hidden="true" />;
}

export default function DashboardHome() {
  const { t } = useI18n();
  const [showRequirements, setShowRequirements] = useState(false);
  const [userName, setUserName] = useState("");

  // Read the cached profile (stored once after login) — client-only to stay
  // hydration-safe. Officers use their officer identity, not the citizen profile.
  useEffect(() => {
    if (isOfficer()) {
      const o = loadOfficer();
      if (o) {
        const parts = (o.fullName || "").trim().split(/\s+/).filter(Boolean);
        const short = parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : (o.fullName || o.username || "");
        setUserName(short);
      }
      return;
    }
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
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-700 p-6 text-white shadow-[0_8px_40px_-12px_rgba(13,31,51,0.4)] sm:p-7">
        <h1 className="font-display text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl">
          {t("dashboard.title")}
          <span className="text-gold">.</span>
        </h1>

        {/* Full-width text so it fills the card horizontally and stays short. */}
        <div className="mt-3 space-y-2 leading-relaxed text-navy-300">
          {t("dashboard.welcome")
            .replace("{name}", userName)
            .split("\n")
            .filter((para) => para.trim().length > 0)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/registry"
            className="rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-700"
          >
            {t("dashboard.startRegistration")}
          </Link>
        </div>
      </section>

      {/* Preparation checklist */}
      <section
        id="checklist"
        className="scroll-mt-24 rounded-2xl border border-line bg-card/60 p-6"
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
            <Download size={16} aria-hidden="true" />
            {t("dashboard.downloadGuide")}
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {checklist.map(({ key, Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-line bg-card p-4 transition hover:border-gold/40 hover:shadow-sm"
            >
              <span className="text-gold-700">
                <Icon />
              </span>
              <h3 className="mt-3 text-base font-bold text-navy-700">
                {t(`dashboard.${key}Title`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
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
          <Download size={16} aria-hidden="true" />
          {t("dashboard.downloadGuide")}
        </a> */}
      </Modal>
    </div>
  );
}
