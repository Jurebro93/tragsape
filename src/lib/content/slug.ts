/**
 * Adresa članka iz naslova. Transliteracija je ista kao u funkciji `slugify` u bazi
 * (supabase/migrations/20261125210000_temelj.sql), pa adrese svugdje izgledaju jednako.
 */

const FROM = "čćžšđáàäâéèëêíìïîóòöôúùüûñ";
const TO = "cczsdaaaaeeeeiiiioooouuuun";

/** Ograničenja iz baze (`articles.slug`). */
export const SLUG_MAX = 120;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(value: string): string {
  let plain = "";
  // NFC: slovo s kvačicom zapisano kao dva znaka (česta pojava pri lijepljenju teksta) postaje jedno.
  for (const char of value.normalize("NFC").toLowerCase()) {
    const index = FROM.indexOf(char);
    plain += index === -1 ? char : TO[index];
  }
  return plain.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Prijedlog adrese iz naslova, skraćen na granici riječi da stane u ograničenje baze. */
export function suggestSlug(title: string): string {
  const slug = slugify(title);
  if (slug.length <= SLUG_MAX) {
    return slug;
  }
  const cut = slug.slice(0, SLUG_MAX);
  const lastDash = cut.lastIndexOf("-");
  return (slug[SLUG_MAX] === "-" || lastDash <= 0 ? cut : cut.slice(0, lastDash)).replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX && SLUG_PATTERN.test(value);
}
