"use client";

import { useEffect } from "react";
import { DateInput, Field, Select, TextInput, useWizard } from "@/components/registry/field";
import { useGenderOptions, documentTypeOptions } from "@/components/registry/blocks";
import CountrySelect from "@/components/registry/countrySelect";
import WardCascade from "@/components/registry/wardCascade";
import PhoneInput from "@/components/registry/phoneInput";
import DocumentUpload from "@/components/registry/documentUpload";
import { useI18n } from "@/app/i18n/localeProvider";

/**
 * Expanded parent block matching the Stage 3 API:
 *   name, DOB, gender, phone, nationality, place of birth, residence, document.
 */
function ParentBlock({ prefix, label }: { prefix: string; label: string }) {
  const { t } = useI18n();
  const { data } = useWizard();
  const genders = useGenderOptions();

  // Place of birth / residence: the Region→District→Ward→Street cascade only
  // applies to Tanzania. For any other country the cascade is hidden and a
  // free-text village/city is collected instead. An unset country is Tanzania.
  const pobIsTz = data[`${prefix}PobCountry`] === "Tanzania";
  const resIsTz = data[`${prefix}ResCountry`] === "Tanzania";

  return (
    <div className="space-y-5">
      <h3 className="font-display text-base font-bold text-navy-700">{label}</h3>

      {/* Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.firstName")} required>
          <TextInput name={`${prefix}First`} placeholder={t("fields.phFirst")} />
        </Field>
        <Field label={t("fields.middleName")} required>
          <TextInput name={`${prefix}Middle`} placeholder={t("fields.phMiddle")} />
        </Field>
        <Field label={t("fields.lastName")} required>
          <TextInput name={`${prefix}Last`} placeholder={t("fields.phLast")} />
        </Field>
      </div>

      {/* DOB + Gender + Phone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.dob")} optional>
          <DateInput name={`${prefix}Dob`} />
        </Field>
        <Field label={t("fields.gender")} required>
          <Select name={`${prefix}Gender`} placeholder={t("fields.phSelect")} options={genders} />
        </Field>
        <Field label={t("fields.phone")} optional>
          <PhoneInput name={`${prefix}Phone`} />
        </Field>
      </div>

      {/* Nationality + identification document on one row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("fields.nationality")} required>
          <CountrySelect name={`${prefix}NatCountry`} placeholder={t("fields.phCountryNat")} />
        </Field>
        <Field label={t("fields.docType")} optional>
          <Select name={`${prefix}DocType`} placeholder={t("fields.phSelect")} options={documentTypeOptions(t)} />
        </Field>
        {data[`${prefix}DocType`] && (
          <Field label={t("fields.docNumber")} optional>
            <TextInput name={`${prefix}DocNumber`} placeholder="e.g. 19600310-12345-00001-6" />
          </Field>
        )}
      </div>

      <DocumentUpload prefix={prefix} />

      {/* Place of Birth + Residence side by side */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Field label={t("fields.placeOfBirthRdw")} required>
          <div className="space-y-3">
            <WardCascade prefix={`${prefix}Pob`} showStreet={pobIsTz} />
            {!pobIsTz && (
              <Field label={t("fields.phVillage")}>
                <TextInput name={`${prefix}Village`} placeholder={t("fields.phVillage")} />
              </Field>
            )}
          </div>
        </Field>
        <Field label={t("fields.residence")} required>
          <div className="space-y-3">
            <WardCascade prefix={`${prefix}Res`} showStreet />
            {!resIsTz && (
              <Field label={t("fields.phCity")}>
                <TextInput name={`${prefix}ResCity`} placeholder={t("fields.phCity")} />
              </Field>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}

export default function StepGuardian() {
  const { data, set } = useWizard();
  const { t } = useI18n();

  // Pre-fill gender: father → Male, mother → Female (only if not already set).
  useEffect(() => {
    if (!data.fatherGender) set("fatherGender", "M");
    if (!data.motherGender) set("motherGender", "F");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <ParentBlock prefix="father" label={t("fields.fatherInfo")} />
      <hr className="border-line" />
      <ParentBlock prefix="mother" label={t("fields.motherInfo")} />
    </div>
  );
}
