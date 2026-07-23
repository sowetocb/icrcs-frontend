"use client";

import { Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useRelationshipTypeOptions,
  useOccupationTypeOptions,
} from "@/components/registry/blocks";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import { useI18n } from "@/app/i18n/localeProvider";
import { RULES } from "@/lib/validation/rules";
import { Plus, X } from "lucide-react";

/**
 * A single emergency contact block matching the Stage 5 API:
 *   { relationshipTypeId, occupationTypeId, person: { ...full person... } }
 */
function ContactBlock({ prefix, index }: { prefix: string; index: number }) {
  const { t } = useI18n();
  const { data } = useWizard();
  const genders = useGenderOptions();
  const relationships = useRelationshipTypeOptions();
  const occupations = useOccupationTypeOptions();

  // Residence: cascade for Tanzania, free-text city for any other country.
  const resCountry = typeof data[`${prefix}ResCountry`] === "string" ? (data[`${prefix}ResCountry`] as string).trim() : "";
  const resIsTz = resCountry === "Tanzania";
  const resIsForeign = resCountry !== "" && !resIsTz;

  return (
    <div className="space-y-5">
      <h3 className="font-display text-base font-bold text-navy-700">
        {t(index === 1 ? "fields.emergencyContact1" : "fields.emergencyContact2")}
        {/* Only one contact is required; the second is optional (but must be
            completed once started). */}
        {index === 2 && (
          <span className="ml-2 text-sm font-normal text-muted">({t("fields.optional")})</span>
        )}
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.relationship")} required>
          <Select
            name={`${prefix}RelType`}
            placeholder={t("fields.phSelectRelationship")}
            options={relationships}
          />
        </Field>
        <Field label={t("fields.occupation")} optional>
          <Select
            name={`${prefix}OccType`}
            placeholder={t("fields.phSelectOccupation")}
            options={occupations}
          />
        </Field>
      </div>

      {/* Person details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.middleName")} optional>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} lettersOnly maxLength={RULES.UI_NAME_MAX} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.gender")} required>
          <Select name={`${prefix}Gender`} placeholder={t("fields.phSelect")} options={genders} />
        </Field>
        <Field label={t("fields.phone")} required>
          <PhoneInput name={`${prefix}Phone`} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.nationality")} required>
          <CountrySelect name={`${prefix}NatCountry`} placeholder={t("fields.phCountry")} />
        </Field>
      </div>

      <Field label={t("fields.residence")} required>
        <div className="space-y-3">
          <WardCascade prefix={`${prefix}Res`} showStreet />
          {resIsForeign && (
            <Field label={t("fields.phCity")}>
              <TextInput name={`${prefix}ResCity`} placeholder={t("fields.phCity")} lettersOnly maxLength={RULES.UI_CITY_MAX} />
            </Field>
          )}
        </div>
      </Field>
    </div>
  );
}

export default function StepEmergency() {
  const { data, set, setQuiet } = useWizard();
  const { t } = useI18n();

  // The 2nd contact is optional and hidden until the user adds it (or it already
  // has data from a resumed draft).
  const ec2Shown =
    data.ec2Added === true ||
    (typeof data.ec2First === "string" && data.ec2First.trim() !== "");

  function removeEc2() {
    set("ec2Added", false);
    for (const k of Object.keys(data)) if (k.startsWith("ec2")) setQuiet(k, "");
  }

  // At least one emergency contact is ALWAYS required (backend minimum is 1) —
  // for every flow, including migrants. So the stage renders the form directly
  // with no "do you have this?" gate question.
  return (
    <div className="space-y-8">
      <ContactBlock prefix="ec1" index={1} />
      {ec2Shown ? (
        <>
          <hr className="border-line" />
          <div className="space-y-3">
            <ContactBlock prefix="ec2" index={2} />
            <button
              type="button"
              onClick={removeEc2}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger transition hover:opacity-80"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
              {t("fields.remove")}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => set("ec2Added", true)}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          {t("fields.addEmergencyContact")}
        </button>
      )}
    </div>
  );
}
