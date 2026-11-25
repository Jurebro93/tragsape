import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { fetchAllRows, must, mustCount } from "./queries";

/** Brojke za adminov pregled. Sve čita klijent sa sesijom; bez adminove uloge RLS ne vraća ništa. */

export type SalesPeriod = { orders: number; revenueCents: number };

export type Overview = {
  sales: { last7: SalesPeriod; last30: SalesPeriod; all: SalesPeriod };
  memorials: { drafts: number; publishedFree: number; publishedPaid: number };
  activeGestures: number;
  donations: { accruedCents: number; paidOutCents: number };
  openReports: number;
  stripeErrors: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadOverview(): Promise<Overview> {
  const supabase = await createSessionClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const [paidOrders, memorialCounts, activeGestures, totals, openReports, stripeErrors] =
    await Promise.all([
      // Zbroj se računa ovdje jer PostgREST nema uključene agregate; čita se samo ono što treba.
      fetchAllRows(
        (from, to) =>
          supabase
            .from("orders")
            .select("total_cents, paid_at")
            .eq("status", "paid")
            .order("paid_at", { ascending: false })
            .order("id")
            .range(from, to),
        "plaćene narudžbe",
      ),
      // Admin ne čita nacrte, pa brojeve vraća funkcija u bazi (samo zbrojevi, bez sadržaja).
      supabase.rpc("admin_memorial_counts"),
      supabase
        .from("gestures")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", nowIso),
      supabase.rpc("donation_totals"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("stripe_events").select("event_id", { count: "exact", head: true }).not("error", "is", null),
    ]);

  const sales = {
    last7: { orders: 0, revenueCents: 0 },
    last30: { orders: 0, revenueCents: 0 },
    all: { orders: 0, revenueCents: 0 },
  };
  for (const order of paidOrders) {
    const paidAt = order.paid_at ? new Date(order.paid_at).getTime() : null;
    const periods = [sales.all];
    if (paidAt !== null && paidAt >= now - 30 * DAY_MS) {
      periods.push(sales.last30);
    }
    if (paidAt !== null && paidAt >= now - 7 * DAY_MS) {
      periods.push(sales.last7);
    }
    for (const period of periods) {
      period.orders += 1;
      period.revenueCents += order.total_cents;
    }
  }

  const donationTotals = must(totals, "zbroj donacija")[0];
  const counts = must(memorialCounts, "broj spomena")[0];

  return {
    sales,
    memorials: {
      drafts: Number(counts?.drafts ?? 0),
      publishedFree: Number(counts?.published_free ?? 0),
      publishedPaid: Number(counts?.published_paid ?? 0),
    },
    activeGestures: mustCount(activeGestures, "aktivne geste"),
    donations: {
      accruedCents: Number(donationTotals?.accrued_cents ?? 0),
      paidOutCents: Number(donationTotals?.paid_out_cents ?? 0),
    },
    openReports: mustCount(openReports, "otvorene prijave"),
    stripeErrors: mustCount(stripeErrors, "Stripe događaji s greškom"),
  };
}
