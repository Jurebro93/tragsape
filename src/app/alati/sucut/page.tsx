import type { Metadata } from "next";
import { CondolenceHelper } from "@/components/tools/condolence-helper";
import { ToolGate } from "@/components/tools/tool-gate";
import { ToolPage, ToolSection } from "@/components/tools/tool-page";
import { Card } from "@/components/ui/card";
import { nextStepHref, toolMetadata, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "sucut";
const t = tools.condolence;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

export default function CondolencePage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        sources={t.sources}
        nextStep={{ ...t.nextStep, href: nextStepHref("/poklon", SLUG, "poklon") }}
      >
        <CondolenceHelper />
        <ToolSection id="ne-reci" title={t.avoid.title}>
          <p className="leading-relaxed text-plum-soft">{t.avoid.intro}</p>
          <ul className="flex flex-col gap-3">
            {t.avoid.items.map((item) => (
              <li key={item.phrase}>
                <Card className="flex flex-col gap-1.5 sm:p-6">
                  <p className="font-display text-lg font-extrabold leading-snug">{item.phrase}</p>
                  <p className="leading-relaxed text-plum-soft">{item.why}</p>
                </Card>
              </li>
            ))}
          </ul>
        </ToolSection>
        <ToolSection id="pomaze" title={t.helps.title}>
          <ul className="flex list-disc flex-col gap-2 pl-6 leading-relaxed">
            {t.helps.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ToolSection>
      </ToolPage>
    </ToolGate>
  );
}
