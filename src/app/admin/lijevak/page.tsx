import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DataTable,
  EmptyState,
  FilterTabs,
  LoadingBlock,
  NumTd,
  NumTh,
  PageHeader,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { formatEuro } from "@/lib/format";
import { adminPanel } from "@/messages/hr/admin-panel";
import { FUNNEL_PERIODS, loadFunnel, parseFunnelPeriod } from "@/server/admin/funnel";
import { firstParam, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.funnel;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

const percent = new Intl.NumberFormat("hr-HR", { style: "percent", maximumFractionDigits: 1 });
const count = new Intl.NumberFormat("hr-HR");

async function FunnelData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/lijevak");
  const days = parseFunnelPeriod(firstParam((await searchParams).dana));
  const { steps, attribution } = await loadFunnel(days);
  const hasEvents = steps.some((step) => step.count > 0);

  return (
    <div className="flex flex-col gap-5">
      <FilterTabs
        label={t.periodLabel}
        items={FUNNEL_PERIODS.map((period) => ({
          href: `/admin/lijevak?dana=${period}`,
          label: t.periods[period],
          current: period === days,
        }))}
      />

      <Section title={t.stepsTitle} description={t.note}>
        {hasEvents ? (
          <DataTable className="min-w-[480px]">
            <thead>
              <tr>
                <Th>{t.columns.step}</Th>
                <NumTh>{t.columns.count}</NumTh>
                <NumTh>{t.columns.conversion}</NumTh>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.step}>
                  <Td>{t.steps[step.step]}</Td>
                  <NumTd>{count.format(step.count)}</NumTd>
                  <NumTd>{step.conversion === null ? common.none : percent.format(step.conversion)}</NumTd>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState>{t.empty}</EmptyState>
        )}
      </Section>

      <Section title={t.attribution.title} description={t.attribution.explanation}>
        {attribution.length === 0 ? (
          <EmptyState>{t.attribution.empty}</EmptyState>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t.attribution.columns.source}</Th>
                <NumTh>{t.attribution.columns.drafts}</NumTh>
                <NumTh>{t.attribution.columns.published}</NumTh>
                <NumTh>{t.attribution.columns.paidOrders}</NumTh>
                <NumTh>{t.attribution.columns.revenue}</NumTh>
              </tr>
            </thead>
            <tbody>
              {attribution.map((row) => (
                <tr key={row.source}>
                  <Td className="[overflow-wrap:anywhere]">{row.source}</Td>
                  <NumTd>{count.format(row.drafts)}</NumTd>
                  <NumTd>{count.format(row.published)}</NumTd>
                  <NumTd>{count.format(row.paidOrders)}</NumTd>
                  <NumTd>{formatEuro(row.revenueCents)}</NumTd>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>
    </div>
  );
}

export default function AdminFunnelPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <FunnelData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
