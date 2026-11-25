import type { Route } from "next";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CtaBlock } from "@/components/content/cta-block";
import { cn } from "@/lib/cn";
import { isInternalPath } from "@/lib/content/attribution";
import { CTA_SLOT_ATTRIBUTE, remarkCtaSlots } from "@/lib/content/remark-cta-slots";
import { CTA_SLOTS, isCtaSlot, type CtaBlockData, type CtaSlot } from "@/lib/content/types";
import { content } from "@/messages/hr/content";

/**
 * Tekst članka iz Markdowna. HTML iz teksta se ne izvršava (bez rehype-raw); svaki element ima
 * vlastiti stil s tokenima. Prodajne sekcije umeće `remarkCtaSlots` kao oznake mjesta, pa ovdje
 * postaju `CtaBlock`.
 */

const text = "text-[17px] leading-[1.65]";
const link = "font-medium text-teal underline underline-offset-4 [overflow-wrap:anywhere] hover:text-teal-deep";
const heading2 = "mt-10 font-display text-[26px] font-extrabold leading-tight first:mt-0";
const heading3 = "mt-8 font-display text-xl font-bold leading-snug first:mt-0";

const baseComponents: Components = {
  // Naslov stranice je jedini h1; naslov u tekstu postaje podnaslov.
  h1: ({ node: _node, className: _className, ...props }) => <h2 className={heading2} {...props} />,
  h2: ({ node: _node, className: _className, ...props }) =>
    props.id?.endsWith("footnote-label") ? (
      <h2 className="font-display text-lg font-bold" {...props} />
    ) : (
      <h2 className={heading2} {...props} />
    ),
  h3: ({ node: _node, className: _className, ...props }) => <h3 className={heading3} {...props} />,
  h4: ({ node: _node, className: _className, ...props }) => (
    <h4 className="mt-6 text-[17px] font-bold leading-snug first:mt-0" {...props} />
  ),
  h5: ({ node: _node, className: _className, ...props }) => (
    <h5 className="mt-6 text-[17px] font-bold leading-snug first:mt-0" {...props} />
  ),
  h6: ({ node: _node, className: _className, ...props }) => (
    <h6 className="mt-6 text-[17px] font-bold leading-snug first:mt-0" {...props} />
  ),
  p: ({ node: _node, className: _className, ...props }) => <p className={cn(text, "mt-5 first:mt-0")} {...props} />,
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={cn(
        text,
        "mt-5 flex flex-col gap-2 first:mt-0",
        // Popis zadataka (GFM) nema točke; ima kućice.
        className?.includes("contains-task-list") ? "list-none pl-0" : "list-disc pl-6",
      )}
      {...props}
    />
  ),
  ol: ({ node: _node, className: _className, ...props }) => (
    <ol className={cn(text, "mt-5 flex list-decimal flex-col gap-2 pl-6 first:mt-0")} {...props} />
  ),
  li: ({ node: _node, className: _className, ...props }) => (
    <li className="pl-1 marker:text-plum-soft [&>ol]:mt-2 [&>p]:mt-2 [&>p:first-child]:mt-0 [&>ul]:mt-2" {...props} />
  ),
  blockquote: ({ node: _node, className: _className, ...props }) => (
    <blockquote className="mt-6 border-l-4 border-sun pl-4 text-plum-soft first:mt-0" {...props} />
  ),
  hr: ({ node: _node, className: _className, ...props }) => <hr className="my-10 border-t-2 border-line" {...props} />,
  strong: ({ node: _node, className: _className, ...props }) => <strong className="font-bold" {...props} />,
  table: ({ node: _node, className: _className, ...props }) => (
    <div className="mt-6 overflow-x-auto first:mt-0">
      <table className="w-full border-collapse text-left text-[15px] leading-snug" {...props} />
    </div>
  ),
  th: ({ node: _node, className: _className, ...props }) => (
    <th className="border-b-2 border-line px-3 py-2 align-bottom font-bold first:pl-0" {...props} />
  ),
  td: ({ node: _node, className: _className, ...props }) => (
    <td className="border-b border-line px-3 py-2 align-top first:pl-0" {...props} />
  ),
  pre: ({ node: _node, className: _className, ...props }) => (
    <pre
      className="mt-5 overflow-x-auto rounded-2xl bg-white p-4 font-mono text-[15px] leading-relaxed first:mt-0 [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  code: ({ node: _node, className: _className, ...props }) => (
    <code className="rounded-md bg-line px-1.5 py-0.5 font-mono text-[15px]" {...props} />
  ),
  section: ({ node: _node, className: _className, ...props }) =>
    "data-footnotes" in props ? (
      <section className="mt-10 flex flex-col gap-2 border-t-2 border-line pt-6 [&_li]:text-[15px] [&_p]:text-[15px]" {...props} />
    ) : (
      <section {...props} />
    ),
  input: ({ node: _node, className: _className, ...props }) => <input className="mr-2 size-4 accent-teal" {...props} />,
  // Slike samo s vlastite stranice: tuđa slika bi posjetitelja otkrila trećoj strani.
  img: ({ node: _node, className: _className, src, alt, ...props }) =>
    typeof src === "string" && isInternalPath(src) ? (
      // eslint-disable-next-line @next/next/no-img-element -- slika iz teksta članka, bez poznatih dimenzija
      <img src={src} alt={alt ?? ""} loading="lazy" className="mt-6 h-auto max-w-full rounded-2xl" {...props} />
    ) : null,
  a: ({ node: _node, className: _className, href, children, ...props }) => {
    if (!href) {
      return <span>{children}</span>;
    }
    if (isInternalPath(href)) {
      return (
        <Link href={href as Route} className={link}>
          {children}
        </Link>
      );
    }
    if (/^https?:\/\//i.test(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
          {children}
          <span className="sr-only"> ({content.article.newTab})</span>
        </a>
      );
    }
    // Sidra (bilješke), mailto: i tel: ostaju obične poveznice sa svojim atributima.
    return (
      <a href={href} className={link} {...props}>
        {children}
      </a>
    );
  },
};

export function ArticleBody({
  markdown,
  slug,
  cta,
}: {
  markdown: string;
  slug: string;
  cta: Partial<Record<CtaSlot, CtaBlockData>>;
}) {
  const slots = CTA_SLOTS.filter((slot) => cta[slot] !== undefined);
  const components: Components = {
    ...baseComponents,
    aside: ({ node: _node, ...props }) => {
      const slot = (props as Record<string, unknown>)[CTA_SLOT_ATTRIBUTE];
      const block = typeof slot === "string" && isCtaSlot(slot) ? cta[slot] : undefined;
      return block ? <CtaBlock block={block} articleSlug={slug} id={`sekcija-${slot}`} className="my-10" /> : null;
    },
  };
  return (
    // Obični blok, ne flex: razmaci susjednih elemenata se tada stapaju umjesto da se zbrajaju.
    <div>
      <Markdown
        remarkPlugins={[remarkGfm, [remarkCtaSlots, { slots }]]}
        remarkRehypeOptions={{
          footnoteLabel: content.article.footnotes,
          footnoteLabelTagName: "h2",
          footnoteLabelProperties: {},
          footnoteBackLabel: content.article.footnoteBack,
        }}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
