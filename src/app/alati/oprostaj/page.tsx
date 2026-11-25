import type { Metadata } from "next";
import { FarewellQuiz } from "@/components/tools/farewell-quiz";
import { ToolGate } from "@/components/tools/tool-gate";
import { ToolPage } from "@/components/tools/tool-page";
import { nextStepHref, toolMetadata, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "oprostaj";
const t = tools.farewell;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

export default function FarewellPage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        nextStep={{ ...t.nextStep, href: nextStepHref("/izradi", SLUG, "spomen") }}
      >
        <FarewellQuiz />
      </ToolPage>
    </ToolGate>
  );
}
