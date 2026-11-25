import type { CtaSlot } from "@/lib/content/types";

/**
 * Gdje u tekstu članka stoje prodajne sekcije. Čista logika nad popisom blokova najviše razine
 * (naslovi, odlomci, ostalo), pa se može provjeriti bez parsera i bez sučelja.
 *
 * Pravila:
 * - Sekcija stoji samo između blokova, nikad unutar njih, i nikad prije kraja uvodnog odlomka.
 * - `after_intro`: prije drugog podnaslova razine 2 (`##`); ako takvih nema dva, nakon drugog odlomka.
 *   Popis, tablica ili citat koji slijedi odmah iza odlomka ostaje uz njega.
 * - `middle`: prije podnaslova najbližeg sredini teksta, i to iza mjesta `after_intro`. Gledaju se
 *   podnaslovi razine 2; ako ih nema, najplića dublja razina. Tekst bez podnaslova dijeli se na
 *   granici odlomka najbližoj sredini, najranije iza drugog odlomka.
 * - `end`: iza zadnjeg bloka.
 * - Dvije sekcije nikad ne stoje jedna do druge: mjesto koje bi palo na isto mjesto kao drugo ne dobiva ništa.
 */

export type BodyBlock = {
  kind: "heading" | "paragraph" | "other";
  /** Razina naslova (1–6); vrijedi samo za naslove. */
  depth?: number;
  /** Pomak početka bloka u tekstu, u znakovima. */
  offset: number;
};

/** `before` je redni broj bloka ispred kojeg sekcija stoji; `blocks.length` znači iza zadnjeg. */
export type CtaPlacement = { slot: CtaSlot; before: number };

function nearestTo(blocks: readonly BodyBlock[], candidates: readonly number[], target: number): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const index of candidates) {
    const distance = Math.abs(blocks[index].offset - target);
    // Pri jednakoj udaljenosti ostaje raniji blok.
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

export function planCtaSlots(
  blocks: readonly BodyBlock[],
  bodyLength: number,
  slots: readonly CtaSlot[],
): CtaPlacement[] {
  const count = blocks.length;
  if (count === 0) {
    return [];
  }
  const wanted = new Set(slots);
  const indexesOf = (test: (block: BodyBlock) => boolean) =>
    blocks.flatMap((block, index) => (test(block) ? [index] : []));

  // Najranije dopušteno mjesto: iza prvog bloka koji nije naslov (uvodni odlomak).
  const firstText = blocks.findIndex((block) => block.kind !== "heading");
  const earliest = firstText === -1 ? count : firstText + 1;
  const placements: CtaPlacement[] = [];

  let afterIntro: number | null = null;
  if (wanted.has("after_intro")) {
    const candidates: number[] = [];
    const sections = indexesOf((block) => block.kind === "heading" && block.depth === 2);
    if (sections.length >= 2) {
      candidates.push(sections[1]);
    }
    const paragraphs = indexesOf((block) => block.kind === "paragraph");
    if (paragraphs.length >= 2) {
      let index = paragraphs[1] + 1;
      while (index < count && blocks[index].kind === "other") {
        index += 1;
      }
      candidates.push(index);
    }
    const usable = candidates.find(
      (index) => index >= earliest && !(index === count && wanted.has("end")),
    );
    if (usable !== undefined) {
      afterIntro = usable;
      placements.push({ slot: "after_intro", before: usable });
    }
  }

  if (wanted.has("middle")) {
    const from = Math.max(earliest, (afterIntro ?? 0) + 1);
    const inRange = (index: number) => index >= from && index < count;
    const headingDepths = blocks
      .filter((block) => block.kind === "heading" && (block.depth ?? 1) >= 2)
      .map((block) => block.depth ?? 2);
    let candidates: number[];
    if (headingDepths.length > 0) {
      const depth = Math.min(...headingDepths);
      candidates = indexesOf((block) => block.kind === "heading" && block.depth === depth);
    } else {
      // Bez podnaslova: ispred odlomka, ali ne između naslova i njegova teksta i ne prije nego
      // što su prošla dva odlomka (isto najranije mjesto kao za sekciju nakon uvoda).
      const paragraphs = indexesOf((block) => block.kind === "paragraph");
      candidates = paragraphs.filter(
        (index, position) => position >= 2 && blocks[index - 1].kind !== "heading",
      );
    }
    const middle = nearestTo(blocks, candidates.filter(inRange), bodyLength / 2);
    if (middle !== null) {
      placements.push({ slot: "middle", before: middle });
    }
  }

  if (wanted.has("end")) {
    placements.push({ slot: "end", before: count });
  }

  return placements.sort((a, b) => a.before - b.before);
}
