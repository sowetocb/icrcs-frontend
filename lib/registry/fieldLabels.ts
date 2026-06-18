// Maps registry field names (e.g. "applicantFirst", "ec1ResWard",
// "fatherNatCountry") to human-readable, localized labels so the wizard can
// tell the user *exactly* which fields they skipped — not just highlight them.

type Translate = (path: string) => string;

// Fields whose name is matched exactly (the account holder's own fields, the
// address cascades, and standalone fields).
const EXACT = new Set([
  "stage1PhotoData",
  "gender",
  "dob",
  "nationalityCountry",
  "pobCountry",
  "pobWard",
  "pobStreet",
  "pobCityVillage",
  "marriage",
  "phone",
  "email",
  "permRegion",
  "permDistrict",
  "permWard",
  "permCountry",
  "permCity",
  "curRegion",
  "curDistrict",
  "curWard",
  "curCountry",
  "curCity",
  "jobStatus",
]);

// Suffix (the part after a person prefix) → i18n suffix key.
const SUFFIX: Record<string, string> = {
  First: "sFirst",
  Middle: "sMiddle",
  Last: "sLast",
  Gender: "sGender",
  NatCountry: "sNatCountry",
  Phone: "sPhone",
  RelType: "sRelType",
  PobCountry: "sPobCountry",
  PobWard: "sPobWard",
  Village: "sVillage",
  ResCountry: "sResCountry",
  ResWard: "sResWard",
  ResStreet: "sResStreet",
  ResCity: "sResCity",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Resolve a single field name to a readable label. */
function fieldLabel(name: string, t: Translate): string {
  if (EXACT.has(name)) return t(`flabel.${name}`);

  // Spouse / child — "sp1First", "ch2ResWard".
  let m = name.match(/^(sp|ch)(\d+)([A-Za-z]+)$/);
  if (m && SUFFIX[m[3]]) {
    const who = m[1] === "sp" ? t("flabel.spouse") : t("flabel.child");
    return `${who} ${m[2]} ${t(`flabel.${SUFFIX[m[3]]}`)}`;
  }

  // Named relatives — "fatherFirst", "ec1ResWard", "rel2Phone".
  m = name.match(/^(ec1|ec2|rel1|rel2|father|mother)([A-Za-z]+)$/);
  if (m && SUFFIX[m[2]]) {
    return `${t(`flabel.${m[1]}`)} ${t(`flabel.${SUFFIX[m[2]]}`)}`;
  }

  // The account holder's own name fields — "applicantFirst".
  m = name.match(/^applicant([A-Za-z]+)$/);
  if (m && SUFFIX[m[1]]) {
    return capitalize(t(`flabel.${SUFFIX[m[1]]}`));
  }

  return t("flabel.fallback");
}

/**
 * Turn a list of missing field names into a de-duplicated list of readable
 * labels, ready to show the user which specific items they skipped.
 */
export function missingFieldLabels(names: string[], t: Translate): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const label = fieldLabel(name, t);
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}
