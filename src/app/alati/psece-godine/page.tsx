import type { Metadata } from "next";
import { DogAgeCalculator } from "@/components/tools/dog-age-calculator";
import { ToolGate } from "@/components/tools/tool-gate";
import { Faq, Method, ToolPage } from "@/components/tools/tool-page";
import { nextStepHref, toolMetadata, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "psece-godine";
const t = tools.dogAge;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

export default function DogAgePage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        sources={t.sources}
        nextStep={{ ...t.nextStep, href: nextStepHref("/izradi", SLUG, "spomen") }}
      >
        <DogAgeCalculator />
        <Method steps={t.method} />
        <Faq items={t.faq} />
      </ToolPage>
    </ToolGate>
  );
}
