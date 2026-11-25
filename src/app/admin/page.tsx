import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader, Stat } from "@/components/admin/ui";
import { formatEuro } from "@/lib/format";
import { plural } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { loadOverview, type SalesPeriod } from "@/server/admin/overview";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.overview;

export const metadata: Metadata = { title: t.title };

const groupTitle = "text-xl font-extrabold";
const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

function SalesStat({ label, period }: { label: string; period: SalesPeriod }) {
  return (
    <Stat
      href="/admin/narudzbe?status=paid"
      label={label}
      value={formatEuro(period.revenueCents)}
      detail={plural(period.orders, t.sales.orders)}
    />
  );
}

async function OverviewData() {
  await requireAdmin("/admin");
  const overview = await loadOverview();
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="pregled-prodaja" className="flex flex-col gap-3">
        <h2 id="pregled-prodaja" className={groupTitle}>
          {t.sales.title}
        </h2>
        <div className={grid}>
          <SalesStat label={t.sales.last7} period={overview.sales.last7} />
          <SalesStat label={t.sales.last30} period={overview.sales.last30} />
          <SalesStat label={t.sales.all} period={overview.sales.all} />
        </div>
        <p className="text-sm text-plum-soft">{t.sales.note}</p>
      </section>

      <section aria-labelledby="pregled-paznja" className="flex flex-col gap-3">
        <h2 id="pregled-paznja" className={groupTitle}>
          {t.attention.title}
        </h2>
        <div className={grid}>
          <Stat
            href="/admin/moderacija"
            label={t.attention.openReports}
            value={overview.openReports}
            highlight={overview.openReports > 0}
          />
          <Stat
            href="/admin/postavke#stripe"
            label={t.attention.stripeErrors}
            value={overview.stripeErrors}
            highlight={overview.stripeErrors > 0}
          />
        </div>
      </section>

      <section aria-labelledby="pregled-spomeni" className="flex flex-col gap-3">
        <h2 id="pregled-spomeni" className={groupTitle}>
          {t.memorials.title}
        </h2>
        <div className={grid}>
          <Stat href="/admin/lijevak" label={t.memorials.drafts} value={overview.memorials.drafts} />
          <Stat href="/admin/lijevak" label={t.memorials.publishedFree} value={overview.memorials.publishedFree} />
          <Stat href="/admin/lijevak" label={t.memorials.publishedPaid} value={overview.memorials.publishedPaid} />
        </div>
      </section>

      <section aria-labelledby="pregled-geste" className="flex flex-col gap-3">
        <h2 id="pregled-geste" className={groupTitle}>
          {t.gestures.title}
        </h2>
        <div className={grid}>
          <Stat href="/admin/geste" label={t.gestures.active} value={overview.activeGestures} />
        </div>
      </section>

      <section aria-labelledby="pregled-donacije" className="flex flex-col gap-3">
        <h2 id="pregled-donacije" className={groupTitle}>
          {t.donations.title}
        </h2>
        <div className={grid}>
          <Stat href="/admin/donacije" label={t.donations.accrued} value={formatEuro(overview.donations.accruedCents)} />
          <Stat href="/admin/donacije" label={t.donations.paidOut} value={formatEuro(overview.donations.paidOutCents)} />
        </div>
      </section>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <OverviewData />
      </Suspense>
    </>
  );
}
