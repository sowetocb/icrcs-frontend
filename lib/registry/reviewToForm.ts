// Maps the /v1/registration/{subjectId}/review response into the local wizard
// `data` shape consumed by the Preview & Declaration stage and the printable
// PDF. The review endpoint returns display-ready names (e.g. "Female",
// "Self-Employed", region/ward names) and nested location objects, so most
// fields map across directly; gender/marital/employment are normalised to the
// codes the form + display logic use. The caller MERGES the result over the
// local draft, so values the review lacks (the passport-photo data URL, etc.)
// are kept.

import { getGenders, getMaritalStatuses, getEmploymentStatuses } from "@/lib/api/lookup";

type Data = Record<string, string | boolean>;
type Obj = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

function splitName(full: string): { first: string; middle: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return { first: parts[0], last: parts[parts.length - 1], middle: parts.slice(1, -1).join(" ") };
}

/** Citizenship type name → the lookup-id value the form/display use. */
function citizenshipNameToId(name: string): string {
  const n = name.trim().toLowerCase();
  if (n.startsWith("birth")) return "1";
  if (n.startsWith("desc") || n.startsWith("dec")) return "2";
  if (n.startsWith("natural")) return "3";
  return name;
}

/** Write a nested {street, ward, district, region} location to the form keys
 * `<prefix>Street/Ward/District/Region` (display names). */
function writeLocation(out: Data, prefix: string, location: unknown) {
  const loc = obj(location);
  if (loc.street != null) out[`${prefix}Street`] = str(loc.street);
  if (loc.ward != null) out[`${prefix}Ward`] = str(loc.ward);
  if (loc.district != null) out[`${prefix}District`] = str(loc.district);
  if (loc.region != null) out[`${prefix}Region`] = str(loc.region);
}

export async function reviewToForm(reviewData: unknown): Promise<Data> {
  const d = obj(reviewData);
  const out: Data = {};

  // Gender name ("Female") → M/F/O code. Index the lookup by id, name, code and
  // the English keyword inside the bilingual name ("Ke (Female)" → FEMALE) so a
  // bare "Female"/"Male" from the review resolves to the right code.
  let genderToCode: (v: string) => string = (v) => v;
  try {
    const genders = await getGenders();
    const gmap = new Map<string, string>();
    for (const g of genders) {
      const code = (g.code ?? "").toUpperCase();
      if (!code) continue;
      gmap.set(String(g.id), code);
      gmap.set(g.name.toUpperCase(), code);
      gmap.set(code, code);
      const paren = g.name.match(/\(([^)]+)\)/);
      if (paren) gmap.set(paren[1].trim().toUpperCase(), code);
    }
    genderToCode = (v) => {
      if (!v) return "";
      const u = v.trim().toUpperCase();
      return gmap.get(u) ?? (u.includes("FEMALE") ? "F" : u.includes("MALE") ? "M" : v);
    };
  } catch {
    // fall back to the raw value
  }

  // Marital + employment status names → the codes the form/display use.
  let maritalToCode: (v: string) => string = (v) => v;
  try {
    const statuses = await getMaritalStatuses();
    const m = new Map<string, string>();
    for (const s of statuses) {
      const code = (s.code ?? "").toUpperCase();
      if (!code) continue;
      m.set(String(s.id), code);
      m.set(s.name.toUpperCase(), code);
      m.set(code, code);
    }
    maritalToCode = (v) => (v ? m.get(v.trim().toUpperCase()) ?? v : "");
  } catch {
    /* raw */
  }

  let employmentToCode: (v: string) => string = (v) => v;
  try {
    const items = await getEmploymentStatuses();
    const m = new Map<string, string>();
    for (const s of items) {
      const code = s.code ?? s.name;
      if (!code) continue;
      m.set(String(s.id), code);
      m.set(s.name.toUpperCase(), code);
      m.set(code.toUpperCase(), code);
    }
    employmentToCode = (v) => (v ? m.get(v.trim().toUpperCase()) ?? v : "");
  } catch {
    /* raw */
  }

  // ── Personal details ──────────────────────────────────────────────────────
  const p = obj(d.personalDetails);
  if (p.firstName != null) out.applicantFirst = str(p.firstName);
  if (p.middleName != null) out.applicantMiddle = str(p.middleName);
  if (p.lastName != null) out.applicantLast = str(p.lastName);
  if (p.sex != null) out.gender = genderToCode(str(p.sex));
  if (p.maritalStatus != null) out.marriage = maritalToCode(str(p.maritalStatus));
  if (p.dateOfBirth != null) out.dob = str(p.dateOfBirth);
  if (p.nationality != null) out.nationalityCountry = str(p.nationality);
  if (p.countryOfBirth != null) out.pobCountry = str(p.countryOfBirth);
  writeLocation(out, "pob", p.placeOfBirth);

  const birth = obj(d.birthDetails);
  if (birth.dateOfBirth != null) out.dob = str(birth.dateOfBirth);
  if (birth.countryOfBirth != null && !out.pobCountry) out.pobCountry = str(birth.countryOfBirth);

  if (d.citizenshipType != null) out.citizenshipTypeId = citizenshipNameToId(str(d.citizenshipType));

  // ── Addresses (current / permanent) ───────────────────────────────────────
  let curLoc = "";
  let permLoc = "";
  for (const a of arr(d.addresses)) {
    const prefix = str(a.addressType) === "PERMANENT" ? "perm" : "cur";
    writeLocation(out, prefix, a.location);
    out[`${prefix}Country`] = "Tanzania";
    if (prefix === "cur") {
      if (a.phoneNumber != null) out.phone = str(a.phoneNumber);
      if (a.email != null) out.email = str(a.email);
      curLoc = JSON.stringify(obj(a.location));
    } else {
      permLoc = JSON.stringify(obj(a.location));
    }
  }
  // If both addresses match, mark the permanent address as "same as current".
  if (curLoc && permLoc) out.sameAsPerm = curLoc === permLoc;

  // ── Parents ───────────────────────────────────────────────────────────────
  for (const parent of arr(d.parents)) {
    const prefix = str(parent.parentType) === "MOTHER" ? "mother" : "father";
    out[`${prefix}First`] = str(parent.firstName);
    out[`${prefix}Middle`] = str(parent.middleName);
    out[`${prefix}Last`] = str(parent.lastName);
    if (parent.nationality != null) out[`${prefix}NatCountry`] = str(parent.nationality);
    if (parent.residenceCountry != null) out[`${prefix}ResCountry`] = str(parent.residenceCountry);
    writeLocation(out, `${prefix}Res`, parent.residenceLocation);
  }

  // ── Education ─────────────────────────────────────────────────────────────
  const education = arr(d.educationList);
  // Restore the "Have you attended school?" toggle.
  if (d.hasAttendedSchool === false || (d.hasAttendedSchool == null && education.length === 0)) {
    out.neverAttendedSchool = true;
  } else {
    out.neverAttendedSchool = false;
  }
  if (education.length > 0) {
    out.eduCount = String(education.length);
    education.forEach((e, i) => {
      const n = i + 1;
      out[`edu${n}School`] = str(e.schoolName);
      if (e.educationLevel != null) out[`edu${n}Level`] = str(e.educationLevel);
      if (e.city != null) out[`edu${n}District`] = str(e.city);
      if (e.registrationNumber != null) out[`edu${n}IndexNo`] = str(e.registrationNumber);
      if (e.completionYear != null) out[`edu${n}Year`] = str(e.completionYear);
    });
  }

  // ── Employment ────────────────────────────────────────────────────────────
  const emp = obj(d.employment);
  const reviewJobStatus = emp.employmentStatus != null ? employmentToCode(str(emp.employmentStatus)) : "";
  if (emp.employmentStatus != null) out.jobStatus = reviewJobStatus;
  if (emp.occupationTypeId != null) out.occupation = str(emp.occupationTypeId);
  // otherOccupation carries the free-text "Other" (id 19) description, for both
  // Employed and Self-employed. (Legacy data kept it in occupationName.)
  if (emp.otherOccupation != null) {
    out.otherOccupation = str(emp.otherOccupation);
  } else if (emp.occupationName != null) {
    out.otherOccupation = str(emp.occupationName);
  }
  // organizationName carries the employer name (Employed only).
  if (emp.organizationName != null && reviewJobStatus !== "Self-employed") {
    out.employer = str(emp.organizationName);
  }

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
      if (c.phoneNumber != null) out[`${prefix}Phone`] = str(c.phoneNumber);
      if (c.relationshipType != null) out[`${prefix}RelType`] = str(c.relationshipType);
      if (c.country != null) out[`${prefix}ResCountry`] = str(c.country);
      writeLocation(out, `${prefix}Res`, c.residenceLocation);
    });

  // ── Relatives ─────────────────────────────────────────────────────────────
  const relatives = arr(d.relatives);
  if (relatives.length > 0) out.relativeCount = String(relatives.length);
  relatives.forEach((r, i) => {
    const prefix = `rel${i + 1}`;
    out[`${prefix}First`] = str(r.firstName);
    out[`${prefix}Middle`] = str(r.middleName);
    out[`${prefix}Last`] = str(r.lastName);
    if (r.sex != null) out[`${prefix}Gender`] = genderToCode(str(r.sex));
    if (r.phoneNumber != null) out[`${prefix}Phone`] = str(r.phoneNumber);
    if (r.nationality != null) out[`${prefix}NatCountry`] = str(r.nationality);
    if (r.residenceCountry != null) out[`${prefix}ResCountry`] = str(r.residenceCountry);
    if (r.relationshipType != null) out[`${prefix}RelType`] = str(r.relationshipType);
    writeLocation(out, `${prefix}Res`, r.residenceLocation);
  });

  // ── Spouses ───────────────────────────────────────────────────────────────
  const spouses = arr(d.spouses);
  if (spouses.length > 0) {
    out.isMarried = true;
    out.spouseCount = String(spouses.length);
    spouses.forEach((sp, i) => {
      // The spouse may be flat or nested under `person`.
      const person = obj(sp.person).firstName != null ? obj(sp.person) : sp;
      const prefix = `sp${i + 1}`;
      out[`${prefix}First`] = str(person.firstName);
      out[`${prefix}Middle`] = str(person.middleName);
      out[`${prefix}Last`] = str(person.lastName);
      if (person.sex != null) out[`${prefix}Gender`] = genderToCode(str(person.sex));
      if (person.phoneNumber != null) out[`${prefix}Phone`] = str(person.phoneNumber);
      if (person.nationality != null) out[`${prefix}NatCountry`] = str(person.nationality);
      if (person.residenceCountry != null) out[`${prefix}ResCountry`] = str(person.residenceCountry);
      writeLocation(out, `${prefix}Res`, person.residenceLocation);
    });
  }

  // ── Children ──────────────────────────────────────────────────────────────
  const children = arr(d.children);
  if (children.length > 0) {
    out.hasChildren = true;
    out.childCount = String(children.length);
    children.forEach((c, i) => {
      const person = obj(c.person).firstName != null ? obj(c.person) : c;
      const prefix = `ch${i + 1}`;
      out[`${prefix}First`] = str(person.firstName);
      out[`${prefix}Middle`] = str(person.middleName);
      out[`${prefix}Last`] = str(person.lastName);
      if (person.sex != null) out[`${prefix}Gender`] = genderToCode(str(person.sex));
      if (person.phoneNumber != null) out[`${prefix}Phone`] = str(person.phoneNumber);
      if (person.nationality != null) out[`${prefix}NatCountry`] = str(person.nationality);
      if (person.residenceCountry != null) out[`${prefix}ResCountry`] = str(person.residenceCountry);
      writeLocation(out, `${prefix}Res`, person.residenceLocation);
    });
  }

  return out;
}
