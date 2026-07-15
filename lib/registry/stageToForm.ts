// Maps a per-stage GET response (GET /v1/registration/{subjectId}/stage{n}) back
// into the local wizard `data` shape, so navigating to an already-submitted
// stage re-hydrates the form. The per-stage responses are FLAT and mirror the
// POST payloads (ids + ISO codes + street ids), so this reverses those:
//   - sexId / maritalStatusId / employmentStatus(id) → the M/F/O / enum codes
//   - nationalityCode / countryOfBirthCode (ISO) → display country names
//   - placeOfBirthStreetId / residenceStreetId → the full territory→street
//     cascade (ids + names) via the street-info lookup
//
// The caller fills only blank fields, so local edits are preserved.

import {
  getCountries,
  getGenders,
  getMaritalStatuses,
  getEmploymentStatuses,
  getStreetInfo,
  getPersonDocumentTypes,
  type PersonGroup,
} from "@/lib/api/lookup";
import { COUNTRIES } from "@/lib/countries";
import { alpha2ToAlpha3 } from "@/lib/iso3";

// Local ISO alpha-3 → country name, so place/country-of-birth resolves even when
// the backend countries lookup is empty/unavailable (it's known to be flaky).
const LOCAL_ALPHA3_TO_NAME = new Map<string, string>();
for (const c of COUNTRIES) {
  const a3 = alpha2ToAlpha3(c.code);
  if (a3) LOCAL_ALPHA3_TO_NAME.set(a3.toUpperCase(), c.name);
}

type Data = Record<string, string | boolean>;
type Obj = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
// Like `str`, but collapses the backend's literal "NULL"/"null" sentinel (seen
// on optional text columns) to an empty string so it isn't rendered verbatim.
const strNN = (v: unknown) => {
  const s = str(v);
  return s.trim().toUpperCase() === "NULL" ? "" : s;
};
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

/** The trailing file name of a backend file URL (…/2/uuid.pdf → uuid.pdf). */
const fileNameFromUrl = (url: string) => (url ? url.split("/").pop() || "" : "");

/** The passport photo is attachment type 5. */
const PHOTO_TYPE_ID = 5;

function splitName(full: string): { first: string; middle: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return { first: parts[0], last: parts[parts.length - 1], middle: parts.slice(1, -1).join(" ") };
}

export async function stageToForm(stage: number, raw: unknown): Promise<Data> {
  const d = obj(raw);
  const out: Data = {};

  const [genders, maritals, employments, countries, personDocTypes] = await Promise.all([
    getGenders().catch(() => []),
    getMaritalStatuses().catch(() => []),
    getEmploymentStatuses().catch(() => []),
    getCountries().catch(() => []),
    getPersonDocumentTypes().catch(() => ({ applicant: [], father: [], mother: [] })),
  ]);

  // documentTypeId → person group + the form-field prefix for that group's
  // identification-documents repeater. Lets the flat `documents[]` array (which
  // mixes applicant/father/mother docs) be split back to the right person.
  const DOC_GROUP_PREFIX: Record<PersonGroup, string> = {
    applicant: "idDoc",
    father: "fatherIdDoc",
    mother: "motherIdDoc",
  };
  const docIdToGroup = new Map<string, PersonGroup>();
  (["applicant", "father", "mother"] as const).forEach((g) => {
    personDocTypes[g].forEach((item) => docIdToGroup.set(String(item.id), g));
  });
  /** Split a flat documents[] array (with documentTypeId) into the per-person
   * repeater fields ({prefix}IdDoc{n}Type / Number + {prefix}IdDocCount). */
  function applyGroupedDocuments(documents: Obj[]) {
    const counts: Record<PersonGroup, number> = { applicant: 0, father: 0, mother: 0 };
    for (const doc of documents) {
      const id = str(doc.documentTypeId);
      const group = id ? docIdToGroup.get(id) : undefined;
      if (!id || !group) continue;
      const n = ++counts[group];
      const prefix = DOC_GROUP_PREFIX[group];
      out[`${prefix}${n}Type`] = id;
      if (doc.documentNumber != null) out[`${prefix}${n}Number`] = str(doc.documentNumber);
    }
    (["applicant", "father", "mother"] as const).forEach((g) => {
      if (counts[g] > 0) {
        const countKey = g === "applicant" ? "idDocCount" : `${g}IdDocCount`;
        out[countKey] = String(counts[g]);
      }
    });
  }

  const genderById = new Map(genders.map((g) => [String(g.id), (g.code ?? "").toUpperCase()]));
  const maritalById = new Map(maritals.map((s) => [String(s.id), (s.code ?? "").toUpperCase()]));
  const employmentById = new Map(employments.map((s) => [String(s.id), s.code ?? s.name]));
  const countryByCode = new Map(
    countries.filter((c) => c.code).map((c) => [c.code!.toUpperCase(), c.name]),
  );

  const isoToName = (code: unknown) => {
    const c = str(code).toUpperCase();
    if (!c) return "";
    // Backend lookup first, then the local alpha-3 map, then the raw code.
    return countryByCode.get(c) ?? LOCAL_ALPHA3_TO_NAME.get(c) ?? str(code);
  };
  const genderCode = (v: unknown) => genderById.get(str(v)) ?? str(v);
  const maritalCode = (v: unknown) => maritalById.get(str(v)) ?? str(v);
  const employmentCode = (v: unknown) => employmentById.get(str(v)) ?? str(v);

  // Restore a region→street cascade (ids + names) from a stored street id.
  async function applyStreet(prefix: string, streetId: unknown) {
    const id = Number(str(streetId));
    if (!Number.isFinite(id) || id <= 0) return;
    const h = await getStreetInfo(id);
    if (!h) return;
    out[`${prefix}Country`] = "Tanzania";
    out[`${prefix}TerritoryId`] = String(h.territoryId || "");
    out[`${prefix}Territory`] = h.territoryName;
    out[`${prefix}RegionId`] = String(h.regionId || "");
    out[`${prefix}Region`] = h.regionName;
    out[`${prefix}DistrictId`] = String(h.districtId || "");
    out[`${prefix}District`] = h.districtName;
    out[`${prefix}WardId`] = String(h.wardId || "");
    out[`${prefix}Ward`] = h.wardName;
    out[`${prefix}StreetId`] = String(h.streetId || "");
    out[`${prefix}Street`] = h.streetName;
  }

  // A shared "person" sub-object (parents / emergency / relatives / spouses /
  // children). `splitFull` handles records that carry a single `fullName`.
  async function applyPerson(prefix: string, p: Obj, splitFull = false) {
    if (splitFull && p.fullName != null) {
      const n = splitName(str(p.fullName));
      out[`${prefix}First`] = n.first;
      out[`${prefix}Middle`] = n.middle;
      out[`${prefix}Last`] = n.last;
    } else {
      if (p.firstName != null) out[`${prefix}First`] = str(p.firstName);
      if (p.middleName != null) out[`${prefix}Middle`] = str(p.middleName);
      if (p.lastName != null) out[`${prefix}Last`] = str(p.lastName);
    }
    const g = p.sexId ?? p.genderId ?? p.gender ?? p.sex;
    if (g != null) out[`${prefix}Gender`] = genderCode(g);
    if (p.dateOfBirth != null) out[`${prefix}Dob`] = str(p.dateOfBirth);
    if (p.phoneNumber != null) out[`${prefix}Phone`] = str(p.phoneNumber);
    if (p.nationalityCode != null) out[`${prefix}NatCountry`] = isoToName(p.nationalityCode);
    if (p.relationshipTypeId != null) out[`${prefix}RelType`] = str(p.relationshipTypeId);
    if (p.occupationTypeId != null) out[`${prefix}OccType`] = str(p.occupationTypeId);
    if (p.documentTypeId != null) out[`${prefix}DocType`] = str(p.documentTypeId);
    if (p.documentNumber != null) out[`${prefix}DocNumber`] = str(p.documentNumber);
    // Identification documents repeater: the backend returns a `documents`
    // array with `{ documentTypeId, documentNumber }`. The dropdown's option
    // VALUE is the documentTypeId, so map the id straight through (no code
    // conversion) into {prefix}IdDoc{n}Type / Number.
    const docs = arr(p.documents);
    if (docs.length > 0) {
      out[`${prefix}IdDocCount`] = String(docs.length);
      docs.forEach((doc, i) => {
        const n = i + 1;
        out[`${prefix}IdDoc${n}Type`] = str(doc.documentTypeId);
        if (doc.documentNumber != null) out[`${prefix}IdDoc${n}Number`] = str(doc.documentNumber);
      });
    } else if (p.documentTypeId != null && p.documentNumber != null) {
      // Legacy single document → slot it into idDoc1
      out[`${prefix}IdDocCount`] = "1";
      out[`${prefix}IdDoc1Type`] = str(p.documentTypeId);
      out[`${prefix}IdDoc1Number`] = str(p.documentNumber);
    }
    // Place of birth — separate from residence so the two cascades don't cross.
    const pobStreet = p.placeOfBirthStreetId ?? p.birthStreetId ?? p.pobStreetId;
    if (pobStreet != null) await applyStreet(`${prefix}Pob`, pobStreet);
    const pobCountry = p.countryOfBirthCode ?? p.placeOfBirthCountryCode ?? p.birthCountryCode;
    if (pobCountry != null) out[`${prefix}PobCountry`] = isoToName(pobCountry);
    const pobCity = p.villageOfBirth ?? p.placeOfBirthCity ?? p.cityOfBirth ?? p.villageName;
    if (pobCity != null) out[`${prefix}Village`] = str(pobCity);
    // Residence.
    if (p.residenceStreetId != null) await applyStreet(`${prefix}Res`, p.residenceStreetId);
    if (p.residenceCountryCode != null) out[`${prefix}ResCountry`] = isoToName(p.residenceCountryCode);
    if (p.residenceCity != null) out[`${prefix}ResCity`] = str(p.residenceCity);
  }

  // ── Stage 1: Personal ──────────────────────────────────────────────────────
  if (stage === 1) {
    if (d.firstName != null) out.applicantFirst = str(d.firstName);
    if (d.middleName != null) out.applicantMiddle = str(d.middleName);
    if (d.lastName != null) out.applicantLast = str(d.lastName);
    const g = d.sexId ?? d.genderId ?? d.gender ?? d.sex;
    if (g != null) out.gender = genderCode(g);
    const m = d.maritalStatusId ?? d.maritalStatus;
    if (m != null) out.marriage = maritalCode(m);
    if (d.dateOfBirth != null) out.dob = str(d.dateOfBirth);
    // Physical characteristics (v002) — added to Stage 1 for every category but
    // never reverse-mapped, so they came back blank on resume. Optional text
    // fields may arrive as the literal "NULL" sentinel, so strip that.
    if (d.otherNames != null) out.otherNames = strNN(d.otherNames);
    if (d.tribe != null) out.tribe = strNN(d.tribe);
    if (d.eyeColor != null) out.eyeColor = strNN(d.eyeColor);
    if (d.hairColor != null) out.hairColor = strNN(d.hairColor);
    if (d.heightCm != null) {
      const h = strNN(d.heightCm);
      // 0 / non-positive means "not provided" — keep the field blank.
      if (h && Number(h) > 0) out.heightCm = h;
    }
    if (d.specialMark != null) out.specialMark = strNN(d.specialMark);
    if (d.languageSpoken != null) out.languageSpoken = strNN(d.languageSpoken);
    if (d.citizenshipTypeId != null) out.citizenshipTypeId = str(d.citizenshipTypeId);
    if (d.nationalityCode != null) out.nationalityCountry = isoToName(d.nationalityCode);
    if (d.countryOfBirthCode != null) out.pobCountry = isoToName(d.countryOfBirthCode);
    if (d.cityOfBirth != null) out.pobCityVillage = str(d.cityOfBirth);
    if (d.placeOfBirthStreetId != null) await applyStreet("pob", d.placeOfBirthStreetId);
    if (d.birthCertificateNo != null) out.birthCertNo = str(d.birthCertificateNo);
    if (d.nidaNo != null) out.nidaNumber = str(d.nidaNo);
    // Identification documents: the GET returns ALL documents in one flat array
    // (applicant + father + mother), so split them by person group into each
    // repeater (applicant → idDoc, father → fatherIdDoc, mother → motherIdDoc).
    applyGroupedDocuments(arr(d.documents));
    // Passport photo — the Stage 1 preview renders any <img src>, so the stored
    // file URL works. Look for a direct url or a type-5 entry in documents.
    const photoUrl =
      str(d.photoUrl || d.passportPhotoUrl || d.photoFileUrl) ||
      str(arr(d.documents ?? d.attachments).find((a) => Number(a.attachmentTypeId) === PHOTO_TYPE_ID)?.fileUrl);
    if (photoUrl) {
      out.stage1PhotoData = photoUrl;
      out.passportPhotoUploaded = "true";
    }
    return out;
  }

  // ── Stage 2: Address ───────────────────────────────────────────────────────
  if (stage === 2) {
    // The backend may return addresses in TWO formats:
    //   A) Flat: { permanentCountryCode, permanentStreetId, currentCountryCode, … }
    //   B) Array: { addresses: [{ addressType: "PERMANENT", country: "AFG", … }, …] }
    // Normalize format B into format A so the rest of the mapping works uniformly.
    const addresses = arr(d.addresses);
    if (addresses.length > 0) {
      for (const addr of addresses) {
        const type = str(addr.addressType).toUpperCase();
        const prefix = type === "CURRENT" ? "current" : "permanent";
        // Map each possible field from the array item into the flat namespace.
        if (addr.country != null) d[`${prefix}CountryCode`] = addr.country;
        if (addr.countryCode != null) d[`${prefix}CountryCode`] = addr.countryCode;
        if (addr.city != null) d[`${prefix}City`] = addr.city;
        if (addr.streetId != null) d[`${prefix}StreetId`] = addr.streetId;
        if (addr.houseNo != null) d[`${prefix}HouseNo`] = addr.houseNo;
        if (addr.houseNumber != null) d[`${prefix}HouseNumber`] = addr.houseNumber;
        if (addr.postalAddress != null) d[`${prefix}PostalAddress`] = addr.postalAddress;
        if (addr.postalCode != null) d[`${prefix}PostalCode`] = addr.postalCode;
      }
      // If the response doesn't carry a boolean flag, infer "same" when there is
      // only one address or both addresses share a country + city.
      if (d.permanentSameAsCurrent == null) {
        if (addresses.length === 1) d.permanentSameAsCurrent = true;
      }
    }

    const same = d.permanentSameAsCurrent === true;
    out.sameAsPerm = same;

    // The form's PRIMARY address is permanent; current mirrors it when "same".
    const permSrc = same ? "current" : "permanent";
    await applyStreet("perm", d[`${permSrc}StreetId`]);
    if (d[`${permSrc}CountryCode`] != null) out.permCountry = isoToName(d[`${permSrc}CountryCode`]);
    if (d[`${permSrc}City`] != null) out.permCity = str(d[`${permSrc}City`]);
    const permHouse = d[`${permSrc}HouseNo`] ?? d[`${permSrc}HouseNumber`];
    if (permHouse != null) out.permHouseNumber = str(permHouse);
    const permPostal = d[`${permSrc}PostalAddress`] ?? d[`${permSrc}PostalCode`];
    if (permPostal != null) out.permPostalCode = str(permPostal);
    if (!same) {
      await applyStreet("cur", d.currentStreetId);
      if (d.currentCountryCode != null) out.curCountry = isoToName(d.currentCountryCode);
      if (d.currentCity != null) out.curCity = str(d.currentCity);
      const curHouse = d.currentHouseNo ?? d.currentHouseNumber;
      if (curHouse != null) out.curHouseNumber = str(curHouse);
      const curPostal = d.currentPostalAddress ?? d.currentPostalCode;
      if (curPostal != null) out.curPostalCode = str(curPostal);
    }
    return out;
  }

  // ── Stage 3: Parents ───────────────────────────────────────────────────────
  if (stage === 3) {
    for (const parent of arr(d.parents ?? d)) {
      const prefix = str(parent.parentType).toUpperCase() === "MOTHER" ? "mother" : "father";
      await applyPerson(prefix, parent);
    }
    // Documents may instead come back in one flat array (mixing father/mother) —
    // split by person group into each parent's repeater.
    applyGroupedDocuments(arr(d.documents));
    return out;
  }

  // ── Stage 4: Education & Employment ────────────────────────────────────────
  if (stage === 4) {
    const education = arr(d.educationList ?? d.educations);
    // Restore the "Have you attended school?" toggle from the backend flag or
    // infer it from an empty education list.
    if (d.hasAttendedSchool === false || (d.hasAttendedSchool == null && education.length === 0)) {
      out.neverAttendedSchool = true;
    } else {
      out.neverAttendedSchool = false;
    }
    if (education.length > 0) {
      out.eduCount = String(education.length);
      education.forEach((e, i) => {
        const n = i + 1;
        if (e.educationLevelId != null) out[`edu${n}Level`] = str(e.educationLevelId);
        if (e.schoolName != null) out[`edu${n}School`] = str(e.schoolName);
        if (e.city != null) out[`edu${n}District`] = str(e.city);
        if (e.registrationNumber != null) out[`edu${n}IndexNo`] = str(e.registrationNumber);
        if (e.completionYear != null) out[`edu${n}Year`] = str(e.completionYear);
      });
    }
    const job = d.employmentStatusId ?? d.employmentStatus;
    const jobCode = job != null ? employmentCode(job) : "";
    if (job != null) out.jobStatus = jobCode;
    if (d.occupationTypeId != null) out.occupation = str(d.occupationTypeId);
    // otherOccupation carries the free-text description chosen when the
    // occupation is "Other" (id 19) — for both Employed and Self-employed.
    // (Legacy data kept it in occupationName; fall back for compatibility.)
    if (d.otherOccupation != null) {
      out.otherOccupation = str(d.otherOccupation);
    } else if (d.occupationName != null) {
      out.otherOccupation = str(d.occupationName);
    }
    // organizationName carries the employer name (Employed only).
    const isSelfEmployed =
      jobCode.toLowerCase().replace(/[^a-z0-9]/g, "") === "selfemployed";
    if (d.organizationName != null && !isSelfEmployed) {
      out.employer = str(d.organizationName);
    }
    return out;
  }

  // ── Stage 5: Emergency Contacts ────────────────────────────────────────────
  if (stage === 5) {
    // The payload is { contacts: [{ relationshipTypeId, occupationTypeId,
    // person: {...} }] }. Accept `contacts` / `emergencyContacts` / a bare array.
    const contacts = arr(d.contacts ?? d.emergencyContacts ?? d)
      .slice()
      .sort((a, b) => Number(a.contactOrder ?? 0) - Number(b.contactOrder ?? 0));
    let i = 0;
    for (const c of contacts) {
      i += 1;
      // Stage 5 response is flat (no nested person sub-object). It carries a
      // combined `fullName`, so splitFull=true splits it back into First/Middle/Last.
      // Residence country arrives as `residenceCountryCode` (renamed from countryCode).
      await applyPerson(`ec${i}`, c, true);
    }
    return out;
  }

  // ── Stage 6: Family (relatives / spouses / children) ───────────────────────
  if (stage === 6) {
    const relatives = arr(d.relatives);
    if (relatives.length > 0) out.relativeCount = String(relatives.length);
    for (let i = 0; i < relatives.length; i++) {
      // Relatives nest their person fields under `person` (relationship/occupation
      // sit at the top) — merge so applyPerson sees them all.
      await applyPerson(`rel${i + 1}`, { ...relatives[i], ...obj(relatives[i].person) });
    }

    const spouses = arr(d.spouses);
    if (spouses.length > 0) {
      out.isMarried = true;
      out.spouseCount = String(spouses.length);
      for (let i = 0; i < spouses.length; i++) {
        // Merge so the nested `person` (names/gender) and any top-level fields
        // (e.g. residenceStreetId) are both seen.
        const sp = { ...spouses[i], ...obj(spouses[i].person) };
        await applyPerson(`sp${i + 1}`, sp);
      }
    }

    const children = arr(d.children);
    if (children.length > 0) {
      out.hasChildren = true;
      out.childCount = String(children.length);
      for (let i = 0; i < children.length; i++) {
        const ch = { ...children[i], ...obj(children[i].person) };
        await applyPerson(`ch${i + 1}`, ch);
      }
    }
    return out;
  }

  // ── Stage 8: Attachments ───────────────────────────────────────────────────
  if (stage === 8) {
    const attachments = arr(d.attachments).filter((a) => a.attachmentTypeId != null);
    const list = attachments.map((a) => {
      const typeId = Number(a.attachmentTypeId);
      const fileUrl = str(a.fileUrl);
      return {
        id: `att-${typeId}`,
        typeId,
        name: fileNameFromUrl(fileUrl) || `attachment-${typeId}`,
        fileUrl,
        mimeType: str(a.mimeType),
        fileSizeBytes: Number(a.fileSizeBytes) || 0,
      };
    });
    if (list.length > 0) out.attachments = JSON.stringify(list);
    // Surface the passport photo (type 5) on the Stage 1 preview too.
    const photo = attachments.find((a) => Number(a.attachmentTypeId) === PHOTO_TYPE_ID);
    if (photo?.fileUrl) {
      out.stage1PhotoData = str(photo.fileUrl);
      out.passportPhotoUploaded = "true";
    }
    return out;
  }

  return out;
}
