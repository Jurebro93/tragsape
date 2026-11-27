"use server";

import { refresh, updateTag } from "next/cache";
import { isUuid } from "@/server/admin/forms";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

/** Sakriva ili vraća trag na Velikoj livadi (moderacija). Mijenja se samo stanje, kroz RLS za admina. */
export async function setFlowerStatusAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/livada");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "hidden" ? "hidden" : "visible";
  if (!isUuid(id)) {
    return;
  }
  const supabase = await createSessionClient();
  // Trag na čekanju nema mjesto; vidljivim ga čini samo potvrda vlasnika e-mailom.
  const { error } = await supabase.from("meadow_flowers").update({ status }).eq("id", id).neq("status", "pending");
  if (error) {
    throw new Error(`Trag nije promijenjen: ${error.message}`);
  }
  updateTag("livada-tragovi");
  refresh();
}

/** Odobrava ili odbija posvetu uz trag. Odobrena se odmah prikazuje na stranici traga. */
export async function setDedicationStatusAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/livada");
  const id = String(formData.get("id") ?? "");
  const number = Number(formData.get("number"));
  const status = formData.get("status") === "approved" ? "approved" : "rejected";
  if (!isUuid(id)) {
    return;
  }
  const supabase = await createSessionClient();
  const { error } = await supabase.from("meadow_flowers").update({ dedication_status: status }).eq("id", id);
  if (error) {
    throw new Error(`Posveta nije promijenjena: ${error.message}`);
  }
  if (Number.isInteger(number) && number > 0) {
    updateTag(`livada-trag:${number}`);
  }
  refresh();
}
