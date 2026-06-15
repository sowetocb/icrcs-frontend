"use client";

import { useWizard } from "@/components/registry/field";
import { useI18n } from "@/app/i18n/localeProvider";

import { loadProfile } from "@/lib/auth/profile";

export default function StepDeclaration() {
  const { t } = useI18n();
  const { data, set } = useWizard();
  const agreed = data.agree === true;

  const s = (key: string) => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const prof = typeof window !== "undefined" ? loadProfile() : null;
  const profileName = prof ? [prof.firstName, prof.middleName, prof.lastName].filter(Boolean).join(" ") : "";
  const applicantName = [s("applicantFirst"), s("applicantMiddle"), s("applicantLast")].filter(Boolean).join(" ") || profileName || "—";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface/60 p-6">
        <h3 className="font-display text-base font-bold text-navy-700">
          {t("registry.clauseTitle")}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("registry.clauseText").replace("{name}", applicantName)}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => set("agree", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-navy-700"
        />
        <span className="text-sm font-medium text-ink">{t("registry.agree")}</span>
      </label>
    </div>
  );
}
