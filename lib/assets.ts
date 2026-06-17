// Centralised brand asset URLs.
//
// The logo files keep the same filename when replaced, so browsers (and any
// CDN/proxy) would otherwise serve a stale cached copy. Appending a version
// query string forces a fresh fetch. BUMP `ASSET_VERSION` every time you
// overwrite a same-named asset in /public.
export const ASSET_VERSION = "2";

const v = (path: string) => `${path}?v=${ASSET_VERSION}`;

/** Immigration Services Department emblem (header, login, printable form). */
export const LOGO_EMBLEM = v("/logo/immigrationEmblem.png");

/** National coat of arms. */
export const LOGO_COAT_OF_ARMS = v("/logo/coatOfArms.png");
