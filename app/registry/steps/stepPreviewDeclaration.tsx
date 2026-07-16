"use client";

import { useEffect, useState } from "react";
import { useWizard } from "@/components/registry/field";
import { useI18n } from "@/app/i18n/localeProvider";
import { loadProfile } from "@/lib/auth/profile";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { getStage9Preview } from "@/lib/api/registration";
import { SessionExpiredError } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import {
  documentTypeOptions,
  usePersonDocumentTypeOptions,
  useRelationshipTypeOptions,
  useOccupationTypeOptions,
} from "@/components/registry/blocks";
import { useLookup } from "@/components/lookup/useLookup";
import { getEducationLevels, getMaritalStatuses } from "@/lib/api/lookup";

/** The same document-type labels used in the identification documents repeater
 * on Personal Information and Parents, keyed by the form value. */
/** First letter of each word capitalised, the rest lower-cased. Used for the
 * lookup-sourced values the backend returns in UPPERCASE (regions, wards, …). */
function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Look up a label from a { value, label } options array. */
function optionLabel(
  options: { value: string; label: string }[],
  value: string,
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

function PreviewSection({
  title,
  step,
  onEdit,
  photo,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  photo?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-xl border border-line bg-surface/30">
      <div className="flex items-end justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="font-display text-sm font-bold text-navy-700">{title}</h3>
        <div className="flex shrink-0 items-end gap-3">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Passport photo"
              className="h-24 w-20 rounded-md border border-line object-cover shadow-sm"
            />
          )}
          <button
            type="button"
            onClick={() => onEdit(step)}
            className="rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-surface"
          >
            {t("registry.previewEdit")}
          </button>
        </div>
      </div>
      <dl className="divide-y divide-line px-4 py-2">{children}</dl>
    </section>
  );
}

function PreviewRow({
  label,
  value,
  preserveCase = false,
}: {
  label: string;
  value: string;
  /** Keep the original casing (e.g. email addresses); everything else renders
   * in CAPITALS, matching the all-uppercase data returned by the preview API. */
  preserveCase?: boolean;
}) {
  // Empty fields are omitted from the preview entirely.
  if (!value || !value.trim()) return null;
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-2 sm:gap-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`text-sm text-ink${preserveCase ? "" : " uppercase"}`}>{value}</dd>
    </div>
  );
}

function PreviewSubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-700/60">
        {children}
      </p>
    </div>
  );
}

export default function StepPreviewDeclaration() {
  const { t } = useI18n();
  const { data, set, isMigrant, onGoToStep, onSessionExpired } = useWizard();

  const s = (key: string) => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const genderLabel = (v: string) =>
    v === "M" ? t("opt.male") : v === "F" ? t("opt.female") : v === "O" ? t("opt.other") : v;

  // Identification-document type names come from the same per-person lookup that
  // populated the Stage 1/3 dropdowns (option value = documentTypeId). Used to
  // show the document NAME in the preview instead of the raw type id.
  const applicantDocOptions = usePersonDocumentTypeOptions("applicant");
  const fatherDocOptions = usePersonDocumentTypeOptions("father");
  const motherDocOptions = usePersonDocumentTypeOptions("mother");

  // Translate id/enum-coded values (fetched by id) to readable labels.
  const { options: eduLevels } = useLookup(getEducationLevels, []);
  const eduLevelName = (id: string) =>
    id ? titleCase(eduLevels.find((o) => String(o.id) === id)?.name ?? id) : "";
  const { options: maritalOptions } = useLookup(getMaritalStatuses, []);
  const MARITAL_LABELS: Record<string, string> = {
    SINGLE: t("opt.single"),
    MARRIED: t("opt.married"),
    DIVORCED: t("opt.divorced"),
    WIDOWED: t("opt.widowed"),
  };
  const maritalLabel = (v: string) => {
    if (!v) return "";
    // v may be a lookup id ("1"), an enum ("SINGLE") or a legacy label ("Single").
    const name = (maritalOptions.find((o) => String(o.id) === v)?.name ?? v).toUpperCase();
    return MARITAL_LABELS[name] ?? name.charAt(0) + name.slice(1).toLowerCase();
  };
  const fullName = (prefix: string) =>
    [s(`${prefix}First`), s(`${prefix}Middle`), s(`${prefix}Last`)].filter(Boolean).join(" ");

  // Lookup-driven relationship/occupation options (the backend ids don't match
  // the static 1–8 lists, so resolve via the lookup), title-cased.
  const relationshipOpts = useRelationshipTypeOptions();
  const occupationOpts = useOccupationTypeOptions();
  const optLabel = (opts: { value: string; label: string }[], v: string) =>
    v ? titleCase(opts.find((o) => o.value === v)?.label ?? v) : "";

  // Split a cascade (Country → Region → District → Ward → Street) into separate
  // rows, each value title-cased. Empty rows are dropped by PreviewRow. `extras`
  // are appended (village / city / house number / postal code).
  const cascadeRows = (p: string, extras?: React.ReactNode) => (
    <>
      <PreviewRow label={t("preview.country")} value={titleCase(s(`${p}Country`))} />
      <PreviewRow label={t("preview.region")} value={titleCase(s(`${p}Region`))} />
      <PreviewRow label={t("preview.district")} value={titleCase(s(`${p}District`))} />
      <PreviewRow label={t("preview.ward")} value={titleCase(s(`${p}Ward`))} />
      <PreviewRow label={t("preview.street")} value={titleCase(s(`${p}Street`))} />
      {extras}
    </>
  );

  const prof = typeof window !== "undefined" ? loadProfile() : null;
  const profileName = prof ? [prof.firstName, prof.middleName, prof.lastName].filter(Boolean).join(" ") : "";
  const applicantName = fullName("applicant") || profileName || "—";
  const gender = s("gender") ? genderLabel(s("gender")) : "—";
  const agreed = data.agree === true;

  // Family data
  const hasChildren = data.hasChildren === true;
  const isMarried = data.isMarried === true;
  const relativeCount = Math.max(2, Number(data.relativeCount) || 2);
  const spouseCount = Math.max(1, Number(data.spouseCount) || 1);
  const childCount = Math.max(1, Number(data.childCount) || 1);

  // Fetch the server-compiled summary so the applicant reviews exactly what the
  // backend has stored, and any compilation error surfaces before submitting.
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const subjectId = loadRegistrationFor(loadProfile()?.profileId ?? "")?.subjectId ?? "";
      if (!subjectId) {
        if (active) setPreviewState("ready");
        return;
      }
      try {
        await getStage9Preview(subjectId);
        if (active) setPreviewState("ready");
      } catch (err) {
        if (!active) return;
        // An expired session must trigger the blocking sign-in flow, not sit as
        // an inline message on a page full of stale data.
        if (err instanceof SessionExpiredError) {
          onSessionExpired?.();
          return;
        }
        setPreviewError(getErrorMessage(err, t("registry.previewLoadError")));
        setPreviewState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  function edit(step: number) {
    onGoToStep?.(step);
  }

  return (
    <div className="space-y-5">
      {previewState === "loading" && (
        <p className="rounded-lg border border-line bg-surface/40 px-4 py-3 text-sm text-muted">
          {t("registry.previewLoading")}
        </p>
      )}
      {previewState === "error" && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {previewError}
        </p>
      )}

      {/* ─── Step 1: Personal Information ─── */}
      <PreviewSection
        title={t("registry.s1Title")}
        step={1}
        onEdit={edit}
        photo={s("passportPhotoData") || s("stage1PhotoData") || undefined}
      >
        <PreviewRow label={t("preview.fullName")} value={applicantName} />
        <PreviewRow label={t("preview.gender")} value={gender} />
        <PreviewRow label={t("preview.dob")} value={s("dob")} />
        <PreviewRow label={t("preview.maritalStatus")} value={maritalLabel(s("marriage"))} />
        <PreviewRow label={t("preview.nationality")} value={s("nationalityCountry")} />
        <PreviewRow label={t("preview.phone")} value={s("phone")} />
        <PreviewRow label={t("preview.email")} value={s("email")} preserveCase />

        {/* Identification documents (dynamic repeater) */}
        {(() => {
          const count = Math.max(1, Number(data.idDocCount) || 1);
          return Array.from({ length: count }, (_, i) => i + 1)
            .filter((n) => s(`idDoc${n}Type`))
            .map((n) => (
              <PreviewRow
                key={`adoc${n}`}
                label={`${t("preview.document")} ${count > 1 ? n : ""}`}
                value={`${optionLabel(applicantDocOptions, s(`idDoc${n}Type`))}: ${s(`idDoc${n}Number`)}`}
              />
            ));
        })()}

        <PreviewSubTitle>{t("preview.placeOfBirth")}</PreviewSubTitle>
        <PreviewRow label={t("preview.countryOfBirth")} value={s("pobCountry")} />
        <PreviewRow label={t("preview.region")} value={titleCase(s("pobRegion"))} />
        <PreviewRow label={t("preview.district")} value={titleCase(s("pobDistrict"))} />
        <PreviewRow label={t("preview.ward")} value={titleCase(s("pobWard"))} />
        <PreviewRow label={t("preview.street")} value={titleCase(s("pobStreet"))} />
        <PreviewRow label={t("preview.villageStreet")} value={s("pobCityVillage")} />

        {/* Physical characteristics (v002) — shown for any category when filled. */}
        {["otherNames", "tribe", "eyeColor", "hairColor", "heightCm", "specialMark", "languageSpoken"]
          .some((k) => s(k)) && (
          <>
            <PreviewSubTitle>{t("fields.physicalCharacteristics")}</PreviewSubTitle>
            <PreviewRow label={t("fields.otherNames")} value={s("otherNames")} />
            <PreviewRow label={t("fields.tribe")} value={s("tribe")} />
            <PreviewRow label={t("fields.eyeColor")} value={s("eyeColor")} />
            <PreviewRow label={t("fields.hairColor")} value={s("hairColor")} />
            <PreviewRow label={t("fields.heightCm")} value={s("heightCm")} />
            <PreviewRow label={t("fields.specialMark")} value={s("specialMark")} />
            <PreviewRow label={t("fields.languageSpoken")} value={s("languageSpoken")} />
          </>
        )}

        {/* Travel History (migrant flow) — shown when filled. */}
        {isMigrant &&
          ["pointOfEntry", "transitCountry", "firstDateOfEntry"].some((k) => s(k)) && (
          <>
            <PreviewSubTitle>{t("fields.travelHistory")}</PreviewSubTitle>
            <PreviewRow label={t("fields.firstDateOfEntry")} value={s("firstDateOfEntry")} />
            <PreviewRow label={t("fields.pointOfEntry")} value={s("pointOfEntry")} />
            <PreviewRow label={t("fields.transitCountry")} value={s("transitCountry")} />
            {data.hasTravelDoc === true && (
              <>
                <PreviewRow label={t("fields.travelDocType")} value={s("travelDocType")} />
                <PreviewRow label={t("fields.travelDocNo")} value={s("travelDocNo")} />
                <PreviewRow label={t("fields.travelIssuedDate")} value={s("travelIssuedDate")} />
                <PreviewRow label={t("fields.travelExpiryDate")} value={s("travelExpiryDate")} />
                <PreviewRow label={t("fields.travelIssueCountry")} value={s("travelIssueCountry")} />
                <PreviewRow label={t("fields.travelIssueAuthority")} value={s("travelIssueAuthority")} />
              </>
            )}
          </>
        )}

        {s("citizenshipTypeId") === "3" && (
          <>
            <PreviewSubTitle>{t("preview.naturalization")}</PreviewSubTitle>
            <PreviewRow label={t("preview.certNo")} value={s("naturalizationCertNo")} />
            <PreviewRow label={t("preview.issuePlace")} value={s("naturalizationPlace")} />
            <PreviewRow label={t("preview.issueDate")} value={s("naturalizationDate")} />
          </>
        )}
      </PreviewSection>

      {/* ─── Step 2: Address ─── */}
      <PreviewSection title={t("registry.s2Title")} step={2} onEdit={edit}>
        <PreviewSubTitle>{t("preview.currentAddress")}</PreviewSubTitle>
        {cascadeRows(
          "cur",
          <>
            <PreviewRow label={t("preview.city")} value={titleCase(s("curCity"))} />
            <PreviewRow label={t("preview.houseNumber")} value={s("curHouseNumber")} />
            <PreviewRow label={t("preview.postalCode")} value={s("curPostalCode")} />
          </>,
        )}

        <PreviewSubTitle>{t("preview.permanentAddress")}</PreviewSubTitle>
        {data.sameAsPerm === true ? (
          <PreviewRow
            label={t("preview.permanentAddress")}
            value={t("registry.sameAsPerm")}
          />
        ) : (
          cascadeRows(
            "perm",
            <>
              <PreviewRow label={t("preview.city")} value={titleCase(s("permCity"))} />
              <PreviewRow label={t("preview.houseNumber")} value={s("permHouseNumber")} />
              <PreviewRow label={t("preview.postalCode")} value={s("permPostalCode")} />
            </>,
          )
        )}

        {/* Refugee/settlement camp + dwelling description (migrant flow) — when filled. */}
        {isMigrant && (s("campName") || s("properties")) && (
          <>
            <PreviewSubTitle>{t("fields.campName")}</PreviewSubTitle>
            <PreviewRow label={t("fields.campName")} value={s("campName")} />
            <PreviewRow label={t("fields.properties")} value={s("properties")} />
          </>
        )}
      </PreviewSection>

      {/* ─── Step 3: Parents Information ─── */}
      <PreviewSection title={t("registry.s3Title")} step={3} onEdit={edit}>
        <PreviewSubTitle>{t("preview.father")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("father")} />
        <PreviewRow label={t("preview.dob")} value={s("fatherDob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("fatherGender"))} />
        <PreviewRow label={t("preview.phone")} value={s("fatherPhone")} />
        <PreviewRow label={t("preview.nationality")} value={s("fatherNatCountry")} />
        <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
        {cascadeRows("fatherRes", <PreviewRow label={t("preview.city")} value={titleCase(s("fatherResCity"))} />)}
        {(() => {
          const count = Math.max(1, Number(data.fatherIdDocCount) || 1);
          return Array.from({ length: count }, (_, i) => i + 1)
            .filter((n) => s(`fatherIdDoc${n}Type`))
            .map((n) => (
              <PreviewRow
                key={`fdoc${n}`}
                label={`${t("preview.document")} ${count > 1 ? n : ""}`}
                value={`${optionLabel(fatherDocOptions, s(`fatherIdDoc${n}Type`))}: ${s(`fatherIdDoc${n}Number`)}`}
              />
            ));
        })()}

        <PreviewSubTitle>{t("preview.mother")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("mother")} />
        <PreviewRow label={t("preview.dob")} value={s("motherDob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("motherGender"))} />
        <PreviewRow label={t("preview.phone")} value={s("motherPhone")} />
        <PreviewRow label={t("preview.nationality")} value={s("motherNatCountry")} />
        <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
        {cascadeRows("motherRes", <PreviewRow label={t("preview.city")} value={titleCase(s("motherResCity"))} />)}
        {(() => {
          const count = Math.max(1, Number(data.motherIdDocCount) || 1);
          return Array.from({ length: count }, (_, i) => i + 1)
            .filter((n) => s(`motherIdDoc${n}Type`))
            .map((n) => (
              <PreviewRow
                key={`mdoc${n}`}
                label={`${t("preview.document")} ${count > 1 ? n : ""}`}
                value={`${optionLabel(motherDocOptions, s(`motherIdDoc${n}Type`))}: ${s(`motherIdDoc${n}Number`)}`}
              />
            ));
        })()}
      </PreviewSection>

      {/* ─── Step 4: Education & Employment ─── */}
      <PreviewSection title={t("registry.s4Title")} step={4} onEdit={edit}>
        {data.neverAttendedSchool === true ? (
          <PreviewRow label={t("preview.education")} value={t("registry.neverAttendedSchool")} />
        ) : (
          Array.from({ length: Math.max(1, Number(data.eduCount) || 1) }, (_, i) => i + 1)
            .filter((n) => s(`edu${n}School`))
            .map((n) => (
              <PreviewRow
                key={n}
                label={t("fields.schoolN").replace("{n}", String(n))}
                value={[
                  s(`edu${n}Level`) ? `${t("preview.level")}: ${eduLevelName(s(`edu${n}Level`))}` : "",
                  s(`edu${n}School`),
                  s(`edu${n}Year`) ? `(${s(`edu${n}Year`)})` : "",
                  s(`edu${n}District`),
                  s(`edu${n}IndexNo`) ? `${t("preview.index")}: ${s(`edu${n}IndexNo`)}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))
        )}
        <PreviewSubTitle>{t("preview.employment")}</PreviewSubTitle>
        <PreviewRow label={t("preview.employmentStatus")} value={s("jobStatus")} />
        <PreviewRow label={t("preview.occupation")} value={s("occupation") === "19" ? s("otherOccupation") : optLabel(occupationOpts, s("occupation"))} />
        <PreviewRow label={t("preview.employer")} value={s("employer")} />
      </PreviewSection>

      {/* ─── Step 5: Emergency Contacts ─── */}
      <PreviewSection title={t("registry.s5Title")} step={5} onEdit={edit}>
        <PreviewSubTitle>{t("fields.emergencyContactN").replace("{n}", "1")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("ec1")} />
        <PreviewRow label={t("preview.relationship")} value={optLabel(relationshipOpts,s("ec1RelType"))} />
        <PreviewRow label={t("preview.occupation")} value={optLabel(occupationOpts,s("ec1OccType"))} />
        <PreviewRow label={t("preview.dob")} value={s("ec1Dob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("ec1Gender"))} />
        <PreviewRow label={t("preview.phone")} value={s("ec1Phone")} />
        <PreviewRow label={t("preview.nationality")} value={s("ec1NatCountry")} />
        {/* Emergency contacts do NOT collect place of birth — only residence. */}
        <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
        {cascadeRows("ec1Res", <PreviewRow label={t("preview.city")} value={titleCase(s("ec1ResCity"))} />)}
        {s("ec1DocType") && (
          <PreviewRow
            label={t("preview.document")}
            value={`${optionLabel(documentTypeOptions(t), s("ec1DocType"))}: ${s("ec1DocNumber")}`}
          />
        )}

        <PreviewSubTitle>{t("fields.emergencyContactN").replace("{n}", "2")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("ec2")} />
        <PreviewRow label={t("preview.relationship")} value={optLabel(relationshipOpts,s("ec2RelType"))} />
        <PreviewRow label={t("preview.occupation")} value={optLabel(occupationOpts,s("ec2OccType"))} />
        <PreviewRow label={t("preview.dob")} value={s("ec2Dob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("ec2Gender"))} />
        <PreviewRow label={t("preview.phone")} value={s("ec2Phone")} />
        <PreviewRow label={t("preview.nationality")} value={s("ec2NatCountry")} />
        {/* Emergency contacts do NOT collect place of birth — only residence. */}
        <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
        {cascadeRows("ec2Res", <PreviewRow label={t("preview.city")} value={titleCase(s("ec2ResCity"))} />)}
        {s("ec2DocType") && (
          <PreviewRow
            label={t("preview.document")}
            value={`${optionLabel(documentTypeOptions(t), s("ec2DocType"))}: ${s("ec2DocNumber")}`}
          />
        )}
      </PreviewSection>

      {/* ─── Step 6: Family ─── */}
      <PreviewSection title={t("registry.s6Title")} step={6} onEdit={edit}>
        <PreviewRow label={t("preview.hasChildren")} value={hasChildren ? t("registry.yes") : t("registry.no")} />
        <PreviewRow label={t("preview.currentlyMarried")} value={isMarried ? t("registry.yes") : t("registry.no")} />

        {isMarried &&
          Array.from({ length: spouseCount }, (_, i) => i + 1)
            .filter((n) => s(`sp${n}First`))
            .map((n) => (
              <div key={`sp${n}`}>
                <PreviewSubTitle>{t("fields.spouseN").replace("{n}", String(n))}</PreviewSubTitle>
                <PreviewRow label={t("preview.fullName")} value={fullName(`sp${n}`)} />
                <PreviewRow label={t("preview.dob")} value={s(`sp${n}Dob`)} />
                <PreviewRow label={t("preview.gender")} value={genderLabel(s(`sp${n}Gender`))} />
                <PreviewRow label={t("preview.phone")} value={s(`sp${n}Phone`)} />
                <PreviewRow label={t("preview.nationality")} value={s(`sp${n}NatCountry`)} />
                <PreviewRow label={t("preview.occupation")} value={optLabel(occupationOpts,s(`sp${n}OccType`))} />
                {/* Family members do NOT collect place of birth — only residence. */}
                <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
                {cascadeRows(`sp${n}Res`, <PreviewRow label={t("preview.city")} value={titleCase(s(`sp${n}ResCity`))} />)}
              </div>
            ))}

        {hasChildren &&
          Array.from({ length: childCount }, (_, i) => i + 1)
            .filter((n) => s(`ch${n}First`))
            .map((n) => (
              <div key={`ch${n}`}>
                <PreviewSubTitle>{t("fields.childN").replace("{n}", String(n))}</PreviewSubTitle>
                <PreviewRow label={t("preview.fullName")} value={fullName(`ch${n}`)} />
                <PreviewRow label={t("preview.dob")} value={s(`ch${n}Dob`)} />
                <PreviewRow label={t("preview.gender")} value={genderLabel(s(`ch${n}Gender`))} />
                <PreviewRow label={t("preview.phone")} value={s(`ch${n}Phone`)} />
                <PreviewRow label={t("preview.nationality")} value={s(`ch${n}NatCountry`)} />
                {/* Family members do NOT collect place of birth — only residence. */}
                <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
                {cascadeRows(`ch${n}Res`, <PreviewRow label={t("preview.city")} value={titleCase(s(`ch${n}ResCity`))} />)}
              </div>
            ))}

        {Array.from({ length: relativeCount }, (_, i) => i + 1)
          .filter((n) => s(`rel${n}First`))
          .map((n) => (
            <div key={`rel${n}`}>
              <PreviewSubTitle>{t("fields.relativeN").replace("{n}", String(n))}</PreviewSubTitle>
              <PreviewRow label={t("preview.fullName")} value={fullName(`rel${n}`)} />
              <PreviewRow label={t("preview.relationship")} value={optLabel(relationshipOpts,s(`rel${n}RelType`))} />
              <PreviewRow label={t("preview.dob")} value={s(`rel${n}Dob`)} />
              <PreviewRow label={t("preview.gender")} value={genderLabel(s(`rel${n}Gender`))} />
              <PreviewRow label={t("preview.phone")} value={s(`rel${n}Phone`)} />
              <PreviewRow label={t("preview.nationality")} value={s(`rel${n}NatCountry`)} />
              <PreviewRow label={t("preview.occupation")} value={optLabel(occupationOpts,s(`rel${n}OccType`))} />
              {/* Family members do NOT collect place of birth — only residence. */}
              <PreviewSubTitle>{t("preview.residence")}</PreviewSubTitle>
              {cascadeRows(`rel${n}Res`, <PreviewRow label={t("preview.city")} value={titleCase(s(`rel${n}ResCity`))} />)}
            </div>
          ))}
      </PreviewSection>

      {/* ─── Official Clause ─── */}
      <div className="rounded-xl border border-line bg-surface/60 p-6">
        <h3 className="font-display text-base font-bold text-navy-700">
          {t("registry.clauseTitle")}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("registry.clauseText").replace("{name}", applicantName)}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input-line bg-card p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => set("agree", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input-line accent-navy-700"
        />
        <span className="text-sm font-medium text-ink">{t("registry.agree")}</span>
      </label>
    </div>
  );
}
