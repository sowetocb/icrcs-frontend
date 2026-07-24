import type { Locale } from "@/app/i18n/messages";

/**
 * English → Swahili labels for the backend lookup lists.
 *
 * The lookup endpoints return English names with no stable id we can key a
 * translation on, so we key on a NORMALIZED English name (lower-cased, with
 * punctuation/spacing stripped) — minor spelling/spacing differences between the
 * backend value and this table still resolve. Anything unmapped falls back to
 * the backend name, so a new lookup row still renders sensibly.
 *
 * Maps are scoped BY CATEGORY because the same English word can mean different
 * things in different lookups — e.g. "Sister" is a sibling (Dada) in the
 * relationship list but a nun (Mtawa) in the occupation list.
 *
 * IMPORTANT: only the visible LABEL is translated. The stored option value stays
 * the backend id / English name, so submissions are unaffected by the locale.
 */
export type LookupCategory =
  | "gender"
  | "relationship"
  | "travelDoc"
  | "citizenship"
  | "marital"
  | "education"
  | "occupation";

// The gender lookup can return a bare name ("Female") or a bilingual one
// ("Ke (Female)") — both normalize to a form we can match.
const GENDER: [string, string][] = [
  ["Female", "Mwanamke"],
  ["Male", "Mwanaume"],
  ["Other", "Nyingine"],
  ["Ke (Female)", "Mwanamke"],
  ["Me (Male)", "Mwanaume"],
];

const RELATIONSHIP: [string, string][] = [
  ["Grandmother", "Bibi"],
  ["Grandfather", "Babu"],
  ["Husband", "Mume"],
  ["Wife", "Mke"],
  ["Daughter", "Binti"],
  ["Son", "Mwana"],
  ["Sister", "Dada"],
  ["Brother", "Kaka"],
  ["Mother", "Mama"],
  ["Father", "Baba"],
  ["Uncle", "Mjomba / Baba mdogo"],
  ["Aunt", "Shangazi / Mama mdogo"],
  ["Niece", "Mpwa wa kike"],
  ["Cousin", "Binamu"],
  ["Paternal Uncle", "Baba mdogo / Baba mkubwa"],
  ["Maternal Aunt", "Mama mdogo / Mama mkubwa"],
  ["Guardian", "Mlezi"],
  ["Head of House", "Mkuu wa kaya"],
];

const TRAVEL_DOC: [string, string][] = [
  ["Emergency Travel Document", "Hati ya Kusafiria ya Dharura"],
  ["Certificate of Identity", "Cheti cha Utambulisho"],
  ["Geneva Conversion Travel Document", "Hati ya kusafiria ya Mkutano wa Geneva"],
  ["Laissez passer", "Laissez-passer"],
  ["Passport", "Pasipoti"],
  ["Ordinary Passport", "Pasipoti ya Kawaida"],
  ["Special Passport", "Pasipoti Maalumu"],
  ["Diplomatic Passport", "Pasipoti ya Kidiplomasia"],
  ["Service Passport", "Pasipoti ya Kiutumishi"],
];

const CITIZENSHIP: [string, string][] = [
  ["Descent", "Kwa Kurithi"],
  ["Naturalization", "Kwa Kuandikishwa"],
  ["Birth", "Kwa Kuzaliwa"],
];

const MARITAL: [string, string][] = [
  ["Single", "Sijaolewa / Sijaoa"],
  ["Married", "Nimeolewa / Nimeoa"],
  ["Divorced", "Mtalaka"],
  ["Widowed", "Mjane"],
  ["Separated", "Tumetengana"],
];

const EDUCATION: [string, string][] = [
  ["Diploma", "Stashahada"],
  ["Postgraduate Degree", "Shahada ya Uzamili"],
  ["Undergraduate Degree", "Shahada ya Kwanza"],
  ["Certificate", "Astashahada"],
  ["Vocational Training", "Mafunzo ya Ufundi"],
  ["Advanced Level Education", "Kidato cha 5 & 6"],
  ["Ordinary Level Education", "Kidato cha 1 - 4"],
  ["Primary Education", "Elimu ya Msingi"],
  ["Pre-Primary", "Elimu ya Awali"],
  ["Doctorate (PhD)", "Shahada ya Uzamivu (PhD)"],
];

const OCCUPATION: [string, string][] = [
  ["Government Employee", "Mwajiriwa wa Serikali"],
  ["Private Sector Employee", "Mwajiriwa wa Sekta Binafsi"],
  ["Self Employed", "Mjasiriamali"],
  ["Fisherman", "Mvuvi"],
  ["Teacher / Lecturer", "Mwalimu / Mhadhiri"],
  ["Teacher", "Mwalimu"],
  ["Lecturer", "Mhadhiri"],
  ["Dentist", "Daktari wa Meno"],
  ["Engineer", "Mhandisi"],
  ["Lawyer", "Mwanasheria / Wakili"],
  ["Accountant", "Mhasibu"],
  ["Driver", "Dereva"],
  ["Trader / Vendor", "Mfanyabiashara"],
  ["Artisan / Craftsman", "Mfundi"],
  ["Student", "Mwanafunzi"],
  ["Unemployed", "Hana Kazi"],
  ["Retired", "Mstaafu"],
  ["Religious Leader", "Kiongozi wa Dini"],
  ["Military / Police", "Mwanajeshi / Polisi"],
  ["Other", "Nyinginezo"],
  ["Others", "Nyinginezo"],
  ["Minor", "Mtoto / Mdogo"],
  ["Religious", "Mtumishi wa Dini"],
  ["Agronomist", "Mtaalamu wa Kilimo"],
  ["Environmentalist", "Mtaalamu wa Mazingira"],
  ["Photographer", "Mpiga Picha"],
  ["Sports & Games", "Wanamichezo / Michezo"],
  ["House Maid", "Mfanyakazi wa Ndani"],
  ["Auditor", "Mkaguzi wa Hesabu"],
  ["Banker / Cashier", "Mfanyakazi wa Benki / Mweka Hazina"],
  ["Business Woman", "Mfanyabiashara wa Kike"],
  ["Business Man", "Mfanyabiashara wa Kiume"],
  ["Cabin Crew", "Wahudumu wa Ndege"],
  ["Carpenter", "Seremala"],
  ["Clerk", "Karani"],
  ["Chef", "Mpishi Mkuu"],
  ["Finance", "Mtaalamu wa Fedha"],
  ["Information Technology", "Teknolojia ya Habari (TEHAMA)"],
  ["Geologist", "Mtaalamu wa Miamba (Jiolojia)"],
  ["Economist", "Mchumi"],
  ["Director", "Mkurugenzi"],
  ["Diplomat", "Mwanadiplomasia"],
  ["Designer", "Mbunifu"],
  ["Peasant", "Mkulima"],
  ["Mechanics", "Mfundi Mitambo / Mekanika"],
  ["Manager", "Meneja"],
  ["Social Worker", "Afisa Maendeleo ya Jamii / Mfanyakazi wa Jamii"],
  ["Psychologist", "Mtaalamu wa Saikolojia"],
  ["Pilot", "Rubani"],
  ["Tour Guide", "Mwongoza Watalii"],
  ["Tailor", "Mshoni"],
  ["Scientist", "Mwanasayansi"],
  ["Researcher", "Mtafiti"],
  ["Project Manager", "Meneja Mradi"],
  ["Program Officer", "Afisa Mpango"],
  ["Journalist", "Mwandishi wa Habari"],
  ["Nurse", "Muuguzi"],
  ["Technician", "Fundi Sanifu"],
  ["Doctor", "Daktari"],
  ["Artist", "Msanii"],
  // Occupations present in the backend list but not in the supplied glossary —
  // kept so they don't regress to English when the locale is Swahili.
  ["Professional", "Mtaalamu"],
  ["Priest/Pastor", "Padri / Mchungaji"],
  ["Farmer", "Mkulima"],
  ["Civil servant", "Mtumishi wa Umma"],
  ["House Wife", "Mama wa Nyumbani"],
  ["Consultant", "Mshauri"],
  ["Sea Man", "Baharia"],
  ["Professor", "Profesa"],
  ["Sales / Marketing", "Mauzo / Masoko"],
  ["Architect", "Mbunifu Majengo"],
  ["Administrator", "Msimamizi"],
  ["Missionary", "Mmisionari"],
  ["Sister", "Mtawa (Sista)"],
  // Backend spelling variants — the normalized match only strips punctuation and
  // spacing (it can't fix typos), so map the misspelled forms explicitly.
  ["Reseacher", "Mtafiti"],
  ["Infomation Technology", "Teknolojia ya Habari (TEHAMA)"],
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const toMap = (pairs: [string, string][]) =>
  new Map(pairs.map(([en, sw]) => [norm(en), sw]));

const MAPS: Record<LookupCategory, Map<string, string>> = {
  gender: toMap(GENDER),
  relationship: toMap(RELATIONSHIP),
  travelDoc: toMap(TRAVEL_DOC),
  citizenship: toMap(CITIZENSHIP),
  marital: toMap(MARITAL),
  education: toMap(EDUCATION),
  occupation: toMap(OCCUPATION),
};

/** Localize a backend lookup NAME for display. Returns the original name for
 * `en` or when the category has no translation for it. */
export function localizeLookup(
  name: string,
  category: LookupCategory,
  locale: Locale,
): string {
  if (locale !== "sw" || !name) return name;
  return MAPS[category].get(norm(name)) ?? name;
}
