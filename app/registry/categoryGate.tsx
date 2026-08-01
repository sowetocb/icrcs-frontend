"use client";

import { useState } from "react";
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
type MinorRelationship = "guardian" | "parent";

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
 *
 * When registering a DEPENDENT (minor), after the category is chosen the account
 * holder must state whether they are the Parent or Guardian before Stage 1.
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
  onSelect: (category: RegistrationCategory, relationship?: MinorRelationship) => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [pendingCategory, setPendingCategory] = useState<RegistrationCategory | null>(null);
  const [relationship, setRelationship] = useState<MinorRelationship | "">("");

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

  function pickCategory(key: RegistrationCategory) {
    // The parent/guardian question only makes sense for a citizen registering
    // their OWN dependent — an officer is never the minor's parent/guardian,
    // so skip straight through for officer-driven registrations.
    if (isDependent && !officerMode) {
      setPendingCategory(key);
      setRelationship("");
      return;
    }
    onSelect(key);
  }

  function confirmRelationship() {
    if (!pendingCategory || !relationship) return;
    onSelect(pendingCategory, relationship);
    setPendingCategory(null);
    setRelationship("");
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-8 lg:px-[10%]">
      <div className="mx-auto w-full max-w-6xl">
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
          {categories.map(({ key, Icon, titleKey, descKey }) => {
            // A Tanzanian registering a dependent picks "Foreigner" to register a
            // FOREIGN MINOR — relabel that card so its purpose is unmistakable.
            const isForeignMinor = key === "FOREIGN" && isDependent && isTanzanian;
            const tKey = isForeignMinor ? "category.foreignMinorTitle" : titleKey;
            const dKey = isForeignMinor ? "category.foreignMinorDesc" : descKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickCategory(key)}
                className="group flex flex-col rounded-xl border border-line bg-card p-5 text-left transition hover:border-gold/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h2 className="mt-3 text-lg font-bold text-navy-700">{t(tKey)}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(dKey)}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 transition group-hover:gap-2.5">
                  {t("gate.continue")}
                  <ArrowRightIcon size={16} aria-hidden="true" />
                </span>
              </button>
            );
          })}
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

      {/* Parent / Guardian dialog — asked before entering a dependent's Stage 1. */}
      {pendingCategory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("gate.relationshipQuestion")}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label={t("gate.back")}
            onClick={() => {
              setPendingCategory(null);
              setRelationship("");
            }}
            className="absolute inset-0 cursor-default bg-navy-900/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-navy-700">
              {t("gate.relationshipQuestion")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("gate.relationshipHint")}
            </p>
            <div className="mt-4 space-y-3">
              {([
                ["parent", t("gate.relationshipParent")],
                ["guardian", t("gate.relationshipGuardian")],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm font-medium transition ${
                    relationship === value
                      ? "border-navy-700 bg-navy-50 text-navy-700"
                      : "border-line text-ink hover:border-navy-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="minorRelationship"
                    checked={relationship === value}
                    onChange={() => setRelationship(value)}
                    className="h-4 w-4 shrink-0 accent-navy-700"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingCategory(null);
                  setRelationship("");
                }}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-line hover:text-navy-700"
              >
                {t("gate.back")}
              </button>
              <button
                type="button"
                disabled={!relationship}
                onClick={confirmRelationship}
                className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("gate.relationshipContinue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
