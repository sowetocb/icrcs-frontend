"use client";

import { useEffect } from "react";
import { Field, Select, TextInput, useWizard } from "@/components/registry/field";
import { useEmploymentStatusOptions, useOccupationTypeOptions } from "@/components/registry/blocks";
import { useI18n } from "@/app/i18n/localeProvider";
import { useLookup } from "@/components/lookup/useLookup";
import { getEducationLevels, toOptions, type LookupItem } from "@/lib/api/lookup";
import { X, Plus, TriangleAlert } from "lucide-react";

const MIN_SCHOOLS = 1;

// Per-school field suffixes — used to clear a removed/cleared school.
const SCHOOL_SUFFIXES = ["Level", "School", "Year", "District", "IndexNo", "Completed"];

const OCCUPATION_OTHER_ID = "19"; // triggers free-text field

// Employed AND Self-employed both pick from this narrowed occupation set
// (matched by name against the live lookup, so the backend id is kept). "Other"
// is now provided by the Lookup service; selecting it reveals the free-text
// otherOccupation field.
const ALLOWED_OCCUPATIONS = [
  "Lawyer",
  "Accountant",
  "Driver",
  "Trader/Vendor",
  "Artisan/Craftsman",
  "Military/Police",
  "Other",
];
const normOcc = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALLOWED_OCCUPATION_SET = new Set(ALLOWED_OCCUPATIONS.map(normOcc));

function SchoolBlock({
  n,
  levelOptions,
  onRemove,
}: {
  n: number;
  levelOptions: { value: string; label: string }[];
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const { data, set } = useWizard();
  const p = `edu${n}`;
  const completed = data[`${p}Completed`] === true;
  return (
    <div className="space-y-4 rounded-xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-700">{t("fields.schoolN").replace("{n}", String(n))}</h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full text-danger transition-all duration-200 hover:bg-danger hover:text-white active:scale-95"
            aria-label={t("fields.remove")}
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Completion status — drives whether a completion year is required. */}
      <div className="flex gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`${p}Completed`}
            checked={completed}
            onChange={() => set(`${p}Completed`, true)}
            className="h-4 w-4 shrink-0 border-line accent-navy-700"
          />
          <span className="text-sm font-medium text-ink">{t("fields.eduCompletedOpt")}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`${p}Completed`}
            checked={!completed}
            onChange={() => {
              set(`${p}Completed`, false);
              // Clear the year — the payload sends completionYear: null.
              set(`${p}Year`, "");
            }}
            className="h-4 w-4 shrink-0 border-line accent-navy-700"
          />
          <span className="text-sm font-medium text-ink">{t("fields.eduStudyingOpt")}</span>
        </label>
      </div>

      {/* Education Level and Completion Year share a row (horizontally level). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.eduLevel")} required>
          <Select name={`${p}Level`} placeholder={t("fields.phSelectLevel")} options={levelOptions} />
        </Field>
        {completed && (
          <Field label={t("fields.completionYear")} required>
            {/* No min/max clamp — an out-of-range year is flagged as an error on
                submit (see the Stage 4 validation) rather than snapped to 1900. */}
            <TextInput name={`${p}Year`} placeholder="2014" numeric maxLength={4} />
          </Field>
        )}
      </div>

      <Field label={t("fields.schoolName")} required>
        <TextInput name={`${p}School`} placeholder="Buguruni Primary School" lettersOnly />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.schoolDistrict")} required>
          <TextInput name={`${p}District`} placeholder="Ilala" lettersOnly />
        </Field>
        <Field label={t("fields.indexNo")} optional>
          <TextInput name={`${p}IndexNo`} placeholder="PS-2001-001" allowChars="A-Za-z0-9\-" maxLength={20} />
        </Field>
      </div>
    </div>
  );
}

export default function StepEducation() {
  const { t } = useI18n();
  const { data, set, setQuiet, isFirstPerson } = useWizard();
  const occupations = useOccupationTypeOptions();
  const jobStatuses = useEmploymentStatusOptions();

  // The stored value is the backend status name (e.g. "Self Employed"), so
  // compare on a normalized form (no spaces/hyphens) rather than a literal.
  const jobStatus = normOcc(String(data.jobStatus));
  const isEmployed = jobStatus === "employed";
  const isSelfEmployed = jobStatus === "selfemployed";
  // Both Employed and Self-employed render the same narrowed occupation set.
  const occupationOptions = occupations.filter((o) => {
    const n = normOcc(o.label);
    if (!ALLOWED_OCCUPATION_SET.has(n)) return false;
    // Two lookup rows can resolve to the label "Other": the genuine Lookup
    // "Other" (id OCCUPATION_OTHER_ID, which reveals the free-text field) and a
    // stale static-mapping artifact on another id. Keep only the genuine one.
    if (n === "other") return String(o.value) === OCCUPATION_OTHER_ID;
    return true;
  });
  const { options: eduLevels } = useLookup(getEducationLevels, []);
  const levelOptions = toOptions(eduLevels as LookupItem[], "id");

  const neverAttendedSchool = data.neverAttendedSchool === true;
  const schoolCount = Math.max(MIN_SCHOOLS, Number(data.eduCount) || MIN_SCHOOLS);

  // Non-first-person subjects are validated to be under 18 at Stage 1 — use that
  // as the primary check. DOB-based fallback handles edge cases (e.g. incomplete drafts).
  const isMinor = !isFirstPerson || (() => {
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
  // Auto-select "Student" for minors so the backend's required employmentStatusId is satisfied.
  const studentStatusValue = jobStatuses.find((o) => /student/i.test(o.label))?.value ?? "";
  useEffect(() => {
    if (isMinor && studentStatusValue && data.jobStatus !== studentStatusValue)
      setQuiet("jobStatus", studentStatusValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinor, studentStatusValue]);

  // "Have you attended school?" defaults to No (never attended) until answered.
  useEffect(() => {
    if (data.neverAttendedSchool === undefined) setQuiet("neverAttendedSchool", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSchool(n: number) {
    for (const s of SCHOOL_SUFFIXES) set(`edu${n}${s}`, "");
  }

  function handleNeverAttended(checked: boolean) {
    set("neverAttendedSchool", checked);
    if (checked) {
      for (let i = 1; i <= schoolCount; i++) clearSchool(i);
      set("eduCount", String(MIN_SCHOOLS));
    }
  }

  function addSchool() {
    set("eduCount", String(schoolCount + 1));
  }

  function removeLastSchool() {
    if (schoolCount <= MIN_SCHOOLS) return;
    clearSchool(schoolCount);
    set("eduCount", String(schoolCount - 1));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="mb-3 text-sm font-medium text-ink">{t("registry.haveAttendedSchool")}</p>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="attendedSchool"
                checked={!neverAttendedSchool}
                onChange={() => handleNeverAttended(false)}
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioYes")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="attendedSchool"
                checked={neverAttendedSchool}
                onChange={() => handleNeverAttended(true)}
                className="h-4 w-4 border-line accent-navy-700"
              />
              <span className="text-sm font-medium text-ink">{t("registry.radioNo")}</span>
            </label>
          </div>
        </div>

        {!neverAttendedSchool && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
              <TriangleAlert className="mt-0.5 shrink-0 text-warning" size={18} aria-hidden="true" />
              <p className="text-sm font-medium text-navy-700">
                {t("registry.primaryEducationMandatory")}
              </p>
            </div>
            <p className="text-sm text-muted">
              {t("fields.schoolNote")}
            </p>

            {Array.from({ length: schoolCount }, (_, i) => i + 1).map((n) => {
              // An education level can only be chosen once — hide levels already
              // picked in the other school blocks, but always keep this block's
              // own current selection so it still renders/stays selectable.
              const own = String(data[`edu${n}Level`] ?? "");
              const takenByOthers = new Set(
                Array.from({ length: schoolCount }, (_, i) => i + 1)
                  .filter((m) => m !== n)
                  .map((m) => String(data[`edu${m}Level`] ?? ""))
                  .filter(Boolean),
              );
              const blockLevelOptions = levelOptions.filter(
                (o) => String(o.value) === own || !takenByOthers.has(String(o.value)),
              );
              return (
                <SchoolBlock
                  key={n}
                  n={n}
                  levelOptions={blockLevelOptions}
                  onRemove={
                    n === schoolCount && schoolCount > MIN_SCHOOLS ? removeLastSchool : undefined
                  }
                />
              );
            })}

            <button
              type="button"
              onClick={addSchool}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-700 hover:text-white"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              {t("fields.addSchool")}
            </button>
          </div>
        )}
      </div>

      {!isMinor && (
        <>
          <hr className="border-line" />

          <div className="space-y-5">
            <h3 className="font-display text-base font-bold text-navy-700">{t("fields.employment")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("fields.employmentStatus")} required>
                <Select name="jobStatus" placeholder={t("fields.phSelectStatus")} options={jobStatuses} />
              </Field>
              {/* Occupation dropdown — Employed AND Self-Employed pick from the same narrowed list */}
              {(isEmployed || isSelfEmployed) && (
                <Field label={t("fields.occupation")} required>
                  <Select name="occupation" placeholder={t("fields.phSelectOccupation")} options={occupationOptions} />
                </Field>
              )}
              {/* When "Other" (ID 19) is chosen, require a free-text description */}
              {(isEmployed || isSelfEmployed) &&
                String(data.occupation) === OCCUPATION_OTHER_ID && (
                <Field label={t("fields.otherOccupation")} required>
                  <TextInput name="otherOccupation" placeholder={t("fields.phOtherOccupation")} lettersOnly maxLength={50} />
                </Field>
              )}
              {/* Organisation name — only for Employed (Self-employed has none) */}
              {isEmployed && (
                <Field label={t("fields.employer")} required>
                  <TextInput name="employer" placeholder="Tanzania Revenue Authority" lettersOnly maxLength={30} />
                </Field>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
