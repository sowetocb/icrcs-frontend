"use client";

import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import {
  useGenderOptions,
  useRelationshipTypeOptions,
  useOccupationTypeOptions,
} from "@/components/registry/blocks";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import { useI18n } from "@/app/i18n/localeProvider";

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

  // Place of birth / residence: the cascade only applies when Tanzania is
  // explicitly picked. City/village shows only for an explicit foreign country.
  const pobCountry = typeof data[`${prefix}PobCountry`] === "string" ? (data[`${prefix}PobCountry`] as string).trim() : "";
  const pobIsTz = pobCountry === "Tanzania";
  const pobIsForeign = pobCountry !== "" && !pobIsTz;

  const resCountry = typeof data[`${prefix}ResCountry`] === "string" ? (data[`${prefix}ResCountry`] as string).trim() : "";
  const resIsTz = resCountry === "Tanzania";
  const resIsForeign = resCountry !== "" && !resIsTz;

  return (
    <div className="space-y-5">
      <h3 className="font-display text-base font-bold text-navy-700">
        {t(index === 1 ? "fields.emergencyContact1" : "fields.emergencyContact2")}
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
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} lettersOnly />
        </Field>
        <Field label={t("fields.middleName")} required>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} lettersOnly />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} lettersOnly />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.dob")} optional>
          <DateInput name={`${prefix}Dob`} />
        </Field>
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

      {/* Place of Birth and Residence are stacked (not side by side) so the two
          identical cascades can't be confused. */}
      <Field label={t("fields.placeOfBirth")} optional>
        <div className="space-y-3">
          <WardCascade prefix={`${prefix}Pob`} showStreet={pobIsTz} />
          {pobIsForeign && (
            <Field label={t("fields.phVillage")}>
              <TextInput name={`${prefix}Village`} placeholder={t("fields.phVillage")} lettersOnly />
            </Field>
          )}
        </div>
      </Field>
      <Field label={t("fields.residence")} required>
        <div className="space-y-3">
          <WardCascade prefix={`${prefix}Res`} showStreet />
          {resIsForeign && (
            <Field label={t("fields.phCity")}>
              <TextInput name={`${prefix}ResCity`} placeholder={t("fields.phCity")} lettersOnly />
            </Field>
          )}
        </div>
      </Field>
    </div>
  );
}

export default function StepEmergency() {
  return (
    <div className="space-y-8">
      <ContactBlock prefix="ec1" index={1} />
      <hr className="border-line" />
      <ContactBlock prefix="ec2" index={2} />
    </div>
  );
}
