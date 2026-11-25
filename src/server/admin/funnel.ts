import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { must, mustCount } from "./queries";

/** Lijevak i atribucija iz `funnel_events`. Događaji nemaju identifikatore posjetitelja. */

export const FUNNEL_PERIODS = [7, 30, 90] as const;
export type FunnelPeriod = (typeof FUNNEL_PERIODS)[number];
export const DEFAULT_FUNNEL_PERIOD: FunnelPeriod = 30;

/** Koraci redom kojim ih posjetitelj prolazi. */
export const FUNNEL_STEPS = ["draft_started", "step_review", "published_free", "checkout_started", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export function parseFunnelPeriod(value: string): FunnelPeriod {
  return FUNNEL_PERIODS.find((period) => String(period) === value) ?? DEFAULT_FUNNEL_PERIOD;
}

export type FunnelStepCount = {
  step: FunnelStep;
  count: number;
  /** Udio u odnosu na prethodni korak (0–1 i više); null za prvi korak ili kad je prethodni nula. */
  conversion: number | null;
};

export type AttributionRow = {
  source: string;
  drafts: number;
  published: number;
  paidOrders: number;
  revenueCents: number;
};

export type FunnelReport = { steps: FunnelStepCount[]; attribution: AttributionRow[] };

export async function loadFunnel(days: FunnelPeriod): Promise<FunnelReport> {
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [counts, attribution] = await Promise.all([
    Promise.all(
      FUNNEL_STEPS.map(async (step) =>
        mustCount(
          await supabase
            .from("funnel_events")
            .select("id", { count: "exact", head: true })
            .eq("name", step)
            .gte("occurred_at", since),
          `lijevak: ${step}`,
        ),
      ),
    ),
    supabase.rpc("admin_attribution_report", { p_since: since }),
  ]);

  return {
    steps: FUNNEL_STEPS.map((step, index) => ({
      step,
      count: counts[index],
      conversion: index > 0 && counts[index - 1] > 0 ? counts[index] / counts[index - 1] : null,
    })),
    attribution: must(attribution, "atribucija").map((row) => ({
      source: row.source,
      drafts: Number(row.drafts),
      published: Number(row.published),
      paidOrders: Number(row.paid_orders),
      revenueCents: Number(row.revenue_cents),
    })),
  };
}
