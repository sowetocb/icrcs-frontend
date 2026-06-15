"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LanguageSwitcher from "@/app/i18n/languageSwitcher";
import { useI18n } from "@/app/i18n/localeProvider";
import { refreshMyProfile, fetchProfilePicture } from "@/lib/api/auth";
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

export default function DashboardTopbar() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [time, setTime] = useState("");
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
          <Image
            src="/logo/immigrationEmblem.png"
            alt={t("brand.country")}
            width={56}
            height={56}
            className="h-18 w-18 object-contain"
            priority
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

          {/* User — links to the profile page, with a live clock */}
          <Link
            href="/dashboard/profile"
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
          </Link>
        </div>
      </div>
    </header>
  );
}
