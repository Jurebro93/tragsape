"use server";

import { refresh } from "next/cache";
import { adminPanel } from "@/messages/hr/admin-panel";
import { isUuid, type AdminActionState } from "@/server/admin/forms";
import { parseCommissionNote, parsePartnerForm, parsePromoForm } from "@/server/admin/schemas";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const t = adminPanel.common;
const promoErrors = adminPanel.codes.promo.errors;

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/** Dodaje kod (`promoId` je null) ili sprema izmjene postojećeg. */
export async function savePromoCodeAction(
  promoId: string | null,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/kodovi");
  if (promoId !== null && !isUuid(promoId)) {
    return { error: t.notFound };
  }
  const parsed = parsePromoForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } =
    promoId === null
      ? await supabase.from("promo_codes").insert(parsed.value).select("id")
      : await supabase.from("promo_codes").update(parsed.value).eq("id", promoId).select("id");
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: promoErrors.taken };
    }
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { error: promoErrors.partnerMissing };
    }
    return { error: t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refresh();
  return { error: null, done: true };
}

/** Dodaje partnera (`partnerId` je null) ili sprema izmjene postojećeg. */
export async function savePartnerAction(
  partnerId: string | null,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/kodovi");
  if (partnerId !== null && !isUuid(partnerId)) {
    return { error: t.notFound };
  }
  const parsed = parsePartnerForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } =
    partnerId === null
      ? await supabase.from("partners").insert(parsed.value).select("id")
      : await supabase.from("partners").update(parsed.value).eq("id", partnerId).select("id");
  if (error) {
    return { error: t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refresh();
  return { error: null, done: true };
}

/** Označava obračunatu proviziju isplaćenom. Stornirana ili već isplaćena se ne dira. */
export async function markCommissionPaidAction(
  commissionId: string,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/kodovi");
  if (!isUuid(commissionId)) {
    return { error: t.notFound };
  }
  const note = parseCommissionNote(formData);
  if (!note.ok) {
    return { error: note.error };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("partner_commissions")
    .update({ status: "paid", paid_at: new Date().toISOString(), payout_note: note.value })
    .eq("id", commissionId)
    .eq("status", "accrued")
    .select("id");
  if (error) {
    return { error: t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refresh();
  return { error: null, done: true };
}
