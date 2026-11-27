import { calloutId, parseCalloutMarker } from "@/lib/content/callouts";

/**
 * Dodatak za remark: citat s oznakom [!VRSTA] postaje istaknuti okvir (`aside` s atributom
 * `data-callout`). Oznaka i naslov se uklanjaju iz teksta i prenose kao atributi. Kako se HTML iz
 * teksta članka ne prikazuje, takav `aside` može nastati samo ovdje.
 */

type MarkdownNode = {
  type: string;
  value?: string;
  data?: { hName?: string; hProperties?: Record<string, string> };
  children?: MarkdownNode[];
};

export const CALLOUT_ATTRIBUTE = "data-callout";
export const CALLOUT_TITLE_ATTRIBUTE = "data-callout-title";

/** Vraća true ako je citat postao okvir. */
function transform(node: MarkdownNode, index: number): boolean {
  const first = node.children?.[0];
  const text = first?.type === "paragraph" ? first.children?.[0] : undefined;
  if (!first || text?.type !== "text" || typeof text.value !== "string") {
    return false;
  }
  const newline = text.value.indexOf("\n");
  const firstLine = newline === -1 ? text.value : text.value.slice(0, newline);
  const marker = parseCalloutMarker(firstLine);
  if (!marker) {
    return false;
  }
  text.value = newline === -1 ? "" : text.value.slice(newline + 1);
  if (text.value === "") {
    first.children = first.children?.slice(1);
    // Mekani prijelom iza naslova ostao bi kao prazan redak.
    if (first.children?.[0]?.type === "break") {
      first.children = first.children.slice(1);
    }
    if (!first.children || first.children.length === 0) {
      node.children = node.children?.slice(1);
    }
  }
  node.data = {
    hName: "aside",
    hProperties: { dataCallout: marker.kind, dataCalloutTitle: marker.rest, id: calloutId(index) },
  };
  if (marker.kind === "alat") {
    node.children = [];
  }
  return true;
}

export function remarkCallouts() {
  return (tree: MarkdownNode): void => {
    let index = 0;
    for (const child of tree.children ?? []) {
      if (child.type === "blockquote" && transform(child, index)) {
        index += 1;
      }
    }
  };
}
