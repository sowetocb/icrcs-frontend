/**
 * lib/validation/iso3166.ts
 *
 * REGISTRATION_COUNTRY_CODE_UNKNOWN fires when a country code is
 * shape-valid (3 uppercase letters) but doesn't exist. The backend validates
 * against a real ISO-3166-1 alpha-3 list / its /v1/lookup/countries endpoint.
 *
 * NOTE: this app resolves country codes via lib/iso3.ts (a full alpha-2 ->
 * alpha-3 map) and the live getCountries() lookup, so this static list is a
 * fallback/reference used by the Zod schemas. Keep in sync with the backend.
 */

export const ISO3_COUNTRIES: Record<string, string> = {
  TZA: 'Tanzania',
  KEN: 'Kenya',
  UGA: 'Uganda',
  RWA: 'Rwanda',
  BDI: 'Burundi',
  COD: 'DR Congo',
  ZMB: 'Zambia',
  MWI: 'Malawi',
  MOZ: 'Mozambique',
  ZAF: 'South Africa',
  SOM: 'Somalia',
  ETH: 'Ethiopia',
  GBR: 'United Kingdom',
  USA: 'United States',
  CAN: 'Canada',
  IND: 'India',
  CHN: 'China',
  ARE: 'United Arab Emirates',
  DEU: 'Germany',
  FRA: 'France',
  NLD: 'Netherlands',
  // Extend or replace with a lookup-endpoint-backed list.
};

export function isValidIso3(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(ISO3_COUNTRIES, code);
}
