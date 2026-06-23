"use client";

import { useEffect, useState } from "react";
import LanguageSwitcher from "@/app/i18n/languageSwitcher";
import ProfileView from "@/app/dashboard/profile/profileView";
import { useI18n } from "@/app/i18n/localeProvider";
import { refreshMyProfile, fetchProfilePicture } from "@/lib/api/auth";
import { LOGO_EMBLEM } from "@/lib/assets";
import {
  loadProfile,
  saveProfile,
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [time, setTime] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const photoUrl = photoFailed ? null : (photo ?? profilePhotoSrc(profile));

  useEffect(() => {
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

  const name = fullName(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-sidebar">
      <div className="flex h-20 items-center justify-between px-6">
        {/* Left — Brand */}
        <div className="flex items-center gap-3">
          {/* Plain img (not next/image) so the ?v= cache-bust on a same-named
              logo replacement works without images.localPatterns config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_EMBLEM}
            alt={t("brand.country")}
            width={56}
            height={56}
            className="h-18 w-18 object-contain"
          />
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-200/70">
              {t("brand.country")}
            </p>
            <p className="font-display text-base font-bold text-white sm:text-lg">
              {t("brand.department")}
            </p>
          </div>
        </div>

        {/* Right — Controls + User */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {/* User — opens the profile dialog over the dashboard, with a clock */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title={name || "Profile"}
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
                initials(profile)
              )}
            </span>
            <span className="hidden leading-tight lg:block">
              <span className="block text-base font-medium text-white">
                {name || "—"}
              </span>
              <span className="block font-mono text-[11px] text-white/50" suppressHydrationWarning>
                {time}
              </span>
            </span>
          </button>
        </div>
      </div>

      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </header>
  );
}
