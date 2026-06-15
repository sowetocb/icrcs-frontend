"use client";

import { useEffect } from "react";
import { Field, TextInput, useWizard } from "@/components/registry/field";
import WardCascade from "@/components/registry/wardCascade";
import { useI18n } from "@/app/i18n/localeProvider";

const ADDR_SUFFIXES = [
  "Country",
  "CountryId",
  "Region",
  "RegionId",
  "District",
  "DistrictId",
  "Ward",
  "WardId",
  "Street",
  "StreetId",
] as const;

export default function StepAddress() {
  const { t } = useI18n();
  const { data, set } = useWizard();
  const sameAsPerm = data.sameAsPerm === true;

  const permValues = ADDR_SUFFIXES.map((s) => data[`perm${s}`]);

  // Mirror permanent → current while linked.
  useEffect(() => {
    if (!sameAsPerm) return;
    ADDR_SUFFIXES.forEach((suffix, idx) => {
      const permVal = permValues[idx];
      if (typeof permVal === "string" && data[`cur${suffix}`] !== permVal) {
        set(`cur${suffix}`, permVal);
      }
    });
  }, [sameAsPerm, permValues, data, set]);

  function handleSameAsPerm(checked: boolean) {
    set("sameAsPerm", checked);
    if (checked) {
      for (const suffix of ADDR_SUFFIXES) {
        const permVal = data[`perm${suffix}`];
        if (typeof permVal === "string") set(`cur${suffix}`, permVal);
      }
      // Copy house number + postal
      const permHouse = data.permHouseNumber;
      if (typeof permHouse === "string") set("curHouseNumber", permHouse);
      const permPostal = data.permPostalCode;
      if (typeof permPostal === "string") set("curPostalCode", permPostal);
    }
  }

  return (
    <div className="space-y-6">
      <Field label={t("fields.permAddress")}>
        <div className="space-y-3">
          <WardCascade prefix="perm" showStreet />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput name="permHouseNumber" placeholder={t("fields.phHouseStreet")} />
            <TextInput name="permPostalCode" placeholder={t("fields.phPostal")} />
          </div>
        </div>
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-4">
        <input
          type="checkbox"
          checked={sameAsPerm}
          onChange={(e) => handleSameAsPerm(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-navy-700"
        />
        <span className="text-sm font-medium text-ink">{t("registry.sameAsPerm")}</span>
      </label>

      {!sameAsPerm && (
        <Field label={t("fields.curAddress")}>
          <div className="space-y-3">
            <WardCascade prefix="cur" showStreet />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput name="curHouseNumber" placeholder={t("fields.phHouseStreet")} />
              <TextInput name="curPostalCode" placeholder={t("fields.phPostal")} />
            </div>
          </div>
        </Field>
      )}
    </div>
  );
}
