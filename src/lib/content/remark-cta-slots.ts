import { planCtaSlots, type BodyBlock } from "@/lib/content/slots";
import type { CtaSlot } from "@/lib/content/types";

/**
 * Dodatak za remark: u stablo članka umeće oznake mjesta za prodajne sekcije. Radi nad već
 * parsiranim tekstom, pa se popis, tablica, blok koda ili bilješka nikad ne prekidaju, a bilješke i
 * poveznice po oznaci rade kroz cijeli članak. Gdje oznake stoje, odlučuje `planCtaSlots`.
 *
 * Oznaka se prikazuje kao element `aside` s atributom `data-cta-slot`; kako se HTML iz teksta
 * članka ne prikazuje, `aside` u izlazu može potjecati samo odavde.
 */

type Point = { offset?: number };
type MarkdownNode = {
  type: string;
  depth?: number;
  position?: { start: Point; end: Point };
  data?: { hName?: string; hProperties?: Record<string, string> };
  children?: MarkdownNode[];
};

/** Blokovi koji se ne prikazuju na mjestu gdje su napisani (definicije poveznica i bilješki). */
const NOT_RENDERED_IN_PLACE = new Set(["definition", "footnoteDefinition"]);

export const CTA_SLOT_ATTRIBUTE = "data-cta-slot";

export type RemarkCtaSlotsOptions = {
  /** Mjesta koja imaju sekciju. `end` se ovdje samo uzima u obzir; prikazuje se ispod teksta. */
  slots: readonly CtaSlot[];
};

export function remarkCtaSlots(options: RemarkCtaSlotsOptions) {
  return (tree: MarkdownNode): void => {
    const children = tree.children;
    if (!children || children.length === 0) {
      return;
    }
    const visible: Array<{ childIndex: number; block: BodyBlock }> = [];
    let bodyLength = 0;
    children.forEach((child, childIndex) => {
      if (NOT_RENDERED_IN_PLACE.has(child.type)) {
        return;
      }
      const offset = child.position?.start.offset ?? bodyLength;
      bodyLength = Math.max(bodyLength, child.position?.end.offset ?? offset);
      const kind = child.type === "heading" ? "heading" : child.type === "paragraph" ? "paragraph" : "other";
      visible.push({
        childIndex,
        block: kind === "heading" ? { kind, depth: child.depth ?? 1, offset } : { kind, offset },
      });
    });
    if (visible.length === 0) {
      return;
    }

    const placements = planCtaSlots(
      visible.map((entry) => entry.block),
      bodyLength,
      options.slots,
    ).filter((placement) => placement.slot !== "end");

    // Od kraja prema početku, da umetanje ne pomakne mjesta koja tek dolaze.
    for (const placement of placements.sort((a, b) => b.before - a.before)) {
      const childIndex =
        placement.before < visible.length
          ? visible[placement.before].childIndex
          : visible[visible.length - 1].childIndex + 1;
      children.splice(childIndex, 0, {
        type: "ctaSlot",
        data: { hName: "aside", hProperties: { dataCtaSlot: placement.slot } },
      });
    }
  };
}
