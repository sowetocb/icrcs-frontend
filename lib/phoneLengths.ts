// National significant number length (min/max digits, excluding the country
// dialing code) per country, keyed by the international dialing code. Sourced
// from the per-country phone-length reference. Used to cap and validate phone
// entry against the selected country.

export type PhoneLength = { min: number; max: number };

// Keyed by numeric dialing code (e.g. 255 = Tanzania). Where several countries
// share a code (1, 7) the values match, so a single entry suffices.
export const PHONE_LENGTHS: Record<number, PhoneLength> = {
  91: { min: 7, max: 10 },   // India
  86: { min: 5, max: 12 },   // China
  1: { min: 10, max: 10 },   // US / Canada / Dominican Republic
  62: { min: 5, max: 10 },   // Indonesia
  92: { min: 8, max: 11 },   // Pakistan
  234: { min: 7, max: 10 },  // Nigeria
  55: { min: 10, max: 10 },  // Brazil
  880: { min: 6, max: 10 },  // Bangladesh
  7: { min: 10, max: 10 },   // Russia / Kazakhstan
  251: { min: 9, max: 9 },   // Ethiopia
  52: { min: 10, max: 10 },  // Mexico
  81: { min: 5, max: 13 },   // Japan
  20: { min: 7, max: 9 },    // Egypt
  63: { min: 8, max: 10 },   // Philippines
  243: { min: 5, max: 9 },   // DR Congo
  84: { min: 7, max: 10 },   // Vietnam
  98: { min: 6, max: 10 },   // Iran
  90: { min: 10, max: 10 },  // Turkey
  49: { min: 6, max: 13 },   // Germany
  66: { min: 8, max: 9 },    // Thailand
  44: { min: 7, max: 10 },   // United Kingdom
  255: { min: 9, max: 9 },   // Tanzania
  33: { min: 9, max: 9 },    // France
  27: { min: 9, max: 9 },    // South Africa
  39: { min: 1, max: 11 },   // Italy
  254: { min: 6, max: 10 },  // Kenya
  95: { min: 7, max: 9 },    // Myanmar
  57: { min: 8, max: 10 },   // Colombia
  82: { min: 8, max: 11 },   // South Korea
  249: { min: 9, max: 9 },   // Sudan
  256: { min: 9, max: 9 },   // Uganda
  34: { min: 9, max: 9 },    // Spain
  213: { min: 8, max: 9 },   // Algeria
  964: { min: 8, max: 10 },  // Iraq
  54: { min: 10, max: 10 },  // Argentina
  93: { min: 9, max: 9 },    // Afghanistan
  967: { min: 6, max: 9 },   // Yemen
  48: { min: 6, max: 9 },    // Poland
  212: { min: 9, max: 9 },   // Morocco
  244: { min: 9, max: 9 },   // Angola
  380: { min: 9, max: 9 },   // Ukraine
  998: { min: 9, max: 9 },   // Uzbekistan
  60: { min: 7, max: 9 },    // Malaysia
  258: { min: 8, max: 9 },   // Mozambique
  233: { min: 5, max: 9 },   // Ghana
  51: { min: 8, max: 11 },   // Peru
  966: { min: 8, max: 9 },   // Saudi Arabia
  261: { min: 9, max: 10 },  // Madagascar
  225: { min: 8, max: 8 },   // Ivory Coast
  977: { min: 8, max: 9 },   // Nepal
  237: { min: 8, max: 8 },   // Cameroon
  58: { min: 10, max: 10 },  // Venezuela
  227: { min: 8, max: 8 },   // Niger
  61: { min: 5, max: 15 },   // Australia
  850: { min: 6, max: 17 },  // North Korea
  963: { min: 8, max: 10 },  // Syria
  223: { min: 8, max: 8 },   // Mali
  226: { min: 8, max: 8 },   // Burkina Faso
  886: { min: 8, max: 9 },   // Taiwan
  94: { min: 9, max: 9 },    // Sri Lanka
  265: { min: 7, max: 8 },   // Malawi
  260: { min: 9, max: 9 },   // Zambia
  235: { min: 8, max: 8 },   // Chad
  56: { min: 8, max: 9 },    // Chile
  40: { min: 9, max: 9 },    // Romania
  252: { min: 5, max: 8 },   // Somalia
  221: { min: 9, max: 9 },   // Senegal
  502: { min: 8, max: 8 },   // Guatemala
  31: { min: 9, max: 9 },    // Netherlands
  593: { min: 8, max: 8 },   // Ecuador
  855: { min: 8, max: 8 },   // Cambodia
  263: { min: 5, max: 10 },  // Zimbabwe
  224: { min: 8, max: 8 },   // Guinea
  229: { min: 8, max: 8 },   // Benin
  250: { min: 9, max: 9 },   // Rwanda
  257: { min: 8, max: 8 },   // Burundi
  591: { min: 8, max: 8 },   // Bolivia
  216: { min: 8, max: 8 },   // Tunisia
  509: { min: 8, max: 8 },   // Haiti
  32: { min: 8, max: 9 },    // Belgium
  962: { min: 5, max: 9 },   // Jordan
  971: { min: 8, max: 9 },   // United Arab Emirates
  53: { min: 6, max: 8 },    // Cuba
  504: { min: 8, max: 8 },   // Honduras
  420: { min: 4, max: 12 },  // Czech Republic
  46: { min: 7, max: 13 },   // Sweden
  992: { min: 9, max: 9 },   // Tajikistan
  675: { min: 4, max: 11 },  // Papua New Guinea
  351: { min: 9, max: 11 },  // Portugal
  994: { min: 8, max: 9 },   // Azerbaijan
  30: { min: 10, max: 10 },  // Greece
  36: { min: 8, max: 9 },    // Hungary
  228: { min: 8, max: 8 },   // Togo
  972: { min: 8, max: 9 },   // Israel
  43: { min: 4, max: 13 },   // Austria
  375: { min: 9, max: 10 },  // Belarus
  41: { min: 4, max: 12 },   // Switzerland
  232: { min: 8, max: 8 },   // Sierra Leone
  856: { min: 8, max: 10 },  // Laos
  993: { min: 8, max: 8 },   // Turkmenistan
  852: { min: 4, max: 9 },   // Hong Kong
  218: { min: 8, max: 9 },   // Libya
};

// E.164 allows up to 15 national digits; used when a country isn't in the table.
const DEFAULT_LENGTH: PhoneLength = { min: 4, max: 15 };

/** Look up the national number length for a dial string like "+255" or "255". */
export function phoneLengthForDial(dial: string): PhoneLength {
  const code = Number(dial.replace(/\D/g, ""));
  return PHONE_LENGTHS[code] ?? DEFAULT_LENGTH;
}

/** Whether a stored phone ("+255 736 437 1") has a national-number length valid
 * for its country. Empty values are treated as valid (required-ness is enforced
 * separately). When the dialing code can't be matched, it isn't flagged. */
export function isPhoneComplete(stored: string): boolean {
  const digits = stored.replace(/\D/g, "");
  if (!digits) return true;
  // Longest dialing-code prefix match → the national digits are the remainder.
  let best = 0;
  for (const code of Object.keys(PHONE_LENGTHS)) {
    if (digits.startsWith(code) && code.length > best) best = code.length;
  }
  if (best === 0) return true;
  const nationalLen = digits.length - best;
  const { min, max } = PHONE_LENGTHS[Number(digits.slice(0, best))];
  return nationalLen >= min && nationalLen <= max;
}
