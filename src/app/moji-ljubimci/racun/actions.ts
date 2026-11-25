"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/owner/types";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { memorialTags } from "@/server/memorials/access";
import { MEDIA_BUCKET } from "@/server/memorials/photos";
import { createAdminClient } from "@/server/supabase/admin";
import { createSessionClient } from "@/server/supabase/session";

const t = owner.account.delete;
const REMOVE_CHUNK = 100;

/**
 * Trajno briše račun. Redoslijed: sesija se provjerava kod Supabase Autha (ne samo iz kolačića),
 * datoteke svih vlastitih spomena brišu se korisnikovom sesijom, a zatim se servisnim ključem
 * briše sam korisnik; ostalo baza briše kaskadno. Narudžbe ostaju bez veze s računom.
 */
export async function deleteAccountAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createSessionClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user || user.is_anonymous || !user.email) {
    return { error: common.errors.generic };
  }
  const typed = String(formData.get("email") ?? "").trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) {
    return { error: t.mismatch };
  }

  const { data: memorials, error: memorialsError } = await supabase
    .from("memorials")
    .select("id, slug, status")
    .eq("owner_id", user.id);
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("slug")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (memorialsError || familyError) {
    return { error: t.failed };
  }

  // Datoteke prvo: nakon brisanja korisnika više ih nitko ne bi smio ni znao ukloniti.
  for (const memorial of memorials ?? []) {
    const { data: photos, error: photosError } = await supabase
      .from("memorial_photos")
      .select("storage_path")
      .eq("memorial_id", memorial.id);
    if (photosError) {
      return { error: t.failed };
    }
    const files = (photos ?? []).flatMap((photo) =>
      ["full", "medium", "thumb"].map((variant) => `${photo.storage_path}/${variant}.webp`),
    );
    for (let index = 0; index < files.length; index += REMOVE_CHUNK) {
      const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(files.slice(index, index + REMOVE_CHUNK));
      if (error) {
        return { error: t.failed };
      }
    }
  }

  const { error: deleteError } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[racun] korisnik nije obrisan", deleteError.message);
    return { error: t.failed };
  }

  for (const memorial of memorials ?? []) {
    for (const tag of memorialTags(memorial)) {
      updateTag(tag);
    }
  }
  if (family) {
    updateTag(`family:${family.slug}`);
  }
  updateTag("sitemap");
  updateTag("livada");

  // Korisnika više nema, pa odjava kod Autha može javiti grešku; kolačići sesije se svejedno brišu.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }
  redirect("/");
}
