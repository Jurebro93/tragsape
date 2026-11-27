import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { extractCallouts, parseCalloutMarker } from "@/lib/content/callouts";
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
    expect(quote.data?.hProperties).toEqual({ dataCallout: "savjet", dataCalloutTitle: "Prije poziva", id: "okvir-1" });
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
    expect(quote.data?.hProperties).toEqual({ dataCallout: "alat", dataCalloutTitle: "psece-godine", id: "okvir-1" });
    expect(quote.children).toEqual([]);
  });

  it("popis okvira za traku ima ista sidra kao tekst", () => {
    const md = "Uvod.\n\n> Običan citat.\n\n> [!CINJENICA] Jeste li znali?\n> Pepela ostaje oko **4 %** težine [5].\n\nTekst.\n\n> [!ALAT] psece-godine\n\n> [!SAVJET]\n> Pitaj za [razred](/vodic/x).";
    expect(extractCallouts(md)).toEqual([
      { id: "okvir-1", kind: "cinjenica", title: "Jeste li znali?", text: "Pepela ostaje oko 4 % težine [5]." },
      { id: "okvir-2", kind: "alat", title: "psece-godine", text: "" },
      { id: "okvir-3", kind: "savjet", title: "", text: "Pitaj za razred." },
    ]);
    const ids = (tree(md).children ?? []).flatMap((node) => (node.data?.hProperties?.id ? [node.data.hProperties.id] : []));
    expect(ids).toEqual(["okvir-1", "okvir-2", "okvir-3"]);
  });
});
