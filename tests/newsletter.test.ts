import { describe, expect, it } from "vitest";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkNewsletter } from "@/lib/content/remark-newsletter";

type Node = { type: string; depth?: number; children?: Node[]; value?: string };

function run(markdown: string): Node[] {
  const processor = unified().use(remarkParse).use(remarkNewsletter);
  return ((processor.runSync(processor.parse(markdown)) as Node).children ?? []);
}

const heading = (title: string) => `## ${title}\n\nOdlomak.\n`;

describe("prijava na newsletter u članku", () => {
  it("stoji ispred podnaslova oko sredine, nikad ispred Ukratko, Česta pitanja ni Sljedeći korak", () => {
    const md = ["Uvod.", heading("Ukratko"), heading("Prvi"), heading("Drugi"), heading("Treći"), heading("Četvrti"), heading("Česta pitanja"), heading("Sljedeći korak")].join("\n");
    const nodes = run(md);
    const index = nodes.findIndex((node) => node.type === "newsletterSlot");
    expect(index).toBeGreaterThan(0);
    const next = nodes[index + 1];
    expect(next.type).toBe("heading");
    const title = next.children?.[0]?.value ?? "";
    expect(["Drugi", "Treći", "Četvrti"]).toContain(title);
    expect(nodes.filter((node) => node.type === "newsletterSlot")).toHaveLength(1);
  });

  it("kratak članak nema prijavu", () => {
    const nodes = run([heading("Jedan"), heading("Dva"), heading("Tri")].join("\n"));
    expect(nodes.some((node) => node.type === "newsletterSlot")).toBe(false);
  });
});
