/**
 * Istaknuti okviri u tekstu članka. Pišu se kao citat čiji prvi redak počinje oznakom:
 *
 *   > [!CINJENICA] Jeste li znali?
 *   > Tekst okvira, s oznakom izvora [3].
 *
 *   > [!BROJKE] Ukratko u brojkama
 *   > - **31,25 €** cijepljenje protiv bjesnoće [2]
 *
 *   > [!ALAT] psece-godine
 *
 * Bez oznake citat ostaje običan citat. Sve ostaje čisti Markdown, pa se tekst može uređivati i u adminu.
 */

export const CALLOUT_KINDS = ["cinjenica", "savjet", "vazno", "brojke", "alat"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

export function isCalloutKind(value: string): value is CalloutKind {
  return (CALLOUT_KINDS as readonly string[]).includes(value);
}

const MARKER = /^\[!([A-ZČĆŽŠĐ]+)\][ \t]*(.*)$/u;

/** Prepoznaje oznaku u prvom retku citata. Vraća vrstu i ostatak retka (naslov ili adresu alata). */
export function parseCalloutMarker(firstLine: string): { kind: CalloutKind; rest: string } | null {
  const match = MARKER.exec(firstLine.trim());
  if (!match) {
    return null;
  }
  const kind = match[1].toLowerCase();
  return isCalloutKind(kind) ? { kind, rest: match[2].trim() } : null;
}
