/**
 * Pravilo indeksiranja memorijala. Čista logika bez I/O: koriste je sitemap i robots meta stranice,
 * pa obje strane uvijek odlučuju isto.
 */

/** Najmanja duljina posvete (u znakovima) uz koju se spomen nudi tražilicama. */
export const MIN_DEDICATION_CHARS = 80;
/** Najmanji broj riječi priče uz koji se spomen nudi tražilicama. */
export const MIN_STORY_WORDS = 100;

/** Polja memorijala potrebna za odluku; nazivi odgovaraju stupcima u bazi. */
export type IndexableInput = {
  status: string;
  visibility: string;
  cover_photo_id: string | null;
  dedication: string | null;
  story_md: string | null;
};

/** Duljina teksta u znakovima; uzastopne praznine broje se kao jedna, pa se prag ne može doseći razmacima. */
export function countChars(text: string | null | undefined): number {
  if (!text) {
    return 0;
  }
  return Array.from(text.normalize("NFC").replace(/\s+/g, " ").trim()).length;
}

/** Broj riječi u tekstu ili Markdownu. Oznake bez slova i znamenki (#, -, *, >) nisu riječi. */
export function countWords(text: string | null | undefined): number {
  if (!text) {
    return 0;
  }
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * Spomen se nudi tražilicama samo ako je objavljen i javan, ima naslovnu fotografiju
 * i dovoljno teksta: posvetu od barem 80 znakova ili priču od barem 100 riječi.
 * Spomeni „samo s poveznicom” i privatni nikad nisu indeksirani.
 */
export function isIndexable(memorial: IndexableInput): boolean {
  if (memorial.status !== "published" || memorial.visibility !== "public") {
    return false;
  }
  if (!memorial.cover_photo_id) {
    return false;
  }
  return (
    countChars(memorial.dedication) >= MIN_DEDICATION_CHARS ||
    countWords(memorial.story_md) >= MIN_STORY_WORDS
  );
}
