"use client";

import { useI18n } from "@/app/i18n/localeProvider";
import { Info } from "lucide-react";

export default function HelpfulTip() {
  const { t } = useI18n();

  return (
    <div className="mt-6 flex gap-4 rounded-2xl border border-line bg-card p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Info size={20} aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-display text-base font-bold text-navy-700">
          {t("registry.tipTitle")}
        </h3>
        <p className="mt-1 text-base leading-relaxed text-muted">
          {t("registry.tipBody")}
        </p>
      </div>
    </div>
  );
}
