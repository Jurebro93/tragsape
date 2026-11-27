/**
 * Dodatak za remark: oko sredine članka umeće mjesto za prijavu na newsletter (`aside` s atributom
 * `data-newsletter`). Stavlja ga ispred podnaslova (##) najbližeg 55 % teksta, ali ne ispred
 * „Ukratko", „Česta pitanja" ni „Sljedeći korak", i ne odmah uz prodajnu sekciju.
 * Članak s manje od četiri podnaslova ga nema. Pokreće se nakon `remarkCtaSlots`.
 */

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  data?: { hName?: string; hProperties?: Record<string, string> };
  children?: MarkdownNode[];
};

export const NEWSLETTER_ATTRIBUTE = "data-newsletter";
const SKIP = /^(ukratko|česta pitanja|sljedeći korak)/i;

function text(node: MarkdownNode): string {
  return node.value ?? (node.children ?? []).map(text).join("");
}

export function remarkNewsletter() {
  return (tree: MarkdownNode): void => {
    const children = tree.children ?? [];
    const headings = children.flatMap((child, index) => (child.type === "heading" && child.depth === 2 ? [index] : []));
    if (headings.length < 4) {
      return;
    }
    const target = children.length * 0.55;
    const candidates = headings.filter((index, order) => {
      const neighbourIsCta = children[index - 1]?.type === "ctaSlot" || children[index + 1]?.type === "ctaSlot";
      return order >= 2 && !SKIP.test(text(children[index]).trim()) && !neighbourIsCta;
    });
    if (candidates.length === 0) {
      return;
    }
    const best = candidates.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    children.splice(best, 0, {
      type: "newsletterSlot",
      data: { hName: "aside", hProperties: { dataNewsletter: "1" } },
    });
  };
}
