import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fill } from "@/lib/text";
import { tools, type ToolSource } from "@/messages/hr/tools";
import "./print.css";

const t = tools.common;

export const toolSectionTitle = "font-display text-2xl font-extrabold leading-tight sm:text-3xl";

type NextStepProps = { body: string; link: string; href: string };

/**
 * Okvir stranice alata: zaglavlje s naslovom i uvodom, sadržaj, izvori i jedan istaknut sljedeći korak.
 * `printSummaryOnly` skriva sve osim sažetka koji alat sam pripremi za ispis.
 */
export function ToolPage({
  title,
  intro,
  children,
  sources,
  nextStep,
  printSummaryOnly = false,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  sources?: readonly ToolSource[];
  nextStep: NextStepProps;
  printSummaryOnly?: boolean;
}) {
  const screenOnly = printSummaryOnly ? "print:hidden" : undefined;
  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <div className={cn("rounded-b-[40px] bg-butter print:rounded-none print:bg-white", screenOnly)}>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 pb-10 pt-4 sm:pb-12 sm:pt-8">
            <Link
              href="/alati"
              data-print="hide"
              className="inline-flex min-h-11 items-center self-start text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep underline-offset-4 hover:underline"
            >
              {t.eyebrow}
            </Link>
            <h1 className="font-display text-[2.25rem] font-extrabold leading-[1.05] sm:text-5xl">{title}</h1>
            <p className="text-lg leading-relaxed">{intro}</p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 pb-16 pt-8 print:gap-6 print:pb-0">
          {children}
          {sources && sources.length > 0 ? <Sources sources={sources} className={screenOnly} /> : null}
          <NextStep {...nextStep} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Odjeljak s naslovom unutar stranice alata. */
export function ToolSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex flex-col gap-4", className)}>
      <h2 id={`${id}-title`} className={toolSectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Koraci metode, redom. */
export function Method({ steps, className }: { steps: readonly string[]; className?: string }) {
  return (
    <ToolSection id="metoda" title={t.methodTitle} className={className}>
      <ol className="flex list-decimal flex-col gap-2.5 pl-6 leading-relaxed marker:font-bold">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </ToolSection>
  );
}

export function Faq({
  items,
  className,
}: {
  items: ReadonlyArray<{ question: string; answer: string }>;
  className?: string;
}) {
  return (
    <ToolSection id="pitanja" title={t.faqTitle} className={className}>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.question} className="flex flex-col gap-2 sm:p-6">
            <h3 className="font-display text-xl font-extrabold leading-snug">{item.question}</h3>
            <p className="leading-relaxed text-plum-soft">{item.answer}</p>
          </Card>
        ))}
      </div>
    </ToolSection>
  );
}

/** Izvori: izdavač, naslov s poveznicom, što izvor podupire i datum pristupa. */
export function Sources({ sources, className }: { sources: readonly ToolSource[]; className?: string }) {
  return (
    <ToolSection id="izvori" title={t.sourcesTitle} className={className}>
      <p className="text-[15px] leading-relaxed text-plum-soft">{fill(t.sourcesIntro, { date: t.accessed })}</p>
      <ol className="flex flex-col gap-3">
        {sources.map((source) => (
          <li key={source.url} className="flex flex-col gap-1 rounded-3xl bg-white p-4 text-[15px] leading-relaxed">
            <span className="font-bold">{source.publisher}</span>
            <a
              href={source.url}
              rel="noopener noreferrer external"
              className="inline-flex min-h-11 items-center break-words font-semibold underline underline-offset-4 hover:text-teal-deep"
            >
              {source.title}
            </a>
            <span className="text-plum-soft">
              {t.sourceSupports} {source.supports}
            </span>
            <span className="text-plum-soft">{fill(t.sourceAccessed, { date: t.accessed })}</span>
          </li>
        ))}
      </ol>
    </ToolSection>
  );
}

/**
 * Sljedeći korak: istaknuta kartica s jednom rečenicom i jednim gumbom, da se razlikuje od izvora.
 * Bez prodajnog pritiska: nema odbrojavanja ni cijene, samo mogućnost.
 */
export function NextStep({ body, link, href }: NextStepProps) {
  return (
    <aside
      aria-label={t.nextStepLabel}
      data-print="hide"
      className="relative flex flex-col items-start gap-4 overflow-hidden rounded-[32px] bg-butter p-6 sm:p-8"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-sun/70"
      />
      <span className="relative text-sm font-bold uppercase tracking-[0.08em] text-terracotta">{t.nextStepLabel}</span>
      <p className="relative max-w-md font-display text-xl font-extrabold leading-snug sm:text-2xl">{body}</p>
      <Link href={href as Route} className={buttonClass("primary", "lg", "relative")}>
        {link}
        <ArrowRightIcon size={18} />
      </Link>
    </aside>
  );
}
