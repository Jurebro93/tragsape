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
