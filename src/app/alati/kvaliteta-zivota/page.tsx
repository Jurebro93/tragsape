import type { Metadata } from "next";
import { QualityOfLifeForm } from "@/components/tools/quality-of-life-form";
import { ToolGate } from "@/components/tools/tool-gate";
import { ToolPage } from "@/components/tools/tool-page";
import { nextStepHref, toolMetadata, toolPath, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "kvaliteta-zivota";
const t = tools.quality;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

/** Nacrt: zdravstveni sadržaj čeka pregled veterinara i vlasnikovo odobrenje (status u registru). */
export default function QualityOfLifePage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        sources={t.sources}
        nextStep={{ ...t.nextStep, href: nextStepHref(toolPath("oprostaj"), SLUG, "oprostaj") }}
        printSummaryOnly
      >
        <QualityOfLifeForm />
      </ToolPage>
    </ToolGate>
  );
}
