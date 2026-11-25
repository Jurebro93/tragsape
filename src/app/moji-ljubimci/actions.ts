"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { account } from "@/messages/hr/account";
import { common } from "@/messages/hr/common";
import { livada } from "@/messages/hr/livada";
import { getViewer } from "@/server/auth";
import { MEDIA_BUCKET } from "@/server/memorials/photos";
import { createSessionClient } from "@/server/supabase/session";

export type ActionState = { error: string | null; done?: boolean };

async function refresh(id: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase.from("memorials").select("id, slug").eq("id", id).maybeSingle();
  updateTag(`memorial:${id}`);
  if (data) {
    updateTag(`memorial-slug:${data.slug}`);
  }
  updateTag("sitemap");
  updateTag("livada");
}

/** Odobravanje ili skrivanje poruke. Tko smije moderirati, odlučuje RLS. */
export async function moderateEntryAction(memorialId: string, entryId: string, status: "approved" | "hidden") {
  const supabase = await createSessionClient();
  await supabase.from("guestbook_entries").update({ status }).eq("id", entryId).eq("memorial_id", memorialId);
  await refresh(memorialId);
}

export async function setGuestbookModeAction(memorialId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const mode = String(formData.get("mode") ?? "");
  if (mode !== "premoderate" && mode !== "open" && mode !== "off") {
    return { error: common.errors.generic };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("memorials")
    .update({ guestbook_mode: mode })
    .eq("id", memorialId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: common.errors.generic };
  }
  await refresh(memorialId);
  return { error: null, done: true };
}

export async function setVisibilityAction(memorialId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const visibility = String(formData.get("visibility") ?? "");
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("set_memorial_visibility", { p_id: memorialId, p_visibility: visibility });
  if (error) {
    return { error: common.errors.generic };
  }
  await refresh(memorialId);
  return { error: null, done: true };
}

export async function unpublishAction(memorialId: string) {
  const supabase = await createSessionClient();
  await supabase.rpc("unpublish_memorial", { p_id: memorialId });
  await refresh(memorialId);
  redirect(`/moji-ljubimci/${memorialId}`);
}

/** Trajno brisanje: prvo datoteke, zatim redak (ostalo briše baza kaskadno). Samo vlasnik. */
export async function deleteMemorialAction(memorialId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) {
    return { error: common.errors.generic };
  }
  const supabase = await createSessionClient();
  const { data: memorial } = await supabase
    .from("memorials")
    .select("id, slug, name, owner_id")
    .eq("id", memorialId)
    .maybeSingle();
  if (!memorial || memorial.owner_id !== viewer.id) {
    return { error: common.errors.generic };
  }
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (typed !== memorial.name.trim().toLowerCase()) {
    return { error: account.danger.mismatch };
  }
  const { data: photos } = await supabase.from("memorial_photos").select("storage_path").eq("memorial_id", memorialId);
  const files = (photos ?? []).flatMap((photo) =>
    ["full", "medium", "thumb"].map((variant) => `${photo.storage_path}/${variant}.webp`),
  );
  if (files.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(files);
  }
  const { error } = await supabase.from("memorials").delete().eq("id", memorialId);
  if (error) {
    return { error: common.errors.generic };
  }
  updateTag(`memorial:${memorialId}`);
  updateTag(`memorial-slug:${memorial.slug}`);
  updateTag("sitemap");
  updateTag("livada");
  redirect("/moji-ljubimci");
}

/** Obiteljska stranica: jedna adresa za sve javne spomene računa. */
export async function saveFamilyAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  if (title === "") {
    return { error: livada.family.manage.titleRequired };
  }
  const supabase = await createSessionClient();
  const { data: slug, error } = await supabase.rpc("save_family", {
    p_title: title.slice(0, 80),
    p_intro: String(formData.get("intro") ?? "").slice(0, 400),
    p_is_public: formData.get("is_public") === "on",
  });
  if (error || !slug) {
    return { error: common.errors.generic };
  }
  updateTag(`family:${slug}`);
  return { error: null, done: true };
}
