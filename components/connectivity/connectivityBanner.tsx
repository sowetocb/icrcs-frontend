"use client";

import { useConnectivity } from "@/lib/connectivity/useConnectivity";
import { useI18n } from "@/app/i18n/localeProvider";

export default function ConnectivityBanner() {
  const { online, justReconnected } = useConnectivity();
  const { t } = useI18n();

  if (online && !justReconnected) return null;

  const message = justReconnected ? t("connectivity.restored") : t("connectivity.offline");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-50 border-b px-4 py-2 text-center text-sm font-medium ${
        online
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      {message}
    </div>
  );
}
