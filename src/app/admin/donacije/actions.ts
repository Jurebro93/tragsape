"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminPanel } from "@/messages/hr/admin-panel";
import {
  PROOF_BUCKET,
  PROOF_MAX_BYTES,
  isUuid,
  sanitizeFilename,
  sniffProofType,
  type AdminActionState,
} from "@/server/admin/forms";
import type { SessionClient } from "@/server/admin/queries";
import { parseDonationSettingsForm, parsePayoutForm, parseShelterForm } from "@/server/admin/schemas";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const t = adminPanel.common;
const text = adminPanel.donations;

const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Javna stranica Donacije i iznos donacije na cjeniku čitaju se iz predmemorije: postavke nose
 * oznaku `products`, zbroj i isplate oznaku `donations`.
 */
function refreshDonations(includeSettings = false): void {
  updateTag("donations");
  if (includeSettings) {
    updateTag("products");
  }
}

/** Iznos donacije po plaćenom memorijalu i azil kojem idu nove donacije. */
export async function saveDonationSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  const parsed = parseDonationSettingsForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (error) {
    return { error: error.code === FOREIGN_KEY_VIOLATION ? text.settings.errors.shelter : t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.failed };
  }
  refreshDonations(true);
  return { error: null, done: true };
}

/** Dodaje azil (`shelterId` je null) ili sprema izmjene postojećeg. */
export async function saveShelterAction(
  shelterId: string | null,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  if (shelterId !== null && !isUuid(shelterId)) {
    return { error: t.notFound };
  }
  const parsed = parseShelterForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } =
    shelterId === null
      ? await supabase.from("shelters").insert(parsed.value).select("id")
      : await supabase.from("shelters").update(parsed.value).eq("id", shelterId).select("id");
  if (error) {
    return { error: t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refreshDonations(true);
  return { error: null, done: true };
}

/** Briše azil bez isplata. Azil s isplatama baza ne da obrisati; njega se isključuje. */
export async function deleteShelterAction(
  shelterId: string,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  if (!isUuid(shelterId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from("shelters").delete().eq("id", shelterId).select("id");
  if (error) {
    return { error: error.code === FOREIGN_KEY_VIOLATION ? text.shelters.errors.hasPayouts : t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refreshDonations(true);
  redirect("/admin/donacije#azili");
}

/**
 * Dodaje isplatu (`payoutId` je null) ili sprema izmjene postojeće. Nova isplata se odmah
 * otvara za uređivanje, jer se dokaz učitava uz već spremljenu isplatu.
 */
export async function savePayoutAction(
  payoutId: string | null,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  if (payoutId !== null && !isUuid(payoutId)) {
    return { error: t.notFound };
  }
  const parsed = parsePayoutForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const supabase = await createSessionClient();
  const { data, error } =
    payoutId === null
      ? await supabase.from("donation_payouts").insert(parsed.value).select("id")
      : await supabase.from("donation_payouts").update(parsed.value).eq("id", payoutId).select("id");
  if (error) {
    return { error: error.code === FOREIGN_KEY_VIOLATION ? text.payouts.errors.shelter : t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  refreshDonations();
  if (payoutId === null) {
    redirect(`/admin/donacije?isplata=${data[0].id}#isplata`);
  }
  return { error: null, done: true };
}

export async function deletePayoutAction(
  payoutId: string,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  if (!isUuid(payoutId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("donation_payouts")
    .delete()
    .eq("id", payoutId)
    .select("id, proof_path");
  if (error) {
    return { error: t.failed };
  }
  if (!data || data.length === 0) {
    return { error: t.notFound };
  }
  await removeProofObject(supabase, payoutId, data[0].proof_path);
  refreshDonations();
  redirect("/admin/donacije#isplate");
}

/** Javna adresa mape jedne isplate u pohrani dokaza. */
function proofFolderUrl(supabase: SessionClient, payoutId: string): string {
  return `${supabase.storage.from(PROOF_BUCKET).getPublicUrl(payoutId).data.publicUrl}/`;
}

/**
 * Pokušava obrisati datoteku dokaza koja više nije potrebna; briše samo datoteke iz mape te
 * isplate. Ishod se ne provjerava: pohrana briše samo ono što admin smije i pročitati, pa dok
 * za tu pohranu nema politike čitanja, datoteka ostaje dostupna onome tko ima staru poveznicu.
 * Sa stranice Donacije nestaje u svakom slučaju, jer je poveznica uklonjena iz baze.
 */
async function removeProofObject(supabase: SessionClient, payoutId: string, proofUrl: string | null): Promise<void> {
  const folderUrl = proofFolderUrl(supabase, payoutId);
  if (!proofUrl || !proofUrl.startsWith(folderUrl)) {
    return;
  }
  const filename = proofUrl.slice(folderUrl.length);
  if (!/^[a-z0-9.-]+$/.test(filename)) {
    return;
  }
  await supabase.storage.from(PROOF_BUCKET).remove([`${payoutId}/${filename}`]);
}

/**
 * Učitava dokaz o isplati u javnu pohranu i sprema njegovu adresu uz isplatu. Datoteku
 * učitava klijent sa sesijom, pa i u pohrani vrijedi pravilo „samo admin".
 */
export async function uploadPayoutProofAction(
  payoutId: string,
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  const errors = text.payouts.proof.errors;
  if (!isUuid(payoutId)) {
    return { error: t.notFound };
  }
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: errors.missing };
  }
  if (file.size > PROOF_MAX_BYTES) {
    return { error: errors.tooLarge };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffProofType(bytes);
  if (!type) {
    return { error: errors.type };
  }

  const supabase = await createSessionClient();
  const { data: payout } = await supabase
    .from("donation_payouts")
    .select("id, proof_path")
    .eq("id", payoutId)
    .maybeSingle();
  if (!payout) {
    return { error: t.notFound };
  }

  const bucket = supabase.storage.from(PROOF_BUCKET);
  const filename = sanitizeFilename(file.name, type.extension);
  let path = `${payoutId}/${filename}`;
  let upload = await bucket.upload(path, bytes, { contentType: type.contentType, upsert: false });
  if (upload.error && isDuplicate(upload.error)) {
    // Datoteka tog imena već postoji uz ovu isplatu; nova dobiva oznaku vremena u imenu.
    path = `${payoutId}/${filename.replace(/(\.[a-z]+)$/, `-${Date.now().toString(36)}$1`)}`;
    upload = await bucket.upload(path, bytes, { contentType: type.contentType, upsert: false });
  }
  if (upload.error) {
    console.error("[admin] dokaz o isplati nije učitan", payoutId, upload.error.message);
    return { error: errors.failed };
  }

  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  const { data: saved, error } = await supabase
    .from("donation_payouts")
    .update({ proof_path: publicUrl })
    .eq("id", payoutId)
    .select("id");
  if (error || !saved || saved.length === 0) {
    return { error: t.failed };
  }
  if (payout.proof_path !== publicUrl) {
    await removeProofObject(supabase, payoutId, payout.proof_path);
  }
  refreshDonations();
  return { error: null, done: true };
}

function isDuplicate(error: { message: string }): boolean {
  const status = "statusCode" in error ? String(error.statusCode) : "";
  return status === "409" || /already exists|duplicate/i.test(error.message);
}

/** Uklanja poveznicu na dokaz s isplate; isplata ostaje. */
export async function removePayoutProofAction(
  payoutId: string,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/donacije");
  if (!isUuid(payoutId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const { data: payout } = await supabase
    .from("donation_payouts")
    .select("id, proof_path")
    .eq("id", payoutId)
    .maybeSingle();
  if (!payout) {
    return { error: t.notFound };
  }
  const { data, error } = await supabase
    .from("donation_payouts")
    .update({ proof_path: null })
    .eq("id", payoutId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: t.failed };
  }
  await removeProofObject(supabase, payoutId, payout.proof_path);
  refreshDonations();
  return { error: null, done: true };
}
