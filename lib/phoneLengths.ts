// National significant number length (min/max digits, excluding the country
// dialing code) per country, keyed by the international dialing code. Sourced
// from the per-country phone-length reference. Used to cap and validate phone
// entry against the selected country.

import { COUNTRIES } from "@/lib/countries";

export type PhoneLength = { min: number; max: number };

// Keyed by numeric dialing code (e.g. 255 = Tanzania). Where several countries
// share a code (1, 7) the values match, so a single entry suffices.
// National significant number (NSN) length — min/max digits AFTER the country
// dialing code — for every dialing code the country picker offers (lib/countries.ts).
// Ranges are slightly generous where a country uses variable-length numbers, so a
// valid number is never rejected; the E.164 total (code + NSN) stays ≤ 15.
// The +1 NANP islands key on "1"+area code, so their NSN is the 7-digit subscriber
// number; plain "1" (US/Canada) is the full 10-digit number.
export const PHONE_LENGTHS: Record<number, PhoneLength> = {
  1: { min: 10, max: 10 },   // United States / Canada (NANP)
  7: { min: 10, max: 10 },   // Russia / Kazakhstan
  20: { min: 9, max: 10 },   // Egypt
  27: { min: 9, max: 9 },    // South Africa
  30: { min: 10, max: 10 },  // Greece
  31: { min: 9, max: 9 },    // Netherlands
  32: { min: 8, max: 9 },    // Belgium
  33: { min: 9, max: 9 },    // France
  34: { min: 9, max: 9 },    // Spain
  36: { min: 8, max: 9 },    // Hungary
  39: { min: 6, max: 11 },   // Italy
  40: { min: 9, max: 9 },    // Romania
  41: { min: 9, max: 9 },    // Switzerland
  43: { min: 4, max: 13 },   // Austria
  44: { min: 9, max: 10 },   // United Kingdom
  45: { min: 8, max: 8 },    // Denmark
  46: { min: 6, max: 10 },   // Sweden
  47: { min: 8, max: 8 },    // Norway
  48: { min: 9, max: 9 },    // Poland
  49: { min: 6, max: 11 },   // Germany
  51: { min: 8, max: 9 },    // Peru
  52: { min: 10, max: 10 },  // Mexico
  53: { min: 6, max: 8 },    // Cuba
  54: { min: 10, max: 11 },  // Argentina
  55: { min: 10, max: 11 },  // Brazil
  56: { min: 9, max: 9 },    // Chile
  57: { min: 10, max: 10 },  // Colombia
  58: { min: 10, max: 10 },  // Venezuela
  60: { min: 7, max: 10 },   // Malaysia
  61: { min: 9, max: 9 },    // Australia
  62: { min: 9, max: 12 },   // Indonesia
  63: { min: 10, max: 10 },  // Philippines
  64: { min: 8, max: 10 },   // New Zealand
  65: { min: 8, max: 8 },    // Singapore
  66: { min: 8, max: 9 },    // Thailand
  81: { min: 10, max: 10 },  // Japan
  82: { min: 9, max: 10 },   // South Korea
  84: { min: 9, max: 10 },   // Vietnam
  86: { min: 7, max: 11 },   // China
  90: { min: 10, max: 10 },  // Turkey
  91: { min: 10, max: 10 },  // India
  92: { min: 10, max: 10 },  // Pakistan
  93: { min: 9, max: 9 },    // Afghanistan
  94: { min: 9, max: 9 },    // Sri Lanka
  95: { min: 7, max: 10 },   // Myanmar
  98: { min: 10, max: 10 },  // Iran
  211: { min: 9, max: 9 },   // South Sudan
  212: { min: 9, max: 9 },   // Morocco
  213: { min: 9, max: 9 },   // Algeria
  216: { min: 8, max: 8 },   // Tunisia
  218: { min: 8, max: 9 },   // Libya
  220: { min: 7, max: 7 },   // Gambia
  221: { min: 9, max: 9 },   // Senegal
  222: { min: 8, max: 8 },   // Mauritania
  223: { min: 8, max: 8 },   // Mali
  224: { min: 8, max: 9 },   // Guinea
  225: { min: 8, max: 10 },  // Côte d'Ivoire
  226: { min: 8, max: 8 },   // Burkina Faso
  227: { min: 8, max: 8 },   // Niger
  228: { min: 8, max: 8 },   // Togo
  229: { min: 8, max: 10 },  // Benin
  230: { min: 7, max: 8 },   // Mauritius
  231: { min: 7, max: 9 },   // Liberia
  232: { min: 8, max: 8 },   // Sierra Leone
  233: { min: 9, max: 9 },   // Ghana
  234: { min: 8, max: 10 },  // Nigeria
  235: { min: 8, max: 8 },   // Chad
  236: { min: 8, max: 8 },   // Central African Republic
  237: { min: 9, max: 9 },   // Cameroon
  238: { min: 7, max: 7 },   // Cabo Verde
  239: { min: 7, max: 7 },   // Sao Tome and Principe
  240: { min: 9, max: 9 },   // Equatorial Guinea
  241: { min: 7, max: 8 },   // Gabon
  242: { min: 9, max: 9 },   // Congo (Brazzaville)
  243: { min: 9, max: 9 },   // Congo (Kinshasa)
  244: { min: 9, max: 9 },   // Angola
  245: { min: 7, max: 7 },   // Guinea-Bissau
  248: { min: 7, max: 7 },   // Seychelles
  249: { min: 9, max: 9 },   // Sudan
  250: { min: 9, max: 9 },   // Rwanda
  251: { min: 9, max: 9 },   // Ethiopia
  252: { min: 7, max: 9 },   // Somalia
  253: { min: 8, max: 8 },   // Djibouti
  254: { min: 9, max: 9 },   // Kenya
  255: { min: 9, max: 9 },   // Tanzania
  256: { min: 9, max: 9 },   // Uganda
  257: { min: 8, max: 8 },   // Burundi
  258: { min: 8, max: 9 },   // Mozambique
  260: { min: 9, max: 9 },   // Zambia
  261: { min: 9, max: 10 },  // Madagascar
  263: { min: 9, max: 9 },   // Zimbabwe
  264: { min: 8, max: 9 },   // Namibia
  265: { min: 9, max: 9 },   // Malawi
  266: { min: 8, max: 8 },   // Lesotho
  267: { min: 7, max: 8 },   // Botswana
  268: { min: 8, max: 8 },   // Eswatini
  269: { min: 7, max: 7 },   // Comoros
  291: { min: 7, max: 7 },   // Eritrea
  351: { min: 9, max: 9 },   // Portugal
  352: { min: 6, max: 9 },   // Luxembourg
  353: { min: 7, max: 9 },   // Ireland
  354: { min: 7, max: 7 },   // Iceland
  355: { min: 8, max: 9 },   // Albania
  356: { min: 8, max: 8 },   // Malta
  357: { min: 8, max: 8 },   // Cyprus
  358: { min: 5, max: 12 },  // Finland
  359: { min: 8, max: 9 },   // Bulgaria
  370: { min: 8, max: 8 },   // Lithuania
  371: { min: 8, max: 8 },   // Latvia
  372: { min: 7, max: 8 },   // Estonia
  373: { min: 8, max: 8 },   // Moldova
  374: { min: 8, max: 8 },   // Armenia
  375: { min: 9, max: 9 },   // Belarus
  376: { min: 6, max: 6 },   // Andorra
  377: { min: 8, max: 9 },   // Monaco
  378: { min: 6, max: 10 },  // San Marino
  380: { min: 9, max: 9 },   // Ukraine
  381: { min: 8, max: 9 },   // Serbia
  382: { min: 8, max: 8 },   // Montenegro
  385: { min: 8, max: 9 },   // Croatia
  386: { min: 8, max: 8 },   // Slovenia
  387: { min: 8, max: 8 },   // Bosnia and Herzegovina
  389: { min: 8, max: 8 },   // North Macedonia
  420: { min: 9, max: 9 },   // Czechia
  421: { min: 9, max: 9 },   // Slovakia
  423: { min: 7, max: 7 },   // Liechtenstein
  501: { min: 7, max: 7 },   // Belize
  502: { min: 8, max: 8 },   // Guatemala
  503: { min: 8, max: 8 },   // El Salvador
  504: { min: 8, max: 8 },   // Honduras
  505: { min: 8, max: 8 },   // Nicaragua
  506: { min: 8, max: 8 },   // Costa Rica
  507: { min: 7, max: 8 },   // Panama
  509: { min: 8, max: 8 },   // Haiti
  591: { min: 8, max: 8 },   // Bolivia
  592: { min: 7, max: 7 },   // Guyana
  593: { min: 8, max: 9 },   // Ecuador
  595: { min: 9, max: 9 },   // Paraguay
  597: { min: 6, max: 7 },   // Suriname
  598: { min: 8, max: 8 },   // Uruguay
  670: { min: 7, max: 8 },   // Timor-Leste
  673: { min: 7, max: 7 },   // Brunei
  674: { min: 7, max: 7 },   // Nauru
  675: { min: 8, max: 8 },   // Papua New Guinea
  676: { min: 5, max: 7 },   // Tonga
  677: { min: 7, max: 7 },   // Solomon Islands
  678: { min: 5, max: 7 },   // Vanuatu
  679: { min: 7, max: 7 },   // Fiji
  680: { min: 7, max: 7 },   // Palau
  685: { min: 5, max: 7 },   // Samoa
  686: { min: 5, max: 8 },   // Kiribati
  688: { min: 5, max: 6 },   // Tuvalu
  691: { min: 7, max: 7 },   // Micronesia
  692: { min: 7, max: 7 },   // Marshall Islands
  850: { min: 8, max: 10 },  // North Korea
  852: { min: 8, max: 8 },   // Hong Kong
  855: { min: 8, max: 9 },   // Cambodia
  856: { min: 8, max: 10 },  // Laos
  880: { min: 6, max: 10 },  // Bangladesh
  886: { min: 9, max: 9 },   // Taiwan
  960: { min: 7, max: 7 },   // Maldives
  961: { min: 7, max: 8 },   // Lebanon
  962: { min: 9, max: 9 },   // Jordan
  963: { min: 8, max: 9 },   // Syria
  964: { min: 10, max: 10 }, // Iraq
  965: { min: 8, max: 8 },   // Kuwait
  966: { min: 9, max: 9 },   // Saudi Arabia
  967: { min: 7, max: 9 },   // Yemen
  968: { min: 8, max: 8 },   // Oman
  970: { min: 9, max: 9 },   // Palestine
  971: { min: 9, max: 9 },   // United Arab Emirates
  972: { min: 9, max: 9 },   // Israel
  973: { min: 8, max: 8 },   // Bahrain
  974: { min: 8, max: 8 },   // Qatar
  975: { min: 7, max: 8 },   // Bhutan
  976: { min: 8, max: 8 },   // Mongolia
  977: { min: 8, max: 10 },  // Nepal
  992: { min: 9, max: 9 },   // Tajikistan
  993: { min: 8, max: 8 },   // Turkmenistan
  994: { min: 9, max: 9 },   // Azerbaijan
  995: { min: 9, max: 9 },   // Georgia
  996: { min: 9, max: 9 },   // Kyrgyzstan
  998: { min: 9, max: 9 },   // Uzbekistan
  1242: { min: 7, max: 7 },  // Bahamas
  1246: { min: 7, max: 7 },  // Barbados
  1268: { min: 7, max: 7 },  // Antigua and Barbuda
  1473: { min: 7, max: 7 },  // Grenada
  1758: { min: 7, max: 7 },  // Saint Lucia
  1767: { min: 7, max: 7 },  // Dominica
  1784: { min: 7, max: 7 },  // Saint Vincent and the Grenadines
  1809: { min: 7, max: 7 },  // Dominican Republic
  1868: { min: 7, max: 7 },  // Trinidad and Tobago
  1869: { min: 7, max: 7 },  // Saint Kitts and Nevis
  1876: { min: 7, max: 7 },  // Jamaica
};

// Fallback national-number length for countries not in the table above.
// max 12: E.164 caps the WHOLE international number (country code + national) at
// 15 digits, so with a 3-digit code (e.g. +241) the national part can be at most
// 12 — and no real national number is that long anyway. min 6 rejects obviously
// too-short entries. (A 1/2-digit code leaves a little slack under 15, which is
// fine — the fallback is deliberately loose but never IMPOSSIBLE.)
const DEFAULT_LENGTH: PhoneLength = { min: 6, max: 12 };

/** Look up the national number length for a dial string like "+255" or "255". */
export function phoneLengthForDial(dial: string): PhoneLength {
  const code = Number(dial.replace(/\D/g, ""));
  return PHONE_LENGTHS[code] ?? DEFAULT_LENGTH;
}

/** Whether a stored phone ("+255 736 437 1") has a national-number length valid
 * for its country. Empty values are treated as valid (required-ness is enforced
 * separately). The dialing code is matched against the full country list, so a
 * country NOT in PHONE_LENGTHS is still length-checked against DEFAULT_LENGTH
 * (previously such numbers skipped validation entirely). */
export function isPhoneComplete(stored: string): boolean {
  const digits = stored.replace(/\D/g, "");
  if (!digits) return true;
  // Longest dialing-code prefix match from the full country list.
  let best = 0;
  for (const c of COUNTRIES) {
    const d = c.dial.replace(/\D/g, "");
    if (d && digits.startsWith(d) && d.length > best) best = d.length;
  }
  if (best === 0) return true; // dialing code unknown — can't split, don't flag
  const nationalLen = digits.length - best;
  const { min, max } = PHONE_LENGTHS[Number(digits.slice(0, best))] ?? DEFAULT_LENGTH;
  return nationalLen >= min && nationalLen <= max;
}
