import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterTabs, LoadingBlock, PageHeader, Stat } from "@/components/admin/ui";
import { attentionItems, percent } from "@/lib/admin-dashboard";
import { formatEuro } from "@/lib/format";
import { speciesLabel } from "@/lib/species";
import { fill, plural } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { loadDashboard } from "@/server/admin/dashboard";
import { FUNNEL_PERIODS, parseFunnelPeriod } from "@/server/admin/funnel";
import { firstParam, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.overview;
const steps = adminPanel.funnel.steps;

export const metadata: Metadata = { title: t.title };

const groupTitle = "text-xl font-extrabold";

/** Vodoravna traka s nazivom i brojem; širina je udio najvećeg broja u skupini. */
function Bar({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const width = max > 0 && value > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span>{label}</span>
        <span className="shrink-0 font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full rounded-full bg-teal" style={{ width: `${width}%` }} />
      </div>
      {note ? <span className="text-[13px] text-plum-soft">{note}</span> : null}
    </li>
  );
}

async function Period({ searchParams }: { searchParams: SearchParams }) {
  const days = parseFunnelPeriod(firstParam((await searchParams).dana));
  return (
    <FilterTabs
      label={t.periodLabel}
      items={FUNNEL_PERIODS.map((period) => ({
        href: `/admin?dana=${period}`,
        label: t.periods[period],
        current: period === days,
      }))}
    />
  );
}

async function DashboardData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin");
  const days = parseFunnelPeriod(firstParam((await searchParams).dana));
  const { numbers, sales, funnel } = await loadDashboard(days);
  const n = t.numbers;
  const attention = attentionItems(numbers);
  const funnelMax = Math.max(0, ...funnel.steps.map((step) => step.count));
  const speciesMax = Math.max(0, ...numbers.species.map((row) => row.count));
  const topSources = [...funnel.attribution]
    .filter((row) => row.drafts > 0)
    .sort((a, b) => b.drafts - a.drafts)
    .slice(0, 3)
    .map((row) => `${row.source} ${row.drafts}`)
    .join(" · ");

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="ploca-paznja" className="flex flex-col gap-3">
        <h2 id="ploca-paznja" className={groupTitle}>
          {t.attention.title}
        </h2>
        {attention.length === 0 ? (
          <p className="text-plum-soft">{t.attention.none}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attention.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href as Route}
                  className="inline-flex min-h-11 items-center rounded-full bg-butter px-4 font-bold text-plum no-underline hover:bg-sun"
                >
                  {plural(item.count, t.attention.items[item.key])}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ploca-brojke" className="flex flex-col gap-3">
        <h2 id="ploca-brojke" className={groupTitle}>
          {n.title}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            href="/admin/lijevak"
            label={n.created}
            value={numbers.memorials.created}
            detail={plural(numbers.memorials.openDrafts, n.openDrafts)}
          />
          <Stat
            href="/admin/lijevak"
            label={n.published}
            value={numbers.memorials.published}
            detail={fill(n.publishedDetail, {
              total: numbers.memorials.publishedTotal,
              paid: numbers.memorials.paidTotal,
            })}
          />
          <Stat
            href="/livada"
            label={n.onMeadow}
            value={numbers.memorials.onMeadow}
            detail={fill(n.onMeadowDetail, { total: numbers.memorials.publishedTotal })}
          />
          <Stat
            href="/admin/livada"
            label={n.trails}
            value={numbers.trails.new}
            detail={fill(n.trailsDetail, { total: numbers.trails.total })}
          />
          <Stat
            href="/admin/narudzbe?status=paid"
            label={n.revenue}
            value={formatEuro(sales.revenueCents)}
            detail={plural(sales.orders, n.orders)}
          />
          <Stat
            href="/admin/newsletter"
            label={n.newsletter}
            value={numbers.newsletter.confirmed}
            detail={fill(n.newsletterDetail, {
              new: numbers.newsletter.newConfirmed,
              pending: numbers.newsletter.pending,
            })}
          />
          <Stat
            label={n.accounts}
            value={numbers.accounts.total}
            detail={fill(n.accountsDetail, { new: numbers.accounts.new })}
          />
          <Stat
            href="/admin/geste"
            label={n.candles}
            value={numbers.engagement.candles}
            detail={`${plural(numbers.engagement.messages, n.messages)} · ${plural(numbers.engagement.gestures, n.gestures)}`}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="ploca-put" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="ploca-put" className={groupTitle}>
              {t.funnel.title}
            </h2>
            <p className="text-[15px] text-plum-soft">{t.funnel.intro}</p>
          </div>
          {funnelMax === 0 ? (
            <p className="text-plum-soft">{t.funnel.empty}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {funnel.steps.map((step, index) => {
                const share = index > 0 ? percent(step.count, funnel.steps[index - 1].count) : null;
                return (
                  <Bar
                    key={step.step}
                    label={steps[step.step]}
                    value={step.count}
                    max={funnelMax}
                    note={share === null ? undefined : fill(t.funnel.ofPrevious, { percent: share })}
                  />
                );
              })}
            </ol>
          )}
          {topSources ? <p className="text-[15px] text-plum-soft">{fill(t.funnel.sources, { list: topSources })}</p> : null}
          <Link
            href={`/admin/lijevak?dana=${days}` as Route}
            className="inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4"
          >
            {t.funnel.details}
          </Link>
        </section>

        <section aria-labelledby="ploca-vrste" className="flex flex-col gap-3">
          <h2 id="ploca-vrste" className={groupTitle}>
            {t.species.title}
          </h2>
          {numbers.species.length === 0 ? (
            <p className="text-plum-soft">{t.species.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {numbers.species.map((row) => (
                <Bar key={row.key} label={speciesLabel(row.key) ?? row.key} value={row.count} max={speciesMax} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="ploca-brzo" className="flex flex-col gap-3">
        <h2 id="ploca-brzo" className={groupTitle}>
          {t.shortcuts.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/kodovi#kod"
            className="inline-flex min-h-12 items-center rounded-full bg-terracotta px-5 font-bold text-white no-underline hover:bg-terracotta-deep"
          >
            {t.shortcuts.coupon}
          </Link>
          {(
            [
              ["/admin/newsletter", t.shortcuts.newsletter],
              ["/admin/pitanja", t.shortcuts.questions],
              ["/admin/clanci", t.shortcuts.articles],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-line bg-white px-5 font-bold text-plum no-underline hover:bg-butter"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro}>
        <Suspense fallback={<div className="h-11" />}>
          <Period searchParams={searchParams} />
        </Suspense>
      </PageHeader>
      <Suspense fallback={<LoadingBlock />}>
        <DashboardData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
