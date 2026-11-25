import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { must } from "./queries";
import { PRODUCT_KEYS } from "./schemas";

/** Cjenik, popust za drugi memorijal i Stripe događaji koji traže ručnu provjeru. */

export const STRIPE_ERROR_LIMIT = 50;

export type AdminProduct = {
  key: string;
  name: string;
  unitAmountCents: number;
  baseAmountCents: number;
  /** Dan kad je usluga stavljena u ponudu (YYYY-MM-DD) ili null dok još nije. */
  offeredOn: string | null;
  active: boolean;
};

export type StripeErrorEvent = { eventId: string; type: string; receivedAt: string; error: string };

export type SettingsData = {
  products: AdminProduct[];
  repeatDiscountPct: number;
  stripeErrors: StripeErrorEvent[];
};

/** Poznati proizvodi idu redom iz cjenika; nepoznati (dodani izravno u bazi) iza njih po ključu. */
function productOrder(key: string): number {
  const index = (PRODUCT_KEYS as readonly string[]).indexOf(key);
  return index === -1 ? PRODUCT_KEYS.length : index;
}

export async function loadSettings(): Promise<SettingsData> {
  const supabase = await createSessionClient();
  const [products, settings, stripeErrors] = await Promise.all([
    supabase
      .from("products")
      .select("key, name, unit_amount_cents, base_amount_cents, offered_on, active")
      .then((result) => must(result, "proizvodi")),
    supabase
      .from("settings")
      .select("repeat_discount_pct")
      .eq("id", true)
      .single()
      .then((result) => must(result, "postavke")),
    supabase
      .from("stripe_events")
      .select("event_id, type, received_at, error")
      .not("error", "is", null)
      .order("received_at", { ascending: false })
      .limit(STRIPE_ERROR_LIMIT)
      .then((result) => must(result, "Stripe događaji")),
  ]);

  return {
    products: products
      .map((row) => ({
        key: row.key,
        name: row.name,
        unitAmountCents: row.unit_amount_cents,
        baseAmountCents: row.base_amount_cents,
        offeredOn: row.offered_on,
        active: row.active,
      }))
      .sort((a, b) => productOrder(a.key) - productOrder(b.key) || a.key.localeCompare(b.key)),
    repeatDiscountPct: settings.repeat_discount_pct,
    stripeErrors: stripeErrors.map((row) => ({
      eventId: row.event_id,
      type: row.type,
      receivedAt: row.received_at,
      error: row.error ?? "",
    })),
  };
}
