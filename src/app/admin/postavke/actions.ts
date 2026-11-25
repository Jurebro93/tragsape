"use server";

import { updateTag } from "next/cache";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { formText, parseEuroToCents, type AdminActionState } from "@/server/admin/forms";
import { parseRepeatDiscount } from "@/server/admin/schemas";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const t = adminPanel.common;
const text = adminPanel.settings;

/**
 * Sprema cijene i dostupnost proizvoda. Obrazac šalje cijenu u eurima; u bazu idu centi.
 * Mijenjaju se samo proizvodi koji već postoje u bazi i samo oni kojima se nešto promijenilo.
 */
export async function saveProductsAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin("/admin/postavke");
  const supabase = await createSessionClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("key, name, unit_amount_cents, base_amount_cents, offered_on, active");
  if (error || !products) {
    return { error: t.failed };
  }

  // Obrazac navodi koje je proizvode prikazao; neoznačena kućica inače se ne razlikuje od
  // proizvoda kojeg u obrascu nije ni bilo.
  const shown = new Set(formData.getAll("product").filter((value): value is string => typeof value === "string"));
  const changes: Array<{
    key: string;
    name: string;
    unit_amount_cents: number;
    base_amount_cents: number;
    offered_on: string | null;
    active: boolean;
  }> = [];
  for (const product of products) {
    if (!shown.has(product.key)) {
      continue;
    }
    const cents = parseEuroToCents(formText(formData, `price:${product.key}`));
    if (cents === null) {
      return { error: fill(text.products.errors.price, { name: product.name }) };
    }
    const base = parseEuroToCents(formText(formData, `base:${product.key}`));
    if (base === null) {
      return { error: fill(text.products.errors.base, { name: product.name }) };
    }
    const offeredText = formText(formData, `offered:${product.key}`);
    if (offeredText !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(offeredText) || Number.isNaN(Date.parse(offeredText)))) {
      return { error: fill(text.products.errors.offeredOn, { name: product.name }) };
    }
    const offeredOn = offeredText === "" ? null : offeredText;
    const active = formData.get(`active:${product.key}`) === "on";
    if (
      cents !== product.unit_amount_cents ||
      base !== product.base_amount_cents ||
      offeredOn !== product.offered_on ||
      active !== product.active
    ) {
      changes.push({
        key: product.key,
        name: product.name,
        unit_amount_cents: cents,
        base_amount_cents: base,
        offered_on: offeredOn,
        active,
      });
    }
  }

  const failed: string[] = [];
  for (const change of changes) {
    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update({
        unit_amount_cents: change.unit_amount_cents,
        // Dok datum ponude nije upisan, baza baznu cijenu sama izjednačava s cijenom.
        base_amount_cents: change.base_amount_cents,
        offered_on: change.offered_on,
        active: change.active,
        updated_at: new Date().toISOString(),
      })
      .eq("key", change.key)
      .select("key");
    // Izmjena koju RLS tiho preskoči ne javlja grešku, samo ne vrati redak.
    if (updateError || !updated || updated.length === 0) {
      console.error("[admin] proizvod nije spremljen", change.key, updateError?.message ?? "nijedan redak");
      failed.push(change.name);
    }
  }

  // Cjenik se osvježava i kad je dio izmjena odbijen: ono što je spremljeno mora biti vidljivo.
  updateTag("products");
  if (failed.length > 0) {
    return { error: fill(text.products.errors.failedFor, { names: failed.join(", ") }) };
  }
  return { error: null, done: true };
}

/** Popust za drugi plaćeni memorijal istog računa. */
export async function saveRepeatDiscountAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/postavke");
  const parsed = parseRepeatDiscount(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ repeat_discount_pct: parsed.value, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: t.failed };
  }
  updateTag("products");
  return { error: null, done: true };
}
