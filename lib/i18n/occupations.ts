import type { Locale } from "@/app/i18n/messages";

/**
 * English → Swahili labels for the occupation lookup.
 *
 * Occupations come from the backend (`/lookup/occupations`) as English names,
 * so — unlike the small enum-style lookups — there is no id we can key a
 * translation on. Instead we key on a NORMALIZED English name (lower-cased,
 * punctuation/spacing stripped) so minor spelling differences between the
 * backend value and this table still resolve. Anything without a match falls
 * back to the backend name, so an unknown occupation still renders sensibly.
 */
const PAIRS: [string, string][] = [
  ["Professional", "Mtaalamu"],
  ["Others", "Nyingine"],
  ["Other", "Nyingine"],
  ["Teacher", "Mwalimu"],
  ["Accountant", "Mhasibu"],
  ["Engineer", "Mhandisi"],
  ["Lawyer", "Mwanasheria"],
  ["Priest/Pastor", "Padri/Mchungaji"],
  ["Artist", "Msanii"],
  ["Doctor", "Daktari"],
  ["Student", "Mwanafunzi"],
  ["Farmer", "Mkulima"],
  ["Driver", "Dereva"],
  ["Sister", "Mtawa (Sista)"],
  ["Technician", "Fundi"],
  ["Nurse", "Muuguzi"],
  ["Civil servant", "Mtumishi wa Umma"],
  ["Journalist", "Mwandishi wa Habari"],
  ["House Wife", "Mama wa Nyumbani"],
  ["Consultant", "Mshauri"],
  ["Program Officer", "Afisa wa Programu"],
  ["Retired", "Mstaafu"],
  ["Project Manager", "Meneja wa Mradi"],
  ["Researcher", "Mtafiti"],
  ["Scientist", "Mwanasayansi"],
  ["Tailor", "Fundi Cherehani"],
  ["Tour Guide", "Mwongoza Watalii"],
  ["Sea Man", "Baharia"],
  ["Pilot", "Rubani"],
  ["Professor", "Profesa"],
  ["Psychologist", "Mwanasaikolojia"],
  ["Sales / Marketing", "Mauzo / Masoko"],
  ["Social Worker", "Mfanyakazi wa Jamii"],
  ["Lecturer", "Mhadhiri"],
  ["Manager", "Meneja"],
  ["Mechanics", "Fundi Mitambo"],
  ["Peasant", "Mkulima Mdogo"],
  ["Designer", "Mbunifu"],
  ["Diplomat", "Mwanadiplomasia"],
  ["Director", "Mkurugenzi"],
  ["Economist", "Mchumi"],
  ["Finance", "Fedha"],
  ["Geologist", "Mwanajiolojia"],
  ["Information Technology", "Teknolojia ya Habari"],
  ["Dentist", "Daktari wa Meno"],
  ["Clerk", "Karani"],
  ["Chef", "Mpishi"],
  ["Carpenter", "Seremala"],
  ["Cabin Crew", "Mhudumu wa Ndege"],
  ["Business Man", "Mfanyabiashara"],
  ["Business Woman", "Mfanyabiashara (Mwanamke)"],
  ["Banker / Cashier", "Mfanyakazi wa Benki / Keshia"],
  ["Auditor", "Mkaguzi wa Hesabu"],
  ["Architect", "Mbunifu Majengo"],
  ["Administrator", "Msimamizi"],
  ["House Maid", "Mfanyakazi wa Nyumbani"],
  ["Sports & Games", "Michezo"],
  ["Photographer", "Mpiga Picha"],
  ["Environmentalist", "Mtaalamu wa Mazingira"],
  ["Minor", "Mtoto (Chini ya Umri)"],
  ["Missionary", "Mmisionari"],
  ["Agronomist", "Mtaalamu wa Kilimo"],
  ["Trader / Vendor", "Mfanyabiashara / Muuzaji"],
  ["Artisan / Craftsman", "Fundi Stadi"],
  ["Military / Police", "Jeshi / Polisi"],
  // Backend spelling variants — the source lookup misspells these, and the
  // normalized match only strips punctuation/spacing (it can't fix typos), so
  // we map the misspelled forms explicitly to the correct Swahili term.
  ["Reseacher", "Mtafiti"],
  ["Infomation Technology", "Teknolojia ya Habari"],
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const SW_BY_NAME = new Map(PAIRS.map(([en, sw]) => [norm(en), sw]));

/** Localize a backend occupation name; falls back to the name for `en` or an
 * unmapped occupation. */
export function localizeOccupation(name: string, locale: Locale): string {
  if (locale !== "sw") return name;
  return SW_BY_NAME.get(norm(name)) ?? name;
}
