"use client";

import { useI18n } from "../i18n/localeProvider";
import {
  User,
  Globe,
  Users,
  Home,
  ShieldCheck,
  FileText,
  RotateCcw,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
} from "lucide-react";
import {
  CATEGORY_TRACK,
  type RegistrationCategory,
} from "@/lib/registry/registrationCategory";

type IconType = typeof User;

// Citizen / Foreign run the existing citizen flow; the remaining five are the
// backend's migrant registration types and all run the migrant flow.
const CATEGORIES: {
  key: RegistrationCategory;
  Icon: IconType;
  titleKey: string;
  descKey: string;
}[] = [
  { key: "CITIZEN", Icon: User, titleKey: "category.citizenTitle", descKey: "category.citizenDesc" },
  { key: "FOREIGN", Icon: Globe, titleKey: "category.foreignTitle", descKey: "category.foreignDesc" },
  { key: "ASYLUM_SEEKER", Icon: ShieldCheck, titleKey: "category.asylumTitle", descKey: "category.asylumDesc" },
  { key: "REFUGEE", Icon: Home, titleKey: "category.refugeeTitle", descKey: "category.refugeeDesc" },
  // "Migrant" (pre-1972 resident, no foreign passport) → UNDOCUMENTED_MIGRANT enum.
  { key: "UNDOCUMENTED_MIGRANT", Icon: FileText, titleKey: "category.undocumentedTitle", descKey: "category.undocumentedDesc" },
  { key: "VOLUNTARY_RETURNEE", Icon: RotateCcw, titleKey: "category.returneeTitle", descKey: "category.returneeDesc" },
  // "Immigrant with Undetermined Status" (irregular entry/stay) → ALIEN enum.
  { key: "ALIEN", Icon: Users, titleKey: "category.alienTitle", descKey: "category.alienDesc" },
];

/**
 * Registration-category picker shown at the start of a fresh registration.
 * Citizen / Foreign route into the existing citizen flow; Migrant / Refugee /
 * Asylum Seeker route into the migrant track. The parent (registryClient) maps
 * the chosen category to a track + registrationType.
 */
export default function CategoryGate({
  track,
  isTanzanian = false,
  isDependent = false,
  officerMode = false,
  onSelect,
  onExit,
}: {
  /** The account holder's own registration track (citizen vs migrant), used to
   * scope which categories a DEPENDENT (minor) may be registered under. */
  track?: "citizen" | "migrant" | null;
  /** Whether the profile's nationality is Tanzanian. */
  isTanzanian?: boolean;
  /** True when this is a DEPENDENT (minor) registration — i.e. the account
   * holder has already registered (and had approved) themselves. */
  isDependent?: boolean;
  /** A government officer is registering an immigrant — only the migrant
   * categories are offered (never Citizen / Foreign National). */
  officerMode?: boolean;
  onSelect: (category: RegistrationCategory) => void;
  onExit: () => void;
}) {
  const { t } = useI18n();

  // Category availability:
  //  • OFFICER — only the migrant categories (registering an immigrant).
  //  • OWN registration — nationality decides outright: a Tanzanian national can
  //    register ONLY as a Citizen; a foreign national sees every category EXCEPT
  //    Citizen (Foreign National + the migrant categories).
  //  • DEPENDENT (minor) — inherits the account holder's track: a citizen/foreign
  //    (Tanzanian) holder may register a Tanzanian citizen OR a foreign minor
  //    (Citizen + Foreign); a migrant holder registers migrant categories.
  let categories;
  if (officerMode) {
    categories = CATEGORIES.filter(({ key }) => CATEGORY_TRACK[key] === "migrant");
  } else if (isDependent) {
    const depTrack = track ?? (isTanzanian ? "citizen" : "migrant");
    categories = CATEGORIES.filter(({ key }) => CATEGORY_TRACK[key] === depTrack);
  } else {
    categories = CATEGORIES.filter(({ key }) =>
      isTanzanian ? key === "CITIZEN" : key !== "CITIZEN",
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-8 lg:px-[10%]">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm font-semibold text-success">{t("category.eyebrow")}</p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-navy-700 sm:text-4xl">
          {t("category.title")}
        </h1>
        {/* Full-width paragraphs (no max-w cap) so they stretch across the
            centred container and fill the side gaps for a balanced look. */}
        <p className="mt-3 leading-relaxed text-muted">{t("category.subtitle")}</p>
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-relaxed text-ink">
          {t("category.note")}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ key, Icon, titleKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="group flex flex-col rounded-xl border border-line bg-card p-5 text-left transition hover:border-gold/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-lg font-bold text-navy-700">{t(titleKey)}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(descKey)}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 transition group-hover:gap-2.5">
                {t("gate.continue")}
                <ArrowRightIcon size={16} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onExit}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 transition hover:text-gold-700"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t("category.back")}
        </button>
      </div>
    </main>
  );
}
