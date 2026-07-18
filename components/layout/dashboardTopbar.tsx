"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/app/i18n/languageSwitcher";
import ProfileView from "@/app/dashboard/profile/profileView";
import { useI18n } from "@/app/i18n/localeProvider";
import { refreshMyProfile, fetchProfilePicture, logout } from "@/lib/api/auth";
import { clearSession, loadSession } from "@/lib/auth/session";
import { isOfficer, clearOfficer, loadOfficer, type OfficerUser } from "@/lib/auth/officerSession";
import { getOfficerProfile } from "@/lib/api/officer";
import { clearPeople } from "@/app/registry/peopleStore";
import { LOGO_EMBLEM } from "@/lib/assets";
import { UserRound, LogOut, Menu } from "lucide-react";
import { useMobileNav } from "@/components/layout/mobileNav";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  profilePhotoSrc,
  loadPhotoDataUrl,
  savePhotoDataUrl,
  type Profile,
} from "@/lib/auth/profile";

function initials(p: Profile | null): string {
  if (!p) return "?";
  const f = p.firstName?.trim()?.[0] ?? "";
  const l = p.lastName?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function fullName(p: Profile | null): string {
  if (!p) return "";
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
}

/** Initials from a single full-name string (officers store a `fullName`). */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** The profile shown as a fading modal hovering over the dashboard — all editing
 * happens here. Fades in on mount and out before unmounting. */
function ProfileDialog({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function close() {
    setVisible(false);
    // Wait for the fade-out to finish before unmounting.
    setTimeout(onClose, 250);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 transition-opacity duration-200 sm:p-8 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div
        className={`relative z-10 my-auto w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <ProfileView onClose={close} />
      </div>
    </div>
  );
}

export default function DashboardTopbar() {
  const { t } = useI18n();
  const router = useRouter();
  const mobileNav = useMobileNav();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [officer, setOfficer] = useState<OfficerUser | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [time, setTime] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Officers have no citizen photo — always show their initials.
  const photoUrl = isOfficer() ? null : (photoFailed ? null : (photo ?? profilePhotoSrc(profile)));

  // Close the user menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    // Officer (government user) session — clear via its own proxy + store.
    if (isOfficer()) {
      try {
        await fetch("/api/officer/logout", { method: "POST", credentials: "include" });
      } catch {
        // ignore — clear the local officer session regardless
      }
      clearOfficer();
      router.push("/login");
      return;
    }
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
    // Keep the in-progress registration draft so the user can resume it after
    // signing back in; only clear the dependents list. (Mirrors the sidebar.)
    clearPeople();
    router.push("/login");
  }

  useEffect(() => {
    // Officers have NO citizen profile — never hit the citizen /me endpoint.
    // Use the cached officer identity and refresh it from /v1/officer/profile.
    if (isOfficer()) {
      const cachedOfficer = loadOfficer();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfficer(cachedOfficer);
      let alive = true;
      (async () => {
        try {
          const p = await getOfficerProfile();
          if (!alive) return;
          setOfficer((o) => ({
            roles: o?.roles ?? [],
            permissions: o?.permissions ?? [],
            ...o,
            username: p.username || o?.username,
            stationId: p.stationId || o?.stationId,
          }));
        } catch {
          // keep the cached officer identity
        }
      })();
      return () => {
        alive = false;
      };
    }

    const cached = loadProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(cached);
    setPhoto(loadPhotoDataUrl(cached));

    // Re-fetch from the backend so updates made on another device show here.
    let active = true;
    (async () => {
      try {
        const fresh = await refreshMyProfile();
        if (!active) return;
        saveProfile(fresh);
        setProfile(fresh);
        let dataUrl = loadPhotoDataUrl(fresh);
        if (!dataUrl && fresh.profilePictureUrl) {
          dataUrl = await fetchProfilePicture(fresh.profilePictureUrl);
          if (dataUrl) savePhotoDataUrl(fresh, dataUrl);
        }
        if (!active) return;
        setPhoto(dataUrl ?? null);
        setPhotoFailed(false);
      } catch {
        // keep cached values
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live clock shown next to the profile.
  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // Officer identity takes precedence over the (absent) citizen profile.
  const officerName = officer ? (officer.fullName || officer.username || "") : "";
  const name = officer ? officerName : fullName(profile);
  const avatarInitials = officer ? initialsFromName(officerName) : initials(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-sidebar">
      <div className="flex h-20 items-center justify-between px-6">
        {/* Left — Brand (emblem stays pinned to the left of the bar) */}
        <div className="flex items-center gap-3">
          {/* Plain img (not next/image) so the ?v= cache-bust on a same-named
              logo replacement works without images.localPatterns config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_EMBLEM}
            alt={t("brand.country")}
            width={88}
            height={88}
            className="h-16 w-16 object-contain"
          />
          <div className="hidden leading-tight sm:block">
            <p className="text-lg font-medium uppercase tracking-wider text-icrcs-gold-light/80 sm:text-xl">
              {t("brand.country")}
            </p>
            <p className="font-display text-md font-bold text-white">
              {t("brand.department")}
            </p>
          </div>
        </div>

        {/* Right — Controls + User */}
        <div className="flex items-center gap-3">
          {/* Mobile nav toggle — sits on the RIGHT next to the language switcher
              (like the TRC portal), not as a floating edge handle. Opens the
              sibling sidebar drawer via the shared MobileNav context. Hidden on
              lg+ where the sidebar is always visible. */}
          <button
            type="button"
            onClick={mobileNav.toggle}
            aria-label={t("nav.openMenu")}
            className="shrink-0 rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <LanguageSwitcher />

          {/* User — a trigger that opens a small menu (View profile / Logout) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              title={name || "Profile"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3 transition hover:bg-white/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold text-sm font-bold text-navy-900">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={name}
                    onError={() => setPhotoFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarInitials
                )}
              </span>
              <span className="hidden leading-tight lg:block">
                <span className="block text-base font-medium text-white">
                  {name || "—"}
                </span>
                <span className="block font-mono text-xs text-white/50" suppressHydrationWarning>
                  {time}
                </span>
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-2xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-navy-50"
                >
                  <UserRound size={18} aria-hidden="true" className="text-navy-700" />
                  {t("nav.viewProfile")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
                >
                  <LogOut size={18} aria-hidden="true" />
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </header>
  );
}
