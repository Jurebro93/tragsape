/**
 * Atribucija bez kolačića: poveznica iz prodajne sekcije nosi oznaku članka (`iz`) i sekcije (`cta`).
 * Izrada spomena te oznake sprema uz nacrt, a narudžba ih nasljeđuje.
 */

/** Zadano odredište ako je u sekciji upisano nešto što nije putanja unutar stranice. */
const FALLBACK_TARGET = "/izradi";

/** Samo putanje unutar stranice: počinju jednom kosom crtom i nemaju razmake ni obrnute kose crte. */
export function isInternalPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\" || code <= 32 || code === 127) {
      return false;
    }
  }
  return true;
}

/** Odredište sekcije s dodanim `iz` i `cta`. Postojeći upit i sidro ostaju. */
export function buildCtaHref(target: string, articleSlug: string, ctaKey: string): string {
  const safe = isInternalPath(target) ? target : FALLBACK_TARGET;
  const hashAt = safe.indexOf("#");
  const hash = hashAt === -1 ? "" : safe.slice(hashAt);
  const beforeHash = hashAt === -1 ? safe : safe.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? "" : beforeHash.slice(queryAt + 1));
  params.set("iz", articleSlug);
  params.set("cta", ctaKey);
  return `${path}?${params.toString()}${hash}`;
}
