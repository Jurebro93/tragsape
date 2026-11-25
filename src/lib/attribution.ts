/**
 * Atribucija bez kolačića: izvor posjeta (članak, alat, UTM) putuje u adresi od stranice do
 * obrasca, a obrazac ga šalje kao skrivena polja. Ništa se ne sprema u preglednik.
 */

export const ATTRIBUTION_KEYS = ["iz", "cta", "utm_source", "utm_medium", "utm_campaign"] as const;

const MAX_VALUE_LENGTH = 120;

/** Izvor posjeta iz poslanog obrasca, ili null ako ga nema. */
export function readAttribution(formData: FormData): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = String(formData.get(key) ?? "")
      .trim()
      .slice(0, MAX_VALUE_LENGTH);
    if (value !== "") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Dodaje poveznici oznake izvora iz trenutne adrese (`search` je `window.location.search`).
 * Oznaka koju poveznica već nosi ostaje; vanjske poveznice se ne diraju.
 */
export function carryAttribution(href: string, search: string): string {
  if (!href.startsWith("/") || href.startsWith("//") || search === "" || search === "?") {
    return href;
  }
  const current = new URLSearchParams(search);
  const hashAt = href.indexOf("#");
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? "" : beforeHash.slice(queryAt + 1));
  let changed = false;
  for (const key of ATTRIBUTION_KEYS) {
    const value = current.get(key)?.trim().slice(0, MAX_VALUE_LENGTH);
    if (value && !params.has(key)) {
      params.set(key, value);
      changed = true;
    }
  }
  return changed ? `${path}?${params.toString()}${hash}` : href;
}
