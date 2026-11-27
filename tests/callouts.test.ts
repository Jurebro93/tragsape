import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { parseCalloutMarker } from "@/lib/content/callouts";
import { remarkCallouts } from "@/lib/content/remark-callouts";

type Node = { type: string; value?: string; data?: { hName?: string; hProperties?: Record<string, string> }; children?: Node[] };

function tree(markdown: string): Node {
  const processor = unified().use(remarkParse).use(remarkCallouts);
  return processor.runSync(processor.parse(markdown)) as Node;
}

describe("okviri u članku", () => {
  it("prepoznaje poznate vrste i naslov", () => {
    expect(parseCalloutMarker("[!CINJENICA] Jeste li znali?")).toEqual({ kind: "cinjenica", rest: "Jeste li znali?" });
    expect(parseCalloutMarker("[!ALAT] psece-godine")).toEqual({ kind: "alat", rest: "psece-godine" });
    expect(parseCalloutMarker("[!NEPOZNATO] x")).toBeNull();
    expect(parseCalloutMarker("Obična rečenica.")).toBeNull();
  });

  it("citat s oznakom postaje okvir bez oznake u tekstu", () => {
    const [quote] = tree("> [!SAVJET] Prije poziva\n> Zapiši pitanja.").children ?? [];
    expect(quote.data?.hName).toBe("aside");
    expect(quote.data?.hProperties).toEqual({ dataCallout: "savjet", dataCalloutTitle: "Prije poziva" });
    const text = JSON.stringify(quote.children);
    expect(text).toContain("Zapiši pitanja.");
    expect(text).not.toContain("[!SAVJET]");
  });

  it("običan citat ostaje citat", () => {
    const [quote] = tree("> Samo citat.").children ?? [];
    expect(quote.data).toBeUndefined();
  });

  it("alat nema sadržaj iz teksta", () => {
    const [quote] = tree("> [!ALAT] psece-godine").children ?? [];
    expect(quote.data?.hProperties).toEqual({ dataCallout: "alat", dataCalloutTitle: "psece-godine" });
    expect(quote.children).toEqual([]);
  });
});
