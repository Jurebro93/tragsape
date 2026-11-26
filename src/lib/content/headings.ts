/** Podnaslovi članka (## u Markdownu) za sadržaj na vrhu i sidra u tekstu. */

export type ArticleHeading = { id: string; text: string };

const DIACRITICS: Record<string, string> = { č: "c", ć: "c", ž: "z", š: "s", đ: "d" };

export function headingId(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[čćžšđ]/g, (char) => DIACRITICS[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base === "" ? "odjeljak" : base;
}

/** Čisti oznake Markdowna iz naslova: **podebljano**, _kurziv_, `kod`, [tekst](adresa). */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

export function extractHeadings(markdown: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const used = new Map<string, number>();
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
      continue;
    }
    const match = inCode ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const text = plain(match[1]);
    const base = headingId(text);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    headings.push({ id: seen === 0 ? base : `${base}-${seen + 1}`, text });
  }
  return headings;
}
