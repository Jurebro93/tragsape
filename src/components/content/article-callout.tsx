import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, FlagIcon, PawIcon } from "@/components/icons";
import { CatAgeCalculator } from "@/components/tools/cat-age-calculator";
import { CondolenceHelper } from "@/components/tools/condolence-helper";
import { DedicationHelper } from "@/components/tools/dedication-helper";
import { DogAgeCalculator } from "@/components/tools/dog-age-calculator";
import { FarewellQuiz } from "@/components/tools/farewell-quiz";
import { cn } from "@/lib/cn";
import type { CalloutKind } from "@/lib/content/callouts";
import { getTool, publicTools, toolPath, type ToolSlug } from "@/lib/tools/registry";
import { content } from "@/messages/hr/content";

const t = content.article.callouts;

/** Alati koji se mogu ugraditi u članak. Nacrt alata se nikad ne prikazuje. */
const EMBEDDABLE: Partial<Record<ToolSlug, () => ReactNode>> = {
  "psece-godine": () => <DogAgeCalculator />,
  "macje-godine": () => <CatAgeCalculator />,
  posveta: () => <DedicationHelper />,
  sucut: () => <CondolenceHelper />,
  oprostaj: () => <FarewellQuiz />,
};

function embeddable(slug: string): ToolSlug | null {
  const tool = publicTools().find((item) => item.slug === slug);
  return tool && EMBEDDABLE[tool.slug] ? tool.slug : null;
}

const STYLES: Record<Exclude<CalloutKind, "alat">, { box: string; icon: ReactNode; label: string }> = {
  cinjenica: { box: "bg-butter", icon: <PawIcon size={20} />, label: t.cinjenica },
  savjet: { box: "bg-mint", icon: <CheckIcon size={20} />, label: t.savjet },
  vazno: { box: "border-2 border-terracotta bg-white", icon: <FlagIcon size={20} />, label: t.vazno },
  brojke: { box: "bg-white", icon: null, label: t.brojke },
};

/** Istaknuti okvir u članku: zanimljivost, savjet, upozorenje, brojke ili ugrađeni alat. */
export function ArticleCallout({
  kind,
  title,
  id,
  children,
}: {
  kind: CalloutKind;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  if (kind === "alat") {
    const slug = embeddable(title);
    if (!slug) {
      return null;
    }
    const tool = getTool(slug);
    return (
      <aside id={id} className="my-10 flex scroll-mt-28 flex-col gap-4 rounded-[32px] bg-butter p-5 sm:p-7" aria-label={tool.title}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-terracotta">{t.toolEyebrow}</span>
          <h2 className="font-display text-2xl font-extrabold leading-tight">{tool.title}</h2>
          <p className="text-[15px] leading-relaxed text-plum-soft">{tool.description}</p>
        </div>
        <div className="rounded-3xl bg-vanilla p-4 sm:p-5">{EMBEDDABLE[slug]?.()}</div>
        <Link
          href={toolPath(slug) as Route}
          className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-teal underline underline-offset-4 hover:text-teal-deep"
        >
          {t.toolOpen}
          <ArrowRightIcon size={18} />
        </Link>
      </aside>
    );
  }
  const style = STYLES[kind];
  return (
    <aside id={id} className={cn("callout my-8 flex scroll-mt-28 flex-col gap-3 rounded-3xl p-5 sm:p-6", `callout-${kind}`, style.box)}>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-terracotta-deep">
        {style.icon}
        {title || style.label}
      </p>
      <div className="[&>*:first-child]:mt-0">{children}</div>
    </aside>
  );
}
