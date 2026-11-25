import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { buildCtaHref } from "@/lib/content/attribution";
import type { CtaBlockData, CtaVariant } from "@/lib/content/types";
import { content } from "@/messages/hr/content";

/**
 * Prodajna sekcija u članku. Tiha je: jedna oznaka da je riječ o servisu, naslov, rečenica i
 * jedan gumb. Bijeli tekst postoji samo na tamnoj (`plum`) podlozi.
 */

const surfaces: Record<CtaVariant, string> = {
  butter: "bg-butter text-plum",
  mint: "bg-mint text-plum",
  plum: "bg-plum text-white",
};

const labels: Record<CtaVariant, string> = {
  butter: "text-terracotta-deep",
  mint: "text-teal-deep",
  plum: "text-butter",
};

const buttons: Record<CtaVariant, string> = {
  butter: "bg-plum text-white hover:bg-plum-soft",
  mint: "border-2 border-plum bg-white text-plum hover:bg-butter",
  plum: "bg-butter text-plum hover:bg-white",
};

export function CtaBlock({
  block,
  articleSlug,
  id,
  className,
}: {
  block: CtaBlockData;
  /** Članak u kojem sekcija stoji; poveznica nosi njegovu oznaku. Null samo u pregledu u adminu. */
  articleSlug: string | null;
  /** Jedinstven na stranici; povezuje naslov sekcije s njezinim okvirom. */
  id: string;
  className?: string;
}) {
  const href = articleSlug === null ? block.target : buildCtaHref(block.target, articleSlug, block.key);
  return (
    <aside
      aria-labelledby={id}
      className={cn("flex flex-col items-start gap-3 rounded-3xl p-5 sm:p-6", surfaces[block.variant], className)}
    >
      <p className={cn("text-[13px] font-bold uppercase tracking-[0.08em]", labels[block.variant])}>
        {content.cta.label}
      </p>
      <p id={id} className="font-display text-xl font-extrabold leading-snug tracking-tight">
        {block.heading}
      </p>
      {block.body ? <p className="text-[16px] leading-relaxed">{block.body}</p> : null}
      <Link
        href={href as Route}
        className={cn(
          "mt-1 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-center text-[15px] font-bold leading-tight no-underline transition-colors",
          buttons[block.variant],
        )}
      >
        {block.buttonLabel}
      </Link>
    </aside>
  );
}
