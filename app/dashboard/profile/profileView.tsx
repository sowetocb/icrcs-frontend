"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/localeProvider";
import {
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  refreshMyProfile,
  fetchProfilePicture,
  SessionExpiredError,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { useGenderOptions } from "@/components/registry/blocks";
import {
  loadProfile,
  saveProfile,
  profilePhotoSrc,
  loadPhotoDataUrl,
  savePhotoDataUrl,
  clearPhotoDataUrl,
  fileToDataUrl,
  type Profile,
} from "@/lib/auth/profile";

const MAX_PHOTO = 500 * 1024; // 500KB
const PHOTO_TYPES = ["image/jpeg", "image/png"];

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-navy-500 focus:bg-card focus:ring-2 focus:ring-navy-500/15";
const labelClass = "block text-sm font-medium text-navy-700";

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function initials(p: Profile | null): string {
  if (!p) return "?";
  const f = p.firstName?.trim()?.[0] ?? "";
  const l = p.lastName?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export default function ProfileView() {
  const { t } = useI18n();
  const router = useRouter();
  const { notify } = useToast();
  // Gender options come from the lookup, rendered with the exact API label.
  const genders = useGenderOptions();
  const fileRef = useRef<HTMLInputElement>(null);
  // Once the user edits a field, don't let a late background refresh clobber it.
  const dirtyRef = useRef(false);

  // When the session can't be refreshed, bounce to sign-in. Returns true if it
  // handled the error so callers can skip showing a generic message.
  function redirectIfExpired(err: unknown): boolean {
    if (err instanceof SessionExpiredError) {
      router.push("/login");
      return true;
    }
    return false;
  }

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    phoneNumber: "",
  });
  // Locally cached photo (data URL) — the backend has no URL that serves the
  // uploaded image, so we render the bytes we kept on upload.
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Show the cached profile immediately, then re-fetch from the backend so
  // edits made on another device/browser (name, phone, photo) are reflected.
  useEffect(() => {
    const fillForm = (p: Profile) =>
      setForm({
        firstName: p.firstName ?? "",
        middleName: p.middleName ?? "",
        lastName: p.lastName ?? "",
        gender: p.gender ?? "",
        phoneNumber: p.phoneNumber ?? "",
      });

    const cached = loadProfile();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(cached);
      fillForm(cached);
      setPreview(loadPhotoDataUrl(cached));
    }

    let active = true;
    (async () => {
      try {
        const fresh = await refreshMyProfile();
        if (!active) return;
        saveProfile(fresh);
        setProfile(fresh);
        if (!dirtyRef.current) fillForm(fresh);

        // Reconcile the photo with the server's current state.
        if (!fresh.profilePictureUrl) {
          // Removed elsewhere — drop any stale local copy.
          clearPhotoDataUrl(fresh);
          setPreview(null);
        } else {
          const local = loadPhotoDataUrl(fresh);
          if (local) {
            setPreview(local);
          } else {
            // Uploaded on another device — fetch the bytes and cache them here.
            const dataUrl = await fetchProfilePicture(fresh.profilePictureUrl);
            if (!active) return;
            if (dataUrl) {
              savePhotoDataUrl(fresh, dataUrl);
              setPreview(dataUrl);
            }
          }
        }
      } catch {
        // Offline / transient — keep the cached values already shown.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Prefer the locally cached photo; fall back to a server URL (if one ever
  // works) and finally to initials.
  const persistedSrc = photoFailed ? null : profilePhotoSrc(profile);
  const photoSrc = preview ?? persistedSrc;

  function setField(name: keyof typeof form, value: string) {
    dirtyRef.current = true;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setPhoneError("");

    // Validate phone: must have at least 7 digits to be meaningful.
    const phoneDigits = form.phoneNumber.replace(/[^\d]/g, "");
    if (form.phoneNumber.trim() && phoneDigits.length < 7) {
      setPhoneError(t("profile.phoneInvalid"));
      setSaving(false);
      return;
    }
    try {
      const updated = await updateProfile({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        phoneNumber: form.phoneNumber.replace(/[^\d+]/g, ""),
      });
      // Keep any photo we already have if the response omits it.
      const merged: Profile = {
        ...updated,
        profilePictureUrl:
          updated.profilePictureUrl || profile?.profilePictureUrl || "",
      };
      saveProfile(merged);
      setProfile(merged);
      notify(t("toast.profileSaved"));
      router.push("/dashboard");
    } catch (err) {
      if (!redirectIfExpired(err))
        setError(getErrorMessage(err, t("profile.updateError")));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");
    setNotice("");
    if (!PHOTO_TYPES.includes(file.type)) {
      setError(t("profile.photoInvalidType"));
      return;
    }
    if (file.size > MAX_PHOTO) {
      setError(t("profile.photoTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const path = await uploadProfilePicture(file);
      const next: Profile = {
        ...(profile ?? ({} as Profile)),
        profilePictureUrl: path,
      };
      saveProfile(next);
      setProfile(next);
      setPhotoFailed(false);
      // Cache the image locally so it renders now and after reloads.
      const dataUrl = await fileToDataUrl(file);
      savePhotoDataUrl(next, dataUrl);
      setPreview(dataUrl);
      setNotice(t("profile.photoUpdated"));
    } catch (err) {
      if (!redirectIfExpired(err))
        setError(getErrorMessage(err, t("profile.photoError")));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setError("");
    setNotice("");
    setRemoving(true);
    try {
      await deleteProfilePicture();
      const next: Profile = {
        ...(profile ?? ({} as Profile)),
        profilePictureUrl: "",
      };
      saveProfile(next);
      setProfile(next);
      clearPhotoDataUrl(next);
      setPreview(null);
      setPhotoFailed(false);
      setNotice(t("profile.photoRemoved"));
    } catch (err) {
      if (!redirectIfExpired(err))
        setError(getErrorMessage(err, t("profile.photoError")));
    } finally {
      setRemoving(false);
    }
  }

  const hasPhoto = Boolean(photoSrc);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
          {notice}
        </p>
      )}

      {/* Avatar + photo controls */}
      <section className="mb-8 flex items-center gap-5 rounded-xl border border-line bg-card p-5">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-700 text-2xl font-bold text-white">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc as string}
              alt=""
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(profile)
          )}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || removing}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-70"
            >
              {uploading && <Spinner />}
              {uploading ? t("profile.uploading") : t("Change Profile Photo")}
            </button>
            {hasPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading || removing}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:opacity-70"
              >
                {removing && <Spinner />}
                {removing ? t("profile.removing") : t("Delete Profile Photo")}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{t("profile.photoHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handlePhoto}
            className="hidden"
          />
        </div>
      </section>

      {/* Details form */}
      <form onSubmit={handleSave} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className={labelClass}>
              {t("register.firstName")}
            </label>
            <input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="middleName" className={labelClass}>
              {t("register.middleName")}
            </label>
            <input
              id="middleName"
              value={form.middleName}
              onChange={(e) => setField("middleName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className={labelClass}>
              {t("register.lastName")}
            </label>
            <input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="gender" className={labelClass}>
              {t("register.gender")}
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
              className={inputClass}
            >
              <option value="">{t("register.genderSelect")}</option>
              {genders.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phoneNumber" className={labelClass}>
              {t("register.phone")}
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => {
                setField("phoneNumber", e.target.value);
                if (phoneError) setPhoneError("");
              }}
              placeholder={t("register.phonePlaceholder")}
              className={`${inputClass} ${phoneError ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
            />
            {phoneError && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {phoneError}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            {t("form.email")}
          </label>
          <input
            id="email"
            value={profile?.email ?? ""}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed bg-line/30 text-muted`}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-70"
        >
          {saving && <Spinner />}
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </form>
    </div>
  );
}
