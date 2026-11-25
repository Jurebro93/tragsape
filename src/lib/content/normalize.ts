/**
 * Čišćenje teksta iz obrasca prije spremanja i usporedbe. Uređivač i poslužitelj koriste iste
 * funkcije, pa se slažu oko toga je li se tekst stvarno promijenio.
 */

/** Obrazac šalje prijelome redaka kao CRLF; u bazi i u usporedbama vrijedi samo LF. */
export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/** Kratko polje (naslov, sažetak, tvrdnja): bez praznina na rubovima. */
export function cleanText(value: string | null | undefined): string {
  return normalizeNewlines(value ?? "").trim();
}

/** Tekst članka: bez praznih redaka na početku i bez praznina na kraju; uvlake se ne diraju. */
export function cleanBody(value: string): string {
  return normalizeNewlines(value)
    .replace(/^(?:[ \t]*\n)+/, "")
    .replace(/\s+$/, "");
}

export type ComparableSource = {
  claim: string | null;
  title: string;
  url: string;
  publisher: string | null;
  accessedOn: string;
};

/** Isti izvori istim redom? Uspoređuje se ono što čitatelj vidi, ne identifikatori. */
export function sameSources(a: readonly ComparableSource[], b: readonly ComparableSource[]): boolean {
  return (
    a.length === b.length &&
    a.every((source, index) => {
      const other = b[index];
      return (
        cleanText(source.claim) === cleanText(other.claim) &&
        cleanText(source.title) === cleanText(other.title) &&
        cleanText(source.url) === cleanText(other.url) &&
        cleanText(source.publisher) === cleanText(other.publisher) &&
        source.accessedOn === other.accessedOn
      );
    })
  );
}

/** Je li se promijenilo ono što je pregledano: naslov, sažetak, tekst ili izvori. */
export function reviewedContentChanged(
  saved: { title: string; excerpt: string | null; bodyMd: string; sources: readonly ComparableSource[] },
  next: { title: string; excerpt: string | null; bodyMd: string; sources: readonly ComparableSource[] },
): boolean {
  return (
    cleanText(saved.title) !== cleanText(next.title) ||
    cleanText(saved.excerpt) !== cleanText(next.excerpt) ||
    cleanBody(saved.bodyMd) !== cleanBody(next.bodyMd) ||
    !sameSources(saved.sources, next.sources)
  );
}
