import type { Metadata } from "next";
import { FirstDayChecklist } from "@/components/tools/first-day-checklist";
import { Note } from "@/components/tools/note";
import { ToolGate } from "@/components/tools/tool-gate";
import { ToolPage, ToolSection } from "@/components/tools/tool-page";
import { fill } from "@/lib/text";
import { nextStepHref, toolMetadata, toolPath, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "prva-24-sata";
const t = tools.firstDay;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

/** Nacrt: sadržaj o zdravlju i propisima čeka pregled veterinara i vlasnikovo odobrenje. */
export default function FirstDayPage() {
  return (
    <ToolGate slug={SLUG}>
      <ToolPage
        title={t.title}
        intro={t.intro}
        sources={t.sources}
        nextStep={{ ...t.nextStep, href: nextStepHref(toolPath("oprostaj"), SLUG, "oprostaj") }}
      >
        <Note>{t.vetNote}</Note>
        <FirstDayChecklist />
        <ToolSection id="propisi" title={t.law.title}>
          <ul className="flex list-disc flex-col gap-2.5 pl-6 leading-relaxed">
            {t.law.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-[15px] leading-relaxed text-plum-soft">
            {fill(t.law.disclaimer, { date: tools.common.accessed })}
          </p>
        </ToolSection>
      </ToolPage>
    </ToolGate>
  );
}
