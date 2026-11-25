import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { fetchAllRows, must } from "./queries";

/** Kodovi za popust, partneri i provizije. Tablice su čitljive samo adminu (RLS). */

export type PromoCode = {
  id: string;
  code: string;
  kind: string;
  partnerId: string | null;
  discountType: string;
  discountValue: number;
  appliesTo: string[];
  maxRedemptions: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
};

export type Partner = {
  id: string;
  name: string;
  type: string;
  contact: string | null;
  commissionType: string;
  commissionValue: number;
  active: boolean;
  notes: string | null;
};

export type Commission = {
  id: string;
  orderId: string;
  createdAt: string;
  baseCents: number;
  commissionCents: number;
  status: string;
  paidAt: string | null;
  payoutNote: string | null;
};

export type PartnerCommissions = {
  partnerId: string;
  partnerName: string;
  totals: { accruedCents: number; paidCents: number; voidCents: number };
  commissions: Commission[];
};

export type CodesData = {
  promoCodes: PromoCode[];
  partners: Partner[];
  commissions: PartnerCommissions[];
  products: Array<{ key: string; name: string }>;
};

export async function loadCodes(): Promise<CodesData> {
  const supabase = await createSessionClient();
  const [promoCodes, partners, commissions, products] = await Promise.all([
    fetchAllRows(
      (from, to) =>
        supabase
          .from("promo_codes")
          .select(
            "id, code, kind, partner_id, discount_type, discount_value, applies_to, max_redemptions, redeemed_count, valid_from, valid_to, active, created_at",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      "kodovi",
    ),
    fetchAllRows(
      (from, to) =>
        supabase
          .from("partners")
          .select("id, name, type, contact, commission_type, commission_value, active, notes")
          .order("name")
          .order("id")
          .range(from, to),
      "partneri",
    ),
    fetchAllRows(
      (from, to) =>
        supabase
          .from("partner_commissions")
          .select("id, partner_id, order_id, base_cents, commission_cents, status, paid_at, payout_note, created_at")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      "provizije",
    ),
    supabase.from("products").select("key, name").then((result) => must(result, "proizvodi")),
  ]);

  const partnerNames = new Map(partners.map((partner) => [partner.id, partner.name]));
  const byPartner = new Map<string, PartnerCommissions>();
  for (const row of commissions) {
    let group = byPartner.get(row.partner_id);
    if (!group) {
      group = {
        partnerId: row.partner_id,
        partnerName: partnerNames.get(row.partner_id) ?? row.partner_id,
        totals: { accruedCents: 0, paidCents: 0, voidCents: 0 },
        commissions: [],
      };
      byPartner.set(row.partner_id, group);
    }
    if (row.status === "paid") {
      group.totals.paidCents += row.commission_cents;
    } else if (row.status === "void") {
      group.totals.voidCents += row.commission_cents;
    } else {
      group.totals.accruedCents += row.commission_cents;
    }
    group.commissions.push({
      id: row.id,
      orderId: row.order_id,
      createdAt: row.created_at,
      baseCents: row.base_cents,
      commissionCents: row.commission_cents,
      status: row.status,
      paidAt: row.paid_at,
      payoutNote: row.payout_note,
    });
  }

  return {
    promoCodes: promoCodes.map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      partnerId: row.partner_id,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      appliesTo: row.applies_to,
      maxRedemptions: row.max_redemptions,
      redeemedCount: row.redeemed_count,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      active: row.active,
    })),
    partners: partners.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      contact: row.contact,
      commissionType: row.commission_type,
      commissionValue: row.commission_value,
      active: row.active,
      notes: row.notes,
    })),
    commissions: [...byPartner.values()].sort((a, b) => a.partnerName.localeCompare(b.partnerName, "hr")),
    products,
  };
}
