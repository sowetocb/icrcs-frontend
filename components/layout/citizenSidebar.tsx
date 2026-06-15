"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/localeProvider";
import { logout } from "@/lib/api/auth";
import { clearSession, loadSession } from "@/lib/auth/session";
import { clearProfile } from "@/lib/auth/profile";
import { clearPeople } from "@/app/registry/peopleStore";

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
function PeopleIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function RegistryIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}
function LogoutIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function CitizenSidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { key: "dashboard", href: "/dashboard", Icon: DashboardIcon },
    { key: "registry", href: "/registry", Icon: RegistryIcon },
    { key: "people", href: "/registry/people", Icon: PeopleIcon },
  ] as const;

  async function handleLogout() {
    const session = loadSession();
    if (session?.refreshToken) {
      try {
        await logout(session.refreshToken);
      } catch {
        // ignore — clear the local session regardless
      }
    }
    clearSession();
    clearProfile();
    // NOTE: do NOT clear the in-progress registration draft on logout — an
    // unsubmitted registration is kept (cached by Application ID) so the user
    // can resume it after signing back in. Foreign drafts are cleared on login.
    clearPeople();
    router.push("/login");
  }

  return (
    <aside className="sticky top-20 flex h-[calc(100vh-5rem)] w-64 shrink-0 flex-col bg-sidebar">
        {/* Navigation label */}
        <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200/50">
          {t("nav.dashboard")}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map(({ key, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-sidebar-active text-white shadow-sm"
                  : "text-blue-200/70 hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <Icon className={active ? "text-white" : "text-blue-200/50"} />
              {t(`nav.${key}`)}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-200/70 transition hover:bg-sidebar-hover hover:text-red-400"
        >
          <LogoutIcon />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
