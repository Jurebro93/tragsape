import "server-only";
import type { Json } from "@/server/supabase/database.types";
import { createSessionClient } from "@/server/supabase/session";
import { isUuid } from "./forms";
import { gestureState, type GestureState } from "./gestures";
import { PAGE_SIZE, must, type MemorialRef, type SessionClient } from "./queries";

/** Narudžbe za adminov popis i pojedinačni prikaz. Čita klijent sa sesijom; odlučuje RLS. */

export const ORDER_STATUSES = ["pending", "paid", "failed", "expired", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export type OrderLineSummary = { kind: string; productKey: string };

export type OrderListItem = {
  id: string;
  createdAt: string;
  email: string | null;
  status: string;
  totalCents: number;
  discountCents: number;
  promoCode: string | null;
  lines: OrderLineSummary[];
};

export type OrderList = { orders: OrderListItem[]; total: number; productNames: Record<string, string> };

/** Nazivi proizvoda po ključu, za prikaz stavki. */
export async function loadProductNames(supabase: SessionClient): Promise<Record<string, string>> {
  const products = must(await supabase.from("products").select("key, name"), "proizvodi");
  return Object.fromEntries(products.map((product) => [product.key, product.name]));
}

export async function loadOrders(status: OrderStatus | null, page: number): Promise<OrderList> {
  const supabase = await createSessionClient();
  let query = supabase
    .from("orders")
    .select(
      "id, created_at, email, status, total_cents, discount_cents, promo:promo_codes(code), lines:order_lines(kind, product_key, position)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) {
    query = query.eq("status", status);
  }
  const [result, productNames] = await Promise.all([query, loadProductNames(supabase)]);
  // Stranica iza kraja popisa nije greška; samo je prazna.
  if (result.error && result.error.code !== "PGRST103") {
    throw new Error(`Admin (narudžbe): ${result.error.message}`);
  }
  return {
    orders: (result.data ?? []).map((order) => ({
      id: order.id,
      createdAt: order.created_at,
      email: order.email,
      status: order.status,
      totalCents: order.total_cents,
      discountCents: order.discount_cents,
      promoCode: order.promo?.code ?? null,
      lines: [...order.lines]
        .sort((a, b) => a.position - b.position)
        .map((line) => ({ kind: line.kind, productKey: line.product_key })),
    })),
    total: result.count ?? 0,
    productNames,
  };
}

export type OrderDetailLine = {
  id: string;
  kind: string;
  productKey: string;
  unitAmountCents: number;
  discountCents: number;
  totalCents: number;
  discountReason: string | null;
  /** Spomen stavke; null ako stavka nije vezana uz spomen. */
  memorialId: string | null;
  /** Podaci o spomenu; null i kad spomen više ne postoji. */
  memorial: MemorialRef | null;
};

export type OrderDetail = {
  order: {
    id: string;
    createdAt: string;
    paidAt: string | null;
    refundedAt: string | null;
    email: string | null;
    userId: string | null;
    status: string;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    promoCode: string | null;
    withdrawalWaiverAt: string | null;
    attribution: Json | null;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
  };
  lines: OrderDetailLine[];
  entitlements: Array<{
    id: string;
    tier: string;
    status: string;
    appliedAt: string | null;
    memorial: MemorialRef | null;
  }>;
  gifts: Array<{
    id: string;
    /** Prva četiri znaka koda i trotočje. Cijeli kod nikad ne napušta ovaj modul. */
    codePreview: string;
    buyerName: string | null;
    recipientName: string | null;
    recipientEmail: string;
    sendAt: string;
    sentAt: string | null;
    redeemedAt: string | null;
  }>;
  gestures: Array<{
    id: string;
    kind: string;
    displayName: string;
    message: string | null;
    expiresAt: string;
    state: GestureState;
    memorial: MemorialRef | null;
  }>;
  donations: Array<{ id: string; amountCents: number; status: string; shelterName: string | null }>;
  commission: {
    partnerName: string | null;
    baseCents: number;
    commissionCents: number;
    status: string;
    paidAt: string | null;
    payoutNote: string | null;
  } | null;
  productNames: Record<string, string>;
};

const MEMORIAL_REF = "id, name, slug, status, visibility";

/** Kod poklona je tajna kojom se poklon preuzima; admin vidi samo početak, dovoljan za prepoznavanje. */
function previewGiftCode(code: string): string {
  return `${code.slice(0, 4)}…`;
}

export async function loadOrderDetail(orderId: string): Promise<OrderDetail | null> {
  if (!isUuid(orderId)) {
    return null;
  }
  const supabase = await createSessionClient();
  const now = Date.now();
  const orderResult = await supabase
    .from("orders")
    .select(
      "id, created_at, paid_at, refunded_at, email, user_id, status, subtotal_cents, discount_cents, total_cents, withdrawal_waiver_at, attribution, stripe_checkout_session_id, stripe_payment_intent_id, promo:promo_codes(code)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderResult.error) {
    throw new Error(`Admin (narudžba): ${orderResult.error.message}`);
  }
  const order = orderResult.data;
  if (!order) {
    return null;
  }

  const lines = must(
    await supabase
      .from("order_lines")
      .select(
        `id, position, kind, product_key, memorial_id, unit_amount_cents, discount_cents, total_cents, discount_reason, memorial:memorials(${MEMORIAL_REF})`,
      )
      .eq("order_id", orderId)
      .order("position"),
    "stavke narudžbe",
  );
  const lineIds = lines.map((line) => line.id);

  const [entitlements, gifts, gestures, donations, commission, productNames] = await Promise.all([
    lineIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("entitlements")
          .select(`id, tier, status, applied_at, created_at, memorial:memorials(${MEMORIAL_REF})`)
          .in("order_line_id", lineIds)
          .order("created_at")
          .then((result) => must(result, "prava")),
    lineIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("gifts")
          .select("id, code, buyer_name, recipient_name, recipient_email, send_at, sent_at, redeemed_at, created_at")
          .in("order_line_id", lineIds)
          .order("created_at")
          .then((result) => must(result, "pokloni")),
    lineIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("gestures")
          .select(`id, kind, display_name, message, expires_at, status, created_at, memorial:memorials(${MEMORIAL_REF})`)
          .in("order_line_id", lineIds)
          .order("created_at")
          .then((result) => must(result, "geste")),
    lineIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("donation_entries")
          .select("id, amount_cents, status, created_at, shelter:shelters(name)")
          .in("order_line_id", lineIds)
          .order("created_at")
          .then((result) => must(result, "donacije")),
    supabase
      .from("partner_commissions")
      .select("base_cents, commission_cents, status, paid_at, payout_note, partner:partners(name)")
      .eq("order_id", orderId)
      .maybeSingle()
      .then((result) => {
        if (result.error) {
          throw new Error(`Admin (provizija): ${result.error.message}`);
        }
        return result.data;
      }),
    loadProductNames(supabase),
  ]);

  return {
    order: {
      id: order.id,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      refundedAt: order.refunded_at,
      email: order.email,
      userId: order.user_id,
      status: order.status,
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      totalCents: order.total_cents,
      promoCode: order.promo?.code ?? null,
      withdrawalWaiverAt: order.withdrawal_waiver_at,
      attribution: order.attribution,
      stripeCheckoutSessionId: order.stripe_checkout_session_id,
      stripePaymentIntentId: order.stripe_payment_intent_id,
    },
    lines: lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      productKey: line.product_key,
      unitAmountCents: line.unit_amount_cents,
      discountCents: line.discount_cents,
      totalCents: line.total_cents,
      discountReason: line.discount_reason,
      memorialId: line.memorial_id,
      memorial: line.memorial,
    })),
    entitlements: entitlements.map((entitlement) => ({
      id: entitlement.id,
      tier: entitlement.tier,
      status: entitlement.status,
      appliedAt: entitlement.applied_at,
      memorial: entitlement.memorial,
    })),
    gifts: gifts.map((gift) => ({
      id: gift.id,
      codePreview: previewGiftCode(gift.code),
      buyerName: gift.buyer_name,
      recipientName: gift.recipient_name,
      recipientEmail: gift.recipient_email,
      sendAt: gift.send_at,
      sentAt: gift.sent_at,
      redeemedAt: gift.redeemed_at,
    })),
    gestures: gestures.map((gesture) => ({
      id: gesture.id,
      kind: gesture.kind,
      displayName: gesture.display_name,
      message: gesture.message,
      expiresAt: gesture.expires_at,
      state: gestureState(gesture.status, gesture.expires_at, now),
      memorial: gesture.memorial,
    })),
    donations: donations.map((donation) => ({
      id: donation.id,
      amountCents: donation.amount_cents,
      status: donation.status,
      shelterName: donation.shelter?.name ?? null,
    })),
    commission: commission
      ? {
          partnerName: commission.partner?.name ?? null,
          baseCents: commission.base_cents,
          commissionCents: commission.commission_cents,
          status: commission.status,
          paidAt: commission.paid_at,
          payoutNote: commission.payout_note,
        }
      : null,
    productNames,
  };
}
