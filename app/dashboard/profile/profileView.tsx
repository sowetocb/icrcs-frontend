"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/localeProvider";
import {
  updateProfile,
  uploadProfilePicture,
  refreshMyProfile,
  fetchProfilePicture,
  SessionExpiredError,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { RULES } from "@/lib/validation/rules";
import { LoaderCircle, X } from "lucide-react";
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
import ProfilePhoneInput from "@/app/create-profile/profilePhoneInput";
import { isPhoneComplete } from "@/lib/phoneLengths";
import { isOfficer, loadOfficer, type OfficerUser } from "@/lib/auth/officerSession";
import { getOfficerProfile } from "@/lib/api/officer";

const MAX_PHOTO = 300 * 1024; // 300KB
const PHOTO_TYPES: readonly string[] = RULES.PHOTO_ALLOWED_MIME;

// NOTE: this dialog previously forced every phone number into a Tanzanian
// "+255" + 9-digit shape. That corrupted any foreign number — a stored Burundian
// "+25773637785" was re-prefixed to "+255257736377" on display AND written back
// on save. The number is now kept in full international form and the country is
// inferred from it by ProfilePhoneInput, so non-Tanzanian profiles round-trip
// correctly.

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-navy-500 focus:bg-card focus:ring-2 focus:ring-navy-500/15";
const labelClass = "block text-sm font-medium text-navy-700";

function Spinner() {
  return <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />;
}

function initials(p: Profile | null): string {
  if (!p) return "?";
  const f = p.firstName?.trim()?.[0] ?? "";
  const l = p.lastName?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

/** Read-only officer identity panel — fetches from GET /v1/officer/profile
 * and displays only what the API returns. Falls back to the cached login
 * session if the endpoint is unreachable. */
function OfficerProfileView({
  officer: cachedOfficer,
  onClose,
}: {
  officer: OfficerUser;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    stationName: string;
    mobileNo: string;
    pfNo: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getOfficerProfile();
        if (!alive) return;
        setProfile({
          fullName: p.fullName || cachedOfficer.fullName || "",
          email: p.email || p.username || cachedOfficer.email || "",
          // Prefer the station NAME ("HQ"); fall back to the id.
          stationName: p.stationName || cachedOfficer.stationName || (p.stationId ? String(p.stationId) : ""),
          mobileNo: p.mobileNo || "",
          pfNo: p.pfNo || cachedOfficer.pfNo || "",
        });
      } catch {
        // Fallback to cached login data if the API fails.
        if (!alive) return;
        setProfile({
          fullName: cachedOfficer.fullName || cachedOfficer.username || "",
          email: cachedOfficer.email || cachedOfficer.username || "",
          stationName: cachedOfficer.stationName || (cachedOfficer.stationId ? String(cachedOfficer.stationId) : ""),
          mobileNo: "",
          pfNo: cachedOfficer.pfNo || "",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cachedOfficer]);

  const name = profile?.fullName || cachedOfficer.fullName || cachedOfficer.username || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const avatar =
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";

  // Position and Region come only from the login session (not the
  // /v1/officer/profile response), so read them from the cached officer. Roles
  // are intentionally NOT shown on the profile.
  const rows: [string, string | undefined][] = profile
    ? [
        ["Full name", profile.fullName],
        ["Email", profile.email],
        ["Mobile", profile.mobileNo],
        ["PF No.", profile.pfNo],
        ["Position", cachedOfficer.position],
        ["Station", profile.stationName],
        ["Region", cachedOfficer.regionName],
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-navy-700">{t("nav.viewProfile")}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition hover:bg-navy-50 hover:text-navy-700"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-line bg-card p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xl font-bold text-white">
          {avatar}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-navy-700">{name || "—"}</p>
          {(profile?.email || cachedOfficer.email) && (
            <p className="truncate text-sm text-muted">{profile?.email || cachedOfficer.email}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle className="h-6 w-6 animate-spin text-navy-500" aria-hidden="true" />
        </div>
      ) : (
        <dl className="divide-y divide-line rounded-xl border border-line">
          {rows
            .filter(([, v]) => v && v.trim())
            .map(([label, v]) => (
              <div key={label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-muted">{label}</dt>
                <dd className="text-sm text-ink sm:col-span-2">{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}

export default function ProfileView({ onClose }: { onClose?: () => void } = {}) {
  // Officers get a read-only officer panel; citizens get the editable profile.
  const [officer] = useState(() => (isOfficer() ? loadOfficer() : null));
  if (officer) return <OfficerProfileView officer={officer} onClose={onClose} />;
  return <CitizenProfileView onClose={onClose} />;
}

function CitizenProfileView({ onClose }: { onClose?: () => void }) {
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
    // Nationality is shown read-only (the user can't change it); kept in form
    // state only so it is sent back unchanged on update.
    nationality: "",
  });
  // Locally cached photo (data URL) — the backend has no URL that serves the
  // uploaded image, so we render the bytes we kept on upload.
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        nationality: p.nationality ?? "",
      });

    // Officers have NO citizen profile — never call /v1/profile/me.
    // Show the cached officer identity in read-only mode.
    if (isOfficer()) {
      const o = loadOfficer();
      if (o) {
        const officerProfile: Profile = {
          profileId: "",
          firstName: o.fullName?.split(" ")[0] ?? o.username ?? "",
          middleName: o.fullName?.split(" ").slice(1, -1).join(" ") ?? "",
          lastName: o.fullName?.split(" ").slice(-1)[0] ?? "",
          gender: "",
          phoneNumber: "",
          email: o.username ?? "",
          nationality: "",
          profilePictureUrl: "",
        };
        setProfile(officerProfile);
        fillForm(officerProfile);
      }
      return;
    }

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
    let next = value;
    // Names accept letters only (plus spaces, hyphens, apostrophes).
    if (name === "firstName" || name === "middleName" || name === "lastName") {
      next = value.replace(/[^\p{L} '-]/gu, "");
    }
    // phoneNumber arrives from ProfilePhoneInput already as a full international
    // number ("+<dial><national>") for the country the user picked — no coercion.
    setForm((f) => ({ ...f, [name]: next }));
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setPhoneError("");

    // Validate the phone against the length rules of ITS OWN country (inferred
    // from the dialing code), not Tanzania's — a Burundian, Kenyan, … number is
    // perfectly valid here.
    const phone = form.phoneNumber.trim();
    if (phone && !isPhoneComplete(phone)) {
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
        // Send the number exactly as entered (full international form), so a
        // foreign number is never rewritten to a Tanzanian one.
        phoneNumber: phone,
        // Not user-editable — sent back unchanged.
        nationality: form.nationality,
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
      // Dismiss on success: close the dashboard dialog, or on the standalone
      // page return to the dashboard.
      if (onClose) onClose();
      else router.push("/dashboard");
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

  const hasPhoto = Boolean(photoSrc);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {onClose && (
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-700">{t("profile.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("about.close")}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-navy-700"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      )}
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
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500 disabled:opacity-70"
            >
              {uploading && <Spinner />}
              {uploading ? t("profile.uploading") : t("profile.changePhoto")}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{t("profile.photoHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept={RULES.PHOTO_ALLOWED_MIME.join(",")}
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
              maxLength={RULES.UI_NAME_MAX}
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
              maxLength={RULES.UI_NAME_MAX}
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
              maxLength={RULES.UI_NAME_MAX}
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
            {/* Gender is set at profile creation and cannot be changed here. */}
            <select
              id="gender"
              value={form.gender}
              disabled
              aria-disabled="true"
              className={`${inputClass} cursor-not-allowed opacity-70`}
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
            {/* Country-aware phone field (same one used on create-profile): it
                infers the country from the stored number's dialing code, so a
                foreign number displays and saves correctly. */}
            <ProfilePhoneInput
              id="phoneNumber"
              value={form.phoneNumber}
              onChange={(v) => {
                setField("phoneNumber", v);
                if (phoneError) setPhoneError("");
              }}
              invalid={Boolean(phoneError)}
              describedBy={phoneError ? "phone-error" : undefined}
              placeholder={t("register.phonePlaceholder")}
            />
            {phoneError && (
              <p id="phone-error" role="alert" className="mt-1 text-xs text-danger">
                {phoneError}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="space-y-1.5">
            <label htmlFor="nationality" className={labelClass}>
              {t("register.nationality")}
            </label>
            {/* Nationality can't be changed by the user — read-only. */}
            <input
              id="nationality"
              value={form.nationality}
              readOnly
              disabled
              className={`${inputClass} cursor-not-allowed bg-line/30 text-muted`}
            />
          </div>
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
