/** Ključ pod kojim popis „Prva 24 sata" pamti označene stavke u pregledniku. */
export const FIRST_DAY_STORAGE_KEY = "trag-sape-prva-24-sata";

/**
 * Označene stavke iz pohrane. Sve što nije popis poznatih oznaka (oštećen zapis, stara verzija
 * popisa, tuđi podaci) tiho se odbacuje, da pokvaren zapis nikad ne sruši stranicu.
 */
export function parseChecked(raw: string | null | undefined, validIds: readonly string[]): string[] {
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item === "string" && validIds.includes(item)) {
      seen.add(item);
    }
  }
  return validIds.filter((id) => seen.has(id));
}

/** Označi ili odznači stavku; redoslijed prati redoslijed popisa. */
export function toggleChecked(checked: readonly string[], id: string, validIds: readonly string[]): string[] {
  if (!validIds.includes(id)) {
    return [...checked];
  }
  const next = new Set(checked);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return validIds.filter((item) => next.has(item));
}

export function serializeChecked(checked: readonly string[]): string {
  return JSON.stringify(checked);
}
