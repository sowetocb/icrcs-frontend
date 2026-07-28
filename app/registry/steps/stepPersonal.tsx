"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useMarriageOptions,
  usePersonDocumentTypeOptions,
  useTravelDocumentTypeOptions,
  PointOfEntryField,
} from "@/components/registry/blocks";
import { useI18n } from "@/app/i18n/localeProvider";
import PhoneInput from "@/components/registry/phoneInput";
import WardCascade from "@/components/registry/wardCascade";
import CountrySelect from "@/components/registry/countrySelect";
import { COUNTRIES } from "@/lib/countries";
import { RULES, docNumberRuleFor } from "@/lib/validation/rules";
import { PHOTO_ACCEPT } from "@/lib/api/files";
import { addMonthsIso } from "@/lib/dateFormat";
import { Camera, X, Plus } from "lucide-react";

/** ISO codes of the eight countries bordering Tanzania — the only valid transit
 * points for a migrant's travel history: Kenya, Uganda, Rwanda, Burundi, DR
 * Congo, Zambia, Malawi, Mozambique. */
const TZ_BORDERING_CODES = ["KE", "UG", "RW", "BI", "CD", "ZM", "MW", "MZ"];

/** Entry-route picker for a migrant's travel history. Two routes:
 *  - Neighbouring country (land border) → the transit country is one of the 8
 *    countries bordering Tanzania.
 *  - International (air/sea port) → the migrant flew/sailed in, so their "Home
 *    Country" is any country EXCEPT Tanzania and the 8 transit countries.
 * Both store the chosen country in `transitCountry` (the field the backend
 * already resolves); `entryInternational` is a UI-only flag that selects the
 * route and the country list. Switching route clears the value (a country valid
 * in one route isn't valid in the other). */
function EntryCountryField() {
  const { t } = useI18n();
  const { data, set } = useWizard();
  const intl = data.entryInternational === true;

  // Rehydrate the route on resume: if a transit country was saved that ISN'T one
  // of the 8 land-border countries, it must have been an international entry.
  useEffect(() => {
    if (typeof data.entryInternational === "boolean") return;
    const tc = typeof data.transitCountry === "string" ? data.transitCountry.trim() : "";
    if (!tc) return;
    const isLand = COUNTRIES.some(
      (c) => TZ_BORDERING_CODES.includes(c.code) && c.name === tc,
    );
    set("entryInternational", !isLand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-sm font-medium text-ink">{t("fields.entryRoute")}</span>
        <div className="mt-2 flex flex-wrap gap-6">
          {[
            { v: false, label: t("fields.entryLand") },
            { v: true, label: t("fields.entryInternational") },
          ].map(({ v, label }) => (
            <label key={String(v)} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="entryInternational"
                checked={intl === v}
                onChange={() => {
                  set("entryInternational", v);
                  // A country valid in one route isn't valid in the other, and
                  // the point-of-entry list depends on it — clear both.
                  set("transitCountry", "");
                  set("pointOfEntry", "");
                  set("pointOfEntrySel", "");
                }}
                className="h-4 w-4 accent-navy-700"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <Field label={intl ? t("fields.homeCountry") : t("fields.transitCountry")} optional>
        <CountrySelect
          name="transitCountry"
          placeholder={t("fields.phCountryNat")}
          onValueChange={() => {
            // The point-of-entry list is filtered by this country — reset it.
            set("pointOfEntry", "");
            set("pointOfEntrySel", "");
          }}
          {...(intl
            ? { excludeTanzania: true, exclude: TZ_BORDERING_CODES }
            : { only: TZ_BORDERING_CODES })}
        />
      </Field>
    </div>
  );
}

/** Webcam capture for the passport photo (officer registrations — the applicant
 * is physically at the desk). Streams the camera, grabs a centre-cropped square
 * frame, and hands back a JPEG data URL compressed under the 300KB cap.
 * NOTE: getUserMedia only works in a SECURE context (HTTPS or localhost) — over
 * plain http:// the browser hides the API, so we surface a clear message. */
function CameraCapture({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [shot, setShot] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("fields.cameraUnavailable"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setError(t("fields.cameraError"));
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    // Centre-crop to a square (passport framing), capped at 640px.
    const side = Math.min(v.videoWidth, v.videoHeight);
    const out = Math.min(640, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, out, out);
    // Step the JPEG quality down until the encoded image fits the 300KB cap.
    let q = 0.9;
    let url = canvas.toDataURL("image/jpeg", q);
    while (url.length * 0.75 > 300 * 1024 && q > 0.3) {
      q -= 0.1;
      url = canvas.toDataURL("image/jpeg", q);
    }
    setShot(url);
  }

  function use() {
    onCapture(shot);
    stop();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("fields.cameraTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <h3 className="font-display text-lg font-bold text-navy-700">{t("fields.cameraTitle")}</h3>

        <div className="mt-4 overflow-hidden rounded-xl bg-surface">
          {error ? (
            <p role="alert" className="px-4 py-8 text-center text-sm font-medium text-danger">
              {error}
            </p>
          ) : shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="" className="mx-auto block aspect-square w-full max-w-xs object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="mx-auto block aspect-square w-full max-w-xs object-cover"
            />
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface"
          >
            {t("fields.cancel")}
          </button>
          {!error && !shot && (
            <button
              type="button"
              onClick={capture}
              className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
            >
              {t("fields.cameraCapture")}
            </button>
          )}
          {shot && (
            <>
              <button
                type="button"
                onClick={() => setShot("")}
                className="rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
              >
                {t("fields.cameraRetake")}
              </button>
              <button
                type="button"
                onClick={use}
                className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-500"
              >
                {t("fields.cameraUse")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mandatory passport-style photo captured at Stage 1. Stored as a data URL so
 * it survives reloads and is rebuilt into the `photo` part on submission. */
function PhotoUpload() {
  const { data, set, errors, isOfficerMode } = useWizard();
  const [cameraOpen, setCameraOpen] = useState(false);
  const { t } = useI18n();
  const invalid = errors.includes("stage1PhotoData");
  const preview = (data.stage1PhotoData as string) || "";
  // Store the error as a translation KEY (not the resolved string) so the
  // message re-translates when the user switches language — a resolved string
  // captured in state would stay in whatever locale was active at upload time.
  const [errorKey, setErrorKey] = useState<"" | "photoTypeError" | "photoSizeError" | "photoInvalid">("");
  const error = errorKey ? t(`fields.${errorKey}`) : "";

  async function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { validateUploadFile } = await import("@/lib/validation/fileUpload");
    const check = await validateUploadFile(file, "photo");
    if (!check.ok) {
      setErrorKey(
        check.code === "FILE_TOO_LARGE"
          ? "photoSizeError"
          : check.code === "FILE_TYPE_NOT_ALLOWED"
            ? "photoTypeError"
            : "photoInvalid",
      );
      return;
    }
    setErrorKey("");
    const reader = new FileReader();
    reader.onload = () => {
      set("stage1PhotoData", String(reader.result));
      set("stage1PhotoName", check.safeName);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Field label={t("fields.photo")} required>
      <div
        // The scroll-to-first-error effect targets [data-field] / [data-field-error];
        // this custom (non-input) field carries the marker so a missing photo is
        // scroll-targetable like every other field.
        data-field="stage1PhotoData"
        className={`flex items-center gap-5 rounded-xl border bg-card p-4 ${
          invalid ? "border-danger" : "border-line"
        }`}
      >
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera size={28} strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-navy-500">
              {preview ? t("fields.changePhoto") : t("fields.uploadPhoto")}
              <input
                type="file"
                accept={PHOTO_ACCEPT}
                onChange={handle}
                className="sr-only"
              />
            </label>
            {/* Officer registrations happen with the applicant at the desk, so the
                photo can be taken on the spot instead of uploaded. */}
            {isOfficerMode && (
              <button
                type="button"
                onClick={() => {
                  setErrorKey("");
                  setCameraOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-3.5 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
              >
                <Camera size={16} strokeWidth={2} aria-hidden="true" />
                {t("fields.capturePhoto")}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{t("fields.photoHint")}</p>
          {/* Upload error (type/size) takes precedence; otherwise show the
              required message when validation flagged a missing photo. */}
          {error ? (
            <p role="alert" className="mt-1 text-xs text-danger">
              {error}
            </p>
          ) : invalid ? (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              {t("fields.isRequired").replace("{field}", t("flabel.stage1PhotoData"))}
            </p>
          ) : null}
        </div>
      </div>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            set("stage1PhotoData", dataUrl);
            set("stage1PhotoName", "captured-photo.jpg");
          }}
        />
      )}
    </Field>
  );
}



// Identification document types offered at Stage 1.
const ID_DOC_SUFFIXES = ["Type", "Number"];


export default function StepPersonal() {
  const { data, set, setQuiet, isFirstPerson, isMigrant, isOfficerMode, foreignMinor } = useWizard();
  const { t } = useI18n();
  const { options: genders, loading: gendersLoading } = useGenderOptions();
  const { options: maritalStatuses, loading: maritalLoading } = useMarriageOptions();
  const { options: travelDocTypes, loading: travelDocLoading } = useTravelDocumentTypeOptions();
  const currentYear = new Date().getFullYear();

  // "Do you have a travel document?" defaults to No — most migrants have none,
  // and an unanswered question would otherwise leave the travel-document block
  // in limbo. setQuiet so the default doesn't mark the form dirty.
  useEffect(() => {
    if (isMigrant && data.hasTravelDoc === undefined) setQuiet("hasTravelDoc", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMigrant]);

  // Identification documents repeater (one or more): idDoc1Type/Number, …
  // Options come from the lookup; the option value is the backend documentTypeId.
  const idDocCount = Math.max(1, Number(data.idDocCount) || 1);
  const { options: idDocTypeOptions, loading: idDocLoading } = usePersonDocumentTypeOptions("applicant");

  // Nationality is bound (and locked) from the profile captured at registration.
  // For the account holder's OWN registration it is their profile nationality
  // (migrants / refugees / asylum seekers keep their foreign nationality), seeded
  // by the wizard — leave it as-is. Dependents and Tanzanian-origin minors are
  // Tanzanian, so force Tanzania only for them. Migrant-track dependents (minors
  // of a migrant account holder) and officer-registered migrants keep an open
  // nationality picker — their nationality is NOT forced to Tanzania.
  //
  // Only OFFICER registration and MIGRANT MINOR registration (dependent under the
  // migrant track, i.e. !isFirstPerson && isMigrant) allow the nationality to be
  // freely selected. All other flows bind nationality from the account profile.
  const canPickNationality =
    !!isOfficerMode || !!foreignMinor || (!isFirstPerson && !!isMigrant);
  useEffect(() => {
    if (isFirstPerson) return;
    if (canPickNationality) return; // officer or migrant-minor: freely selectable
    if (data.nationalityCountry !== "Tanzania") setQuiet("nationalityCountry", "Tanzania");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marital status is forced to "Single" and locked for anyone who isn't the
  // account holder — every dependent registration (a citizen account holder's
  // dependents, or a foreign profile's Tanzanian minor) — and for any minor.
  // The account holder picks their own status.
  // Age-based minor check (from the entered DOB). Drives the identification
  // document options: a minor of ANY flow carries only a birth certificate,
  // while an adult (incl. an officer-registered migrant ≥ 18) gets every type.
  const ageIsMinor = (() => {
    const dob = typeof data.dob === "string" ? data.dob : "";
    if (!dob) return false;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();
  const isMinor = !isFirstPerson || ageIsMinor;
  const forceSingle = !isFirstPerson || isMinor;
  const singleValue = maritalStatuses.find((o) => /single/i.test(o.label))?.value ?? "";
  useEffect(() => {
    if (forceSingle && singleValue && data.marriage !== singleValue) setQuiet("marriage", singleValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSingle, singleValue]);

  // Minors only carry a birth certificate — filter the lookup to that type only.
  // Adults (≥ 18), including officer-registered migrants, get EVERY document type.
  const birthCertOptions = idDocTypeOptions.filter((o) => /birth/i.test(o.label));
  const effectiveDocOptions = ageIsMinor ? birthCertOptions : idDocTypeOptions;

  // When switching to minor context (or when options first load), collapse extra
  // documents to 1 and clear any non-birth-cert selection on document 1.
  useEffect(() => {
    if (!ageIsMinor || birthCertOptions.length === 0) return;
    const bcIds = new Set(birthCertOptions.map((o) => o.value));
    for (let n = 2; n <= idDocCount; n++) {
      for (const s of ID_DOC_SUFFIXES) set(`idDoc${n}${s}`, "");
    }
    if (idDocCount > 1) set("idDocCount", "1");
    const doc1Type = typeof data.idDoc1Type === "string" ? data.idDoc1Type : "";
    if (doc1Type && !bcIds.has(doc1Type)) {
      set("idDoc1Type", "");
      set("idDoc1Number", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageIsMinor, birthCertOptions.length]);

  function addIdDoc() {
    set("idDocCount", String(idDocCount + 1));
  }
  /** Remove a specific document, shifting later ones up into its slot. */
  function removeIdDoc(target: number) {
    if (idDocCount <= 1) return;
    for (let n = target; n < idDocCount; n++) {
      for (const s of ID_DOC_SUFFIXES) {
        const nextVal = data[`idDoc${n + 1}${s}`];
        set(`idDoc${n}${s}`, typeof nextVal === "string" ? nextVal : "");
      }
    }
    for (const s of ID_DOC_SUFFIXES) set(`idDoc${idDocCount}${s}`, "");
    set("idDocCount", String(idDocCount - 1));
  }

  // Place-of-birth logic: the Tanzania cascade (territory → ward → street)
  // renders only when Tanzania is explicitly picked. The free-text city field
  // renders only when a non-Tanzania country is explicitly picked. When no
  // country is selected yet, neither is shown — just the country picker.
  const pobCountry = typeof data.pobCountry === "string" ? (data.pobCountry as string).trim() : "";
  const bornInTanzania = pobCountry === "Tanzania";
  const bornAbroad = pobCountry !== "" && !bornInTanzania;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name="applicantFirst" placeholder={t("fields.phFirstName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.middleName")} optional>
          <TextInput name="applicantMiddle" placeholder={t("fields.phMiddleName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name="applicantLast" placeholder={t("fields.phLastName")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
      </div>

      <PhotoUpload />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.gender")} required>
          <Select
            name="gender"
            placeholder={t("fields.phSelectGender")}
            options={genders}
            loading={gendersLoading}
          />
        </Field>

        <Field label={t("fields.dob")} required>
          <DateInput
          name="dob"
          minDate={`${currentYear - 120}-01-01`}
        />
        </Field>

        {/* Only the account holder chooses a marital status. Everyone else in
            scope is a minor: the field is hidden and "Single" is sent in the
            background (forced by the forceSingle effect above). */}
        {!forceSingle && (
          <Field label={t("fields.marriage")} required>
            <Select
              name="marriage"
              placeholder={t("fields.phSelectStatus")}
              options={maritalStatuses}
              loading={maritalLoading}
            />
          </Field>
        )}
      </div>

      {/* Nationality. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.nationality")} required>
          {/* When the nationality is freely pickable it's a NON-Tanzanian subject
              (migrant / officer-registered migrant / foreign minor), so Tanzania
              must not be offered. */}
          <CountrySelect
            name="nationalityCountry"
            placeholder={t("fields.phCountryNat")}
            disabled={!canPickNationality}
            excludeTanzania={canPickNationality}
          />
        </Field>
      </div>

      {/* Physical characteristics — collected for every registration category.
          v002 requires eye colour, hair colour and language spoken; the rest are
          optional. Shared across citizen and migrant tracks. */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-navy-700">
          {t("fields.physicalCharacteristics")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.otherNames")} optional>
            <TextInput name="otherNames" placeholder={t("fields.phOtherNames")} lettersOnly maxLength={RULES.OTHER_NAMES_MAX} />
          </Field>
          <Field label={t("fields.tribe")} optional>
            <TextInput name="tribe" placeholder={t("fields.phTribe")} lettersOnly maxLength={RULES.TRIBE_MAX} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t("fields.eyeColor")} required>
            <TextInput name="eyeColor" placeholder={t("fields.phEyeColor")} lettersOnly maxLength={RULES.EYE_COLOR_MAX} />
          </Field>
          <Field label={t("fields.hairColor")} required>
            <TextInput name="hairColor" placeholder={t("fields.phHairColor")} lettersOnly maxLength={RULES.HAIR_COLOR_MAX} />
          </Field>
          <Field label={t("fields.languageSpoken")} required>
            <TextInput name="languageSpoken" placeholder={t("fields.phLanguageSpoken")} allowChars="\p{L} ''\-," maxLength={100} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.heightCm")} optional>
            {/* Range (50–280) is enforced on blur from RULES.HEIGHT_CM_MIN/MAX. */}
            <TextInput name="heightCm" placeholder={t("fields.phHeightCm")} numeric maxLength={String(RULES.HEIGHT_CM_MAX).length} />
          </Field>
          <Field label={t("fields.specialMark")} optional>
            {/* ORG-class free text: letters, numbers and basic punctuation only —
                strip the symbol soup the backend's ORG validator rejects. */}
            <TextInput
              name="specialMark"
              placeholder={t("fields.phSpecialMark")}
              allowChars={RULES.ORG_ALLOWED_CHARS}
              mustStartWithLetter
              maxLength={RULES.SPECIAL_MARK_MAX}
            />
          </Field>
        </div>
      </div>

      {/* Identification documents — pick a type and enter its number; add more
          than one if needed. */}
      <div className="space-y-3">
        {Array.from({ length: idDocCount }, (_, i) => i + 1).map((n) => {
          const type = typeof data[`idDoc${n}Type`] === "string" ? (data[`idDoc${n}Type`] as string) : "";
          const docLabel = idDocTypeOptions.find((o) => o.value === type)?.label ?? "";
          const docRule = docNumberRuleFor(docLabel);
          // A document type already chosen in another row is hidden here so it
          // can't be picked twice (the current row keeps its own selection).
          const pickedElsewhere = new Set(
            Array.from({ length: idDocCount }, (_, m) => m + 1)
              .filter((m) => m !== n)
              .map((m) => (typeof data[`idDoc${m}Type`] === "string" ? (data[`idDoc${m}Type`] as string) : ""))
              .filter(Boolean),
          );
          const availableOptions = effectiveDocOptions.filter((o) => o.value === type || !pickedElsewhere.has(o.value));
          return (
            <div key={n} className="space-y-4 rounded-xl border border-line bg-card p-4">
              {idDocCount > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-700">
                    {t("fields.documentN").replace("{n}", String(n))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIdDoc(n)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-danger transition-all duration-200 hover:bg-danger hover:text-white active:scale-95"
                    aria-label={t("fields.remove")}
                  >
                    <X size={14} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.docType")} optional>
                  {/* Changing the document type clears the number — a number
                      entered for one type must not carry over to another. */}
                  <Select
                    name={`idDoc${n}Type`}
                    placeholder={t("fields.phSelect")}
                    options={availableOptions}
                    loading={idDocLoading}
                    onValueChange={() => set(`idDoc${n}Number`, "")}
                  />
                </Field>
                {type && (
                  <Field label={t("fields.docNumber")} required>
                    {/* Per-type format (NIDA 20 digits, TIN 9–10, others ranged). */}
                    {docRule.numeric ? (
                      <TextInput name={`idDoc${n}Number`} placeholder="1234567890" numeric maxLength={docRule.max} />
                    ) : (
                      <TextInput name={`idDoc${n}Number`} placeholder="e.g. AB123456" allowChars="A-Za-z0-9" maxLength={docRule.max} />
                    )}
                  </Field>
                )}
              </div>
            </div>
          );
        })}
        {/* Minors have only one document type (birth cert) — hide Add entirely. */}
        {!isMinor && effectiveDocOptions.length > 0 && idDocCount < effectiveDocOptions.length && (
          <button
            type="button"
            onClick={addIdDoc}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            {t("fields.addDocument")}
          </button>
        )}
      </div>

      <Field label={t("fields.placeOfBirth")} required>
        {/* Single country picker (lookup-connected, with flag). The Region/
          District/Ward cascade shows for Tanzania; for any other country only
          the free-text City/Village below is used. */}
        <div className="space-y-3">
          {/* Enable street selection internally inside the cascade helper */}
          <WardCascade prefix="pob" showStreet={bornInTanzania} />
          {/* Only show free-text when born abroad (not Tanzania) */}
          {bornAbroad && (
            <Field label={t("fields.phCityVillageBirth")}>
              <TextInput
                name="pobCityVillage"
                placeholder={t("fields.phCityVillageBirth")}
                lettersOnly
                maxLength={RULES.UI_CITY_MAX}
              />
            </Field>
          )}
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Phone and email are OPTIONAL on the migrant track (many migrants have
            neither) AND for every officer registration (officers only register
            migrants) — drop the required marker; still format-checked when filled. */}
        <Field label={t("fields.phone")} required>
          <PhoneInput name="phone" />
        </Field>
        <Field label={t("fields.email")} required={!isMigrant && !isOfficerMode} optional={!!isMigrant || !!isOfficerMode}>
          <TextInput name="email" type="email" placeholder="test@test.com" maxLength={RULES.UI_EMAIL_MAX} />
        </Field>
      </div>

      {/* Travel History — migrant track only (Migrant / Refugee / Asylum Seeker).
          Submitted with Stage 1 to /travel-history. All fields optional; the
          document details show only when the person has a travel document. */}
      {isMigrant && (
        <div className="space-y-4 rounded-xl border border-line bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-navy-700">{t("fields.travelHistory")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("fields.travelHistoryHint")}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("fields.firstDateOfEntry")} optional>
              <DateInput
                name="firstDateOfEntry"
                minDate={typeof data.dob === "string" && data.dob ? data.dob : undefined}
              />
            </Field>
          </div>
          {/* Entry route: through a neighbouring country (land border → one of
              the 8 transit countries) OR an air/sea port ("International" → any
              other country as the Home Country). Then the point-of-entry border. */}
          <EntryCountryField />
          {/* Point of entry — chosen from the borders lookup; "Others" reveals a
              free-text field for a border not in the list. */}
          <Field label={t("fields.pointOfEntry")} optional>
            <PointOfEntryField />
          </Field>

          <div>
            <span className="block text-sm font-medium text-ink">{t("fields.hasTravelDoc")}</span>
            <div className="mt-2 flex gap-6">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="hasTravelDoc"
                    checked={data.hasTravelDoc === v}
                    onChange={() => set("hasTravelDoc", v)}
                    className="h-4 w-4 accent-navy-700"
                  />
                  {t(v ? "fields.yes" : "fields.no")}
                </label>
              ))}
            </div>
          </div>

          {data.hasTravelDoc === true && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelDocType")} required>
                  {/* Foreign National Travel Document lookup — the selected name
                      is sent as the free-text `documentType`. */}
                  <Select name="travelDocType" placeholder={t("fields.phTravelDocType")} options={travelDocTypes} loading={travelDocLoading} />
                </Field>
                <Field label={t("fields.travelDocNo")} optional>
                  <TextInput name="travelDocNo" placeholder={t("fields.phDocNumber")} allowChars="A-Za-z0-9" maxLength={RULES.TRAVEL_DOC_NO_MAX} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelIssuedDate")} optional>
                  <DateInput
                    name="travelIssuedDate"
                    minDate={typeof data.dob === "string" && data.dob ? data.dob : undefined}
                  />
                </Field>
                <Field label={t("fields.travelExpiryDate")} optional>
                  {/* Expiry must be ≥ DOB + 1 month, and may be in the future —
                      calendar year grid ends at maxDate (defaulting to today). */}
                  <DateInput
                    name="travelExpiryDate"
                    minDate={
                      typeof data.dob === "string" && data.dob
                        ? addMonthsIso(data.dob, 1) || undefined
                        : undefined
                    }
                    maxDate={`${currentYear + 10}-12-31`}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("fields.travelIssueCountry")} optional>
                  <CountrySelect name="travelIssueCountry" placeholder={t("fields.phCountryNat")} />
                </Field>
                <Field label={t("fields.travelIssueAuthority")} optional>
                  <TextInput name="travelIssueAuthority" placeholder={t("fields.phTravelIssueAuthority")} maxLength={RULES.TRAVEL_ISSUE_AUTHORITY_MAX} />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}