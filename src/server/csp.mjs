// Strict CSP for the HTML page: inline script/style only, data: + same-origin images, beacons and the web manifest to 'self'.
// No external assets.
export const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: 'self'; manifest-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
};
