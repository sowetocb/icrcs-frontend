"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/localeProvider";
import { useMobileNav } from "@/components/layout/mobileNav";
import { logout } from "@/lib/api/auth";
import { clearSession, loadSession } from "@/lib/auth/session";
import { clearProfile } from "@/lib/auth/profile";
import { clearPeople } from "@/app/registry/peopleStore";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  X,
} from "lucide-react";

export default function CitizenSidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  // On small screens the nav is an off-canvas drawer toggled by the hamburger in
  // the top bar (shared MobileNav context); on lg+ it's always visible.
  const { open, setOpen } = useMobileNav();

  const items = [
    { key: "dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { key: "registry", href: "/registry", Icon: ClipboardList },
    { key: "people", href: "/registry/people", Icon: Users },
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
    <>
      {/* Mobile drawer is opened from the top-bar hamburger (DashboardTopbar) via
          the shared MobileNav context — no floating edge handle. */}

      {/* Backdrop — tap to dismiss the drawer (mobile only). */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseLeave={() => setOpen(false)}
        className={`flex w-64 shrink-0 flex-col bg-sidebar transition-transform duration-300 ease-in-out
          fixed inset-y-0 left-0 z-50 transform ${open ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:translate-x-0`}
      >
        {/* Gold institutional accent bar (matches the ICRCS portal masthead). */}
        <div className="h-1.5 w-full shrink-0 bg-gold" aria-hidden="true" />

        {/* Navigation label + close (close is mobile-only). */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
            {t("nav.dashboard")}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
            className="-mr-1 rounded-md p-1 text-white/60 transition hover:bg-sidebar-hover hover:text-white lg:hidden"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map(({ key, href, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active
                    ? "bg-sidebar-active text-icrcs-navy font-semibold shadow-sm"
                    : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                  }`}
              >
                <Icon size={18} className={active ? "text-icrcs-navy" : "text-white/50"} />
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-sidebar-hover hover:text-red-400"
          >
            <LogOut size={18} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
