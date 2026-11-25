import type { Metadata } from "next";
import { DedicationHelper } from "@/components/tools/dedication-helper";
import { ToolGate } from "@/components/tools/tool-gate";
import { ToolPage } from "@/components/tools/tool-page";
import { nextStepHref, toolMetadata, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "posveta";
const t = tools.dedication;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

export default function DedicationPage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        nextStep={{ ...t.nextStep, href: nextStepHref("/izradi", SLUG, "spomen") }}
      >
        <DedicationHelper />
      </ToolPage>
    </ToolGate>
  );
}
