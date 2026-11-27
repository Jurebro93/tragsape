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

export type CalloutSummary = { id: string; kind: CalloutKind; title: string; text: string };

/** Sidro okvira u tekstu; isti redoslijed broji i `remarkCallouts`. */
export function calloutId(index: number): string {
  return `okvir-${index + 1}`;
}

/** Čisti oznake Markdowna iz kratkog teksta okvira: **podebljano**, [tekst](adresa), oznake popisa. */
function plainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Okviri članka redom kojim stoje u tekstu (samo oni na vrhu teksta, kao i u `remarkCallouts`).
 * Služi traci „Jeste li znali?”, koja pokazuje zanimljivosti i savjete i vodi do njih u tekstu.
 */
export function extractCallouts(markdown: string): CalloutSummary[] {
  const result: CalloutSummary[] = [];
  let inCode = false;
  let current: { kind: CalloutKind; title: string; lines: string[] } | null = null;
  let quoteOpen = false;
  const flush = () => {
    if (current) {
      result.push({ id: calloutId(result.length), kind: current.kind, title: current.title, text: plainText(current.lines.join("\n")) });
    }
    current = null;
  };
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
    }
    if (inCode) {
      continue;
    }
    if (line.startsWith(">")) {
      const content = line.replace(/^>\s?/, "");
      if (!quoteOpen) {
        quoteOpen = true;
        const marker = parseCalloutMarker(content);
        current = marker ? { kind: marker.kind, title: marker.rest, lines: [] } : null;
        continue;
      }
      current?.lines.push(content);
      continue;
    }
    if (quoteOpen) {
      flush();
      quoteOpen = false;
    }
  }
  flush();
  return result;
}
