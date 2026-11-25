import type { Metadata } from "next";
import { DogAgeCalculator } from "@/components/tools/dog-age-calculator";
import { ToolGate } from "@/components/tools/tool-gate";
import { Faq, Method, ToolPage } from "@/components/tools/tool-page";
import { fill } from "@/lib/text";
import { DOG_HUMAN_YEARS, DOG_SIZES, DOG_TABLE_MAX_YEARS } from "@/lib/tools/dog-age";
import { nextStepHref, toolMetadata, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const SLUG: ToolSlug = "psece-godine";
const t = tools.dogAge;

export const metadata: Metadata = toolMetadata(SLUG, { title: t.metaTitle, description: t.metaDescription });

const tableYears = Array.from({ length: DOG_TABLE_MAX_YEARS }, (_, index) => index + 1);

/** Cijela tablica izvora, da se svaki rezultat može provjeriti. */
function SourceTable() {
  return (
    <details className="rounded-3xl bg-white p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer items-center font-bold">{t.table.summary}</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left text-[15px]">
          <caption className="mb-2 text-left text-sm text-plum-soft">{t.table.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b-2 border-line py-2 pr-3">
                {t.table.ageHeader}
              </th>
              {DOG_SIZES.map((size) => (
                <th key={size} scope="col" className="border-b-2 border-line px-2 py-2 text-right">
                  {t.form.sizes[size].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableYears.map((year) => (
              <tr key={year}>
                <th scope="row" className="border-b border-line py-1.5 pr-3 font-semibold">
                  {fill(t.table.ageUnit, { count: year })}
                </th>
                {DOG_SIZES.map((size) => (
                  <td key={size} className="border-b border-line px-2 py-1.5 text-right tabular-nums">
                    {DOG_HUMAN_YEARS[size][year - 1]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

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
        <SourceTable />
        <Faq items={t.faq} />
      </ToolPage>
    </ToolGate>
  );
}
