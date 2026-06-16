// Maps the server-compiled Stage 9 preview response into the local wizard
// `data` shape the printable form consumes. Only the fields the preview
// reliably carries are mapped; the caller MERGES the result over the local
// draft so display-only values the preview lacks (TZ region/district/ward
// names, the passport photo data-URL, friendly attachment names) are kept.

import { getCountries } from "@/lib/api/lookup";

type Data = Record<string, string | boolean>;
type Obj = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

/** Split a stored full name ("First Middle… Last") into its three parts. */
function splitName(full: string): { first: string; middle: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return {
    first: parts[0],
    last: parts[parts.length - 1],
    middle: parts.slice(1, -1).join(" "),
  };
}

/** Map the preview `data` object to wizard-form fields (best effort). */
export async function previewToForm(previewData: unknown): Promise<Data> {
  const d = obj(previewData);
  const out: Data = {};

  // Country ISO-code → display name (preview uses 3-letter codes like "TZA").
  let codeToName: (code: string) => string = (c) => c;
  try {
    const countries = await getCountries();
    const map = new Map(
      countries.filter((c) => c.code).map((c) => [c.code!.toUpperCase(), c.name]),
    );
    codeToName = (c) => (c ? map.get(c.toUpperCase()) ?? c : "");
  } catch {
    // fall back to the raw code
  }

  // ── Personal details ──────────────────────────────────────────────────────
  const p = obj(d.personalDetails);
  if (p.firstName != null) out.applicantFirst = str(p.firstName);
  if (p.middleName != null) out.applicantMiddle = str(p.middleName);
  if (p.lastName != null) out.applicantLast = str(p.lastName);
  if (p.sex != null) out.gender = str(p.sex);
  if (p.maritalStatus != null) out.marriage = str(p.maritalStatus);
  if (p.citizenshipTypeId != null) out.citizenshipTypeId = str(p.citizenshipTypeId);
  if (p.nationalityCode != null) out.nationalityCountry = codeToName(str(p.nationalityCode));
  if (p.phoneNumber != null) out.phone = str(p.phoneNumber);
  if (p.email != null) out.email = str(p.email);

  const birth = obj(d.birthDetails);
  if (birth.dateOfBirth != null) out.dob = str(birth.dateOfBirth);

  // ── Addresses (current / permanent) ───────────────────────────────────────
  for (const a of arr(d.addresses)) {
    const prefix = str(a.addressType) === "PERMANENT" ? "perm" : "cur";
    if (a.countryCode != null) out[`${prefix}Country`] = codeToName(str(a.countryCode));
    if (a.city != null) out[`${prefix}City`] = str(a.city);
  }

  // ── Parents ───────────────────────────────────────────────────────────────
  for (const parent of arr(d.parents)) {
    const prefix = str(parent.parentType) === "MOTHER" ? "mother" : "father";
    out[`${prefix}First`] = str(parent.firstName);
    out[`${prefix}Middle`] = str(parent.middleName);
    out[`${prefix}Last`] = str(parent.lastName);
    out[`${prefix}Phone`] = str(parent.phoneNumber);
    out[`${prefix}NatCountry`] = codeToName(str(parent.nationalityCountryCode));
    if (parent.residenceCity != null) out[`${prefix}ResCity`] = str(parent.residenceCity);
  }

  // ── Education ─────────────────────────────────────────────────────────────
  const education = arr(d.educationList);
  if (education.length > 0) {
    out.eduCount = String(education.length);
    education.forEach((e, i) => {
      const n = i + 1;
      out[`edu${n}School`] = str(e.schoolName);
      if (e.educationLevelId != null) out[`edu${n}Level`] = str(e.educationLevelId);
      if (e.city != null) out[`edu${n}District`] = str(e.city);
      if (e.registrationNumber != null) out[`edu${n}IndexNo`] = str(e.registrationNumber);
      if (e.completionYear != null) out[`edu${n}Year`] = str(e.completionYear);
    });
  }

  // ── Employment ────────────────────────────────────────────────────────────
  const emp = obj(d.employment);
  if (emp.employmentStatus != null) out.jobStatus = str(emp.employmentStatus);
  if (emp.organizationName != null) out.employer = str(emp.organizationName);
  if (emp.occupationTypeId != null) out.occupation = str(emp.occupationTypeId);

  // ── Emergency contacts ────────────────────────────────────────────────────
  arr(d.emergencyContacts)
    .slice()
    .sort((a, b) => Number(a.contactOrder ?? 0) - Number(b.contactOrder ?? 0))
    .forEach((c, i) => {
      const prefix = `ec${i + 1}`;
      const { first, middle, last } = splitName(str(c.fullName));
      out[`${prefix}First`] = first;
      out[`${prefix}Middle`] = middle;
      out[`${prefix}Last`] = last;
      out[`${prefix}Phone`] = str(c.phoneNumber);
      if (c.relationshipTypeId != null) out[`${prefix}RelType`] = str(c.relationshipTypeId);
    });

  // ── Relatives + spouses ───────────────────────────────────────────────────
  const relatives = arr(d.relatives);
  if (relatives.length > 0) out.relativeCount = String(relatives.length);
  relatives.forEach((r, i) => {
    const prefix = `rel${i + 1}`;
    out[`${prefix}First`] = str(r.firstName);
    out[`${prefix}Middle`] = str(r.middleName);
    out[`${prefix}Last`] = str(r.lastName);
    if (r.gender != null) out[`${prefix}Gender`] = str(r.gender);
    out[`${prefix}Phone`] = str(r.phoneNumber);
    if (r.nationalityCode != null) out[`${prefix}NatCountry`] = codeToName(str(r.nationalityCode));
    if (r.residenceCountryCode != null) out[`${prefix}ResCountry`] = codeToName(str(r.residenceCountryCode));
    if (r.residenceCity != null) out[`${prefix}ResCity`] = str(r.residenceCity);
    if (r.relationshipTypeId != null) out[`${prefix}RelType`] = str(r.relationshipTypeId);
  });

  const spouses = arr(d.spouses);
  if (spouses.length > 0) {
    out.isMarried = true;
    out.spouseCount = String(spouses.length);
    spouses.forEach((sp, i) => {
      const person = obj(sp.person);
      const prefix = `sp${i + 1}`;
      out[`${prefix}First`] = str(person.firstName);
      out[`${prefix}Middle`] = str(person.middleName);
      out[`${prefix}Last`] = str(person.lastName);
      if (person.gender != null) out[`${prefix}Gender`] = str(person.gender);
      if (person.phoneNumber != null) out[`${prefix}Phone`] = str(person.phoneNumber);
    });
  }

  // ── Children ──────────────────────────────────────────────────────────────
  // Same shape as spouses (a nested person), with a flat fallback.
  const childrenList = arr(d.children);
  if (childrenList.length > 0) {
    out.hasChildren = true;
    out.childCount = String(childrenList.length);
    childrenList.forEach((c, i) => {
      const person = obj(c.person).firstName != null ? obj(c.person) : c;
      const prefix = `ch${i + 1}`;
      out[`${prefix}First`] = str(person.firstName);
      out[`${prefix}Middle`] = str(person.middleName);
      out[`${prefix}Last`] = str(person.lastName);
      if (person.gender != null) out[`${prefix}Gender`] = str(person.gender);
      if (person.phoneNumber != null) out[`${prefix}Phone`] = str(person.phoneNumber);
      if (person.nationalityCode != null) out[`${prefix}NatCountry`] = codeToName(str(person.nationalityCode));
    });
  }

  return out;
}
