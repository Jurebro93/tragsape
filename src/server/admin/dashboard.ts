import "server-only";
import { readDashboard, type DashboardNumbers } from "@/lib/admin-dashboard";
import { createSessionClient } from "@/server/supabase/session";
import { loadFunnel, type FunnelPeriod, type FunnelReport } from "./funnel";
import { fetchAllRows, must } from "./queries";

/** Sve za nadzornu ploču admina. Čita klijent sa sesijom; bez adminove uloge baza ne vraća ništa. */

export type Dashboard = {
  numbers: DashboardNumbers;
  sales: { orders: number; revenueCents: number };
  funnel: FunnelReport;
};

export async function loadDashboard(days: FunnelPeriod): Promise<Dashboard> {
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [board, paidOrders, funnel] = await Promise.all([
    supabase.rpc("admin_dashboard", { p_since: since }),
    fetchAllRows(
      (from, to) =>
        supabase
          .from("orders")
          .select("total_cents")
          .eq("status", "paid")
          .gte("paid_at", since)
          .order("paid_at", { ascending: false })
          .order("id")
          .range(from, to),
      "plaćene narudžbe u razdoblju",
    ),
    loadFunnel(days),
  ]);

  return {
    numbers: readDashboard(must(board, "nadzorna ploča")),
    sales: {
      orders: paidOrders.length,
      revenueCents: paidOrders.reduce((sum, order) => sum + order.total_cents, 0),
    },
    funnel,
  };
}
