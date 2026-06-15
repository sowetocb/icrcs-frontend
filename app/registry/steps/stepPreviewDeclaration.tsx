"use client";

import { useEffect, useState } from "react";
import { useWizard } from "@/components/registry/field";
import { useI18n } from "@/app/i18n/localeProvider";
import { parseAttachments, type Attachment } from "./stepAttachments";
import { loadProfile } from "@/lib/auth/profile";
import { loadRegistrationFor } from "@/app/registry/registrationStore";
import { getStage9Preview } from "@/lib/api/registration";
import { getErrorMessage } from "@/lib/api/client";
import {
  relationshipTypeOptions,
  occupationTypeOptions,
  documentTypeOptions,
} from "@/components/registry/blocks";

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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-2 sm:gap-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
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
  const { data, set, onGoToStep } = useWizard();

  const s = (key: string) => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const genderLabel = (v: string) =>
    v === "M" ? t("opt.male") : v === "F" ? t("opt.female") : v === "O" ? t("opt.other") : v;
  const fullName = (prefix: string) =>
    [s(`${prefix}First`), s(`${prefix}Middle`), s(`${prefix}Last`)].filter(Boolean).join(" ");
  const address = (prefix: string) =>
    [
      s(`${prefix}HouseNumber`),
      s(`${prefix}Ward`),
      s(`${prefix}District`),
      s(`${prefix}Region`),
      s(`${prefix}Country`),
    ]
      .filter(Boolean)
      .join(", ");
  const pobAddress = (prefix: string) =>
    [
      s(`${prefix}PobWard`),
      s(`${prefix}PobDistrict`),
      s(`${prefix}PobRegion`),
      s(`${prefix}PobCountry`),
    ].filter(Boolean).join(", ");
  const resAddress = (prefix: string) =>
    [
      s(`${prefix}ResStreet`),
      s(`${prefix}ResCity`),
      s(`${prefix}ResWard`),
      s(`${prefix}ResDistrict`),
      s(`${prefix}ResRegion`),
      s(`${prefix}ResCountry`),
    ].filter(Boolean).join(", ");

  const prof = typeof window !== "undefined" ? loadProfile() : null;
  const profileName = prof ? [prof.firstName, prof.middleName, prof.lastName].filter(Boolean).join(" ") : "";
  const applicantName = fullName("applicant") || profileName || "—";
  const gender = s("gender") ? genderLabel(s("gender")) : "—";
  const attachments = parseAttachments(data.attachments);
  const agreed = data.agree === true;

  // Family data
  const hasChildren = data.hasChildren === true;
  const isMarried = data.isMarried === true;
  const relativeCount = Math.max(2, Number(data.relativeCount) || 2);
  const spouseCount = Math.max(1, Number(data.spouseCount) || 1);

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
        photo={s("passportPhotoData") || undefined}
      >
        <PreviewRow label={t("preview.fullName")} value={applicantName} />
        <PreviewRow label={t("preview.gender")} value={gender} />
        <PreviewRow label={t("preview.dob")} value={s("dob")} />
        <PreviewRow label={t("preview.nationality")} value={s("nationalityCountry")} />
        <PreviewRow label={t("preview.countryOfBirth")} value={s("pobCountry")} />
        <PreviewRow label={t("preview.region")} value={s("pobRegion")} />
        <PreviewRow label={t("preview.district")} value={s("pobDistrict")} />
        <PreviewRow label={t("preview.ward")} value={s("pobWard")} />
        <PreviewRow label={t("preview.villageStreet")} value={s("pobVillage")} />
        <PreviewRow label={t("preview.birthCertNo")} value={s("birthCertNo")} />
        <PreviewRow label={t("preview.maritalStatus")} value={s("marriage")} />
        <PreviewRow label={t("preview.phone")} value={s("phone")} />
        <PreviewRow label={t("preview.email")} value={s("email")} />
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
        <PreviewRow label={t("preview.currentAddress")} value={address("cur")} />
        <PreviewRow label={t("preview.postalCode")} value={s("curPostalCode")} />

        <PreviewSubTitle>{t("preview.permanentAddress")}</PreviewSubTitle>
        {data.sameAsPerm === true ? (
          <PreviewRow
            label={t("preview.permanentAddress")}
            value={`${address("cur")} (${t("registry.sameAsPerm")})`}
          />
        ) : (
          <>
            <PreviewRow label={t("preview.permanentAddress")} value={address("perm")} />
            <PreviewRow label={t("preview.postalCode")} value={s("permPostalCode")} />
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
        <PreviewRow label={t("preview.placeOfBirth")} value={pobAddress("father")} />
        <PreviewRow label={t("preview.village")} value={s("fatherVillage")} />
        <PreviewRow label={t("preview.residence")} value={resAddress("father")} />
        {s("fatherDocType") && (
          <PreviewRow
            label={t("preview.document")}
            value={`${optionLabel(documentTypeOptions(t), s("fatherDocType"))}: ${s("fatherDocNumber")}`}
          />
        )}

        <PreviewSubTitle>{t("preview.mother")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("mother")} />
        <PreviewRow label={t("preview.dob")} value={s("motherDob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("motherGender"))} />
        <PreviewRow label={t("preview.phone")} value={s("motherPhone")} />
        <PreviewRow label={t("preview.nationality")} value={s("motherNatCountry")} />
        <PreviewRow label={t("preview.placeOfBirth")} value={pobAddress("mother")} />
        <PreviewRow label={t("preview.village")} value={s("motherVillage")} />
        <PreviewRow label={t("preview.residence")} value={resAddress("mother")} />
        {s("motherDocType") && (
          <PreviewRow
            label={t("preview.document")}
            value={`${optionLabel(documentTypeOptions(t), s("motherDocType"))}: ${s("motherDocNumber")}`}
          />
        )}
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
                  s(`edu${n}Level`) ? `${t("preview.level")}: ${s(`edu${n}Level`)}` : "",
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
        <PreviewRow label={t("preview.occupation")} value={optionLabel(occupationTypeOptions(t), s("occupation"))} />
        <PreviewRow label={t("preview.employer")} value={s("employer")} />
        <PreviewRow label={t("preview.nida")} value={s("nidaNumber")} />
      </PreviewSection>

      {/* ─── Step 5: Emergency Contacts ─── */}
      <PreviewSection title={t("registry.s5Title")} step={5} onEdit={edit}>
        <PreviewSubTitle>{t("fields.emergencyContactN").replace("{n}", "1")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("ec1")} />
        <PreviewRow label={t("preview.relationship")} value={optionLabel(relationshipTypeOptions(t), s("ec1RelType"))} />
        <PreviewRow label={t("preview.occupation")} value={optionLabel(occupationTypeOptions(t), s("ec1OccType"))} />
        <PreviewRow label={t("preview.dob")} value={s("ec1Dob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("ec1Gender"))} />
        <PreviewRow label={t("preview.phone")} value={s("ec1Phone")} />
        <PreviewRow label={t("preview.nationality")} value={s("ec1NatCountry")} />
        <PreviewRow label={t("preview.placeOfBirth")} value={pobAddress("ec1")} />
        <PreviewRow label={t("preview.residence")} value={resAddress("ec1")} />
        {s("ec1DocType") && (
          <PreviewRow
            label={t("preview.document")}
            value={`${optionLabel(documentTypeOptions(t), s("ec1DocType"))}: ${s("ec1DocNumber")}`}
          />
        )}

        <PreviewSubTitle>{t("fields.emergencyContactN").replace("{n}", "2")}</PreviewSubTitle>
        <PreviewRow label={t("preview.fullName")} value={fullName("ec2")} />
        <PreviewRow label={t("preview.relationship")} value={optionLabel(relationshipTypeOptions(t), s("ec2RelType"))} />
        <PreviewRow label={t("preview.occupation")} value={optionLabel(occupationTypeOptions(t), s("ec2OccType"))} />
        <PreviewRow label={t("preview.dob")} value={s("ec2Dob")} />
        <PreviewRow label={t("preview.gender")} value={genderLabel(s("ec2Gender"))} />
        <PreviewRow label={t("preview.phone")} value={s("ec2Phone")} />
        <PreviewRow label={t("preview.nationality")} value={s("ec2NatCountry")} />
        <PreviewRow label={t("preview.placeOfBirth")} value={pobAddress("ec2")} />
        <PreviewRow label={t("preview.residence")} value={resAddress("ec2")} />
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
                <PreviewRow label={t("preview.occupation")} value={optionLabel(occupationTypeOptions(t), s(`sp${n}OccType`))} />
              </div>
            ))}

        {Array.from({ length: relativeCount }, (_, i) => i + 1)
          .filter((n) => s(`rel${n}First`))
          .map((n) => (
            <div key={`rel${n}`}>
              <PreviewSubTitle>{t("fields.relativeN").replace("{n}", String(n))}</PreviewSubTitle>
              <PreviewRow label={t("preview.fullName")} value={fullName(`rel${n}`)} />
              <PreviewRow label={t("preview.relationship")} value={optionLabel(relationshipTypeOptions(t), s(`rel${n}RelType`))} />
              <PreviewRow label={t("preview.dob")} value={s(`rel${n}Dob`)} />
              <PreviewRow label={t("preview.gender")} value={genderLabel(s(`rel${n}Gender`))} />
              <PreviewRow label={t("preview.phone")} value={s(`rel${n}Phone`)} />
              <PreviewRow label={t("preview.occupation")} value={optionLabel(occupationTypeOptions(t), s(`rel${n}OccType`))} />
            </div>
          ))}
      </PreviewSection>

      {/* ─── Step 7: Referees (informational) ─── */}

      {/* ─── Step 8: Attachments ─── */}
      <PreviewSection title={t("registry.s8Title")} step={8} onEdit={edit}>
        {attachments.length === 0 ? (
          <PreviewRow label={t("preview.documents")} value={t("registry.attachEmpty")} />
        ) : (
          attachments.map((doc: Attachment) => (
            <PreviewRow key={doc.id} label={t("preview.document")} value={doc.name} />
          ))
        )}
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

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => set("agree", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-navy-700"
        />
        <span className="text-sm font-medium text-ink">{t("registry.agree")}</span>
      </label>
    </div>
  );
}
