import "server-only";
import { updateTag } from "next/cache";
import type { SessionClient } from "./queries";

/**
 * Adminove izmjene koje mijenjaju ono što javnost vidi: skrivanje spomena, uklanjanje poruke,
 * skrivanje geste. Zovu se samo iz poslužiteljskih akcija koje su već provjerile admina
 * (`updateTag` radi jedino ondje); tko smije napraviti izmjenu, ponovno odlučuje RLS.
 */

export type VisibilityResult = { ok: true; memorialId: string } | { ok: false; reason: "failed" | "not_found" };

/** Osvježava sve što je predmemorirano o spomenu: stranicu, Livadu, obiteljsku stranicu i sitemap. */
export async function refreshMemorialTags(supabase: SessionClient, memorialId: string): Promise<void> {
  const { data } = await supabase.from("memorials").select("slug").eq("id", memorialId).maybeSingle();
  updateTag(`memorial:${memorialId}`);
  if (data) {
    // Dok je spomen skriven, pod adresom je predmemorirano „ne postoji"; taj zapis nosi samo ovu oznaku.
    updateTag(`memorial-slug:${data.slug}`);
  }
  updateTag("livada");
  updateTag("sitemap");
}

/**
 * Skriva objavljeni spomen ili vraća skriveni. Funkcija u bazi šutke ne radi ništa za nacrt
 * ili nepostojeći spomen, pa se ishod provjerava čitanjem.
 */
export async function setMemorialHidden(
  supabase: SessionClient,
  memorialId: string,
  hidden: boolean,
): Promise<VisibilityResult> {
  const { error } = await supabase.rpc("admin_set_memorial_hidden", { p_id: memorialId, p_hidden: hidden });
  if (error) {
    return { ok: false, reason: "failed" };
  }
  const { data } = await supabase.from("memorials").select("status").eq("id", memorialId).maybeSingle();
  if (!data || data.status !== (hidden ? "hidden" : "published")) {
    return { ok: false, reason: "not_found" };
  }
  await refreshMemorialTags(supabase, memorialId);
  return { ok: true, memorialId };
}

/** Sakriva aktivnu gestu ili vraća skrivenu. Gesta s vraćenim novcem ostaje kakva jest. */
export async function setGestureHidden(
  supabase: SessionClient,
  gestureId: string,
  hidden: boolean,
): Promise<VisibilityResult> {
  const { data, error } = await supabase
    .from("gestures")
    .update({ status: hidden ? "hidden" : "active" })
    .eq("id", gestureId)
    .eq("status", hidden ? "active" : "hidden")
    .select("id, memorial_id");
  if (error) {
    return { ok: false, reason: "failed" };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: "not_found" };
  }
  await refreshMemorialTags(supabase, data[0].memorial_id);
  return { ok: true, memorialId: data[0].memorial_id };
}

/** Trajno uklanja poruku iz knjige sjećanja; nakon toga je ne vidi ni vlasnik. */
export async function removeGuestbookEntry(supabase: SessionClient, entryId: string): Promise<VisibilityResult> {
  const { data, error } = await supabase
    .from("guestbook_entries")
    .update({ status: "removed" })
    .eq("id", entryId)
    .neq("status", "removed")
    .select("id, memorial_id");
  if (error) {
    return { ok: false, reason: "failed" };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: "not_found" };
  }
  await refreshMemorialTags(supabase, data[0].memorial_id);
  return { ok: true, memorialId: data[0].memorial_id };
}
