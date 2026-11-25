"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { parseDateParts, petBasicsSchema, storyPatchSchema } from "@/lib/validation";
import { common } from "@/messages/hr/common";
import { wizard } from "@/messages/hr/wizard";
import { ensureViewer, getViewer } from "@/server/auth";
import { memorialTags } from "@/server/memorials/access";
import { removePhotoFiles } from "@/server/memorials/photos";
import { createSessionClient } from "@/server/supabase/session";

export type BasicsState = {
  errors: Partial<Record<"name" | "species" | "breed" | "birth" | "death" | "form", string>>;
};

function readBasics(formData: FormData) {
  const parsed = petBasicsSchema.safeParse({
    name: formData.get("name") ?? "",
    species: formData.get("species") ?? "",
    breed: formData.get("breed") ?? "",
    sex: formData.get("sex") ?? "",
  });
  const birth = parseDateParts({
    day: String(formData.get("birth_day") ?? ""),
    month: String(formData.get("birth_month") ?? ""),
    year: String(formData.get("birth_year") ?? ""),
  });
  const death = parseDateParts({
    day: String(formData.get("death_day") ?? ""),
    month: String(formData.get("death_month") ?? ""),
    year: String(formData.get("death_year") ?? ""),
  });
  const errors: BasicsState["errors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name" || field === "species" || field === "breed") {
        errors[field] ??= issue.message;
      }
    }
  }
  if ("error" in birth) {
    errors.birth = birth.error;
  }
  if ("error" in death) {
    errors.death = death.error;
  }
  if (!("error" in birth) && !("error" in death) && birth.date && death.date && birth.date > death.date) {
    errors.death = wizard.pet.datesOrder;
  }
  if (Object.keys(errors).length > 0 || !parsed.success || "error" in birth || "error" in death) {
    return { errors };
  }
  return {
    values: {
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed ?? null,
      sex: parsed.data.sex ?? null,
      birth_date: birth.date,
      birth_precision: birth.precision,
      death_date: death.date,
      death_precision: death.precision,
    },
  };
}

/** Osvježava javnu stranicu ako je spomen već objavljen. */
async function refreshIfPublished(id: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase.from("memorials").select("id, slug, status").eq("id", id).maybeSingle();
  if (data && data.status === "published") {
    for (const tag of memorialTags(data)) {
      updateTag(tag);
    }
    updateTag("sitemap");
    updateTag("livada");
  }
}

/** Prvi korak za novog posjetitelja: otvara anonimnu sesiju i nacrt, pa sprema osnovne podatke. */
export async function startDraftAction(_previous: BasicsState, formData: FormData): Promise<BasicsState> {
  const basics = readBasics(formData);
  if ("errors" in basics && basics.errors) {
    return { errors: basics.errors };
  }
  await ensureViewer();
  const supabase = await createSessionClient();
  const attribution = readAttribution(formData);
  const { data: id, error } = await supabase.rpc("create_memorial_draft", { p_attribution: attribution });
  if (error || !id) {
    const tooMany = error?.message.includes("too_many_drafts");
    return { errors: { form: tooMany ? wizard.pet.tooManyDrafts : common.errors.generic } };
  }
  const { error: updateError } = await supabase
    .from("memorials")
    .update({ ...basics.values, draft_step: 2 })
    .eq("id", id);
  if (updateError) {
    return { errors: { form: common.errors.generic } };
  }
  redirect(`/izradi/${id}/prica`);
}

/** Izvor posjeta (članak, alat, UTM) koji je stigao s poveznicom; sprema se uz nacrt. */
function readAttribution(formData: FormData): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const key of ["iz", "cta", "utm_source", "utm_medium", "utm_campaign"]) {
    const value = String(formData.get(key) ?? "").trim().slice(0, 120);
    if (value !== "") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export async function updateBasicsAction(id: string, _previous: BasicsState, formData: FormData): Promise<BasicsState> {
  const basics = readBasics(formData);
  if ("errors" in basics && basics.errors) {
    return { errors: basics.errors };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("memorials")
    .update(basics.values)
    .eq("id", id)
    .select("id, status, draft_step");
  if (error || !data || data.length === 0) {
    return { errors: { form: common.errors.generic } };
  }
  if (data[0].draft_step < 2) {
    await supabase.from("memorials").update({ draft_step: 2 }).eq("id", id);
  }
  await refreshIfPublished(id);
  redirect(`/izradi/${id}/prica`);
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Sprema dio drugog koraka. Zove se pri napuštanju polja i pri prelasku na pregled. */
export async function saveStoryAction(id: string, patch: unknown): Promise<SaveResult> {
  const parsed = storyPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? wizard.story.saveError };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: true };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from("memorials").update(parsed.data).eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: wizard.story.saveError };
  }
  await refreshIfPublished(id);
  return { ok: true };
}

export async function goToReviewAction(id: string): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.from("memorials").update({ draft_step: 3 }).eq("id", id);
  redirect(`/izradi/${id}/pregled`);
}

export async function setCoverAction(memorialId: string, photoId: string): Promise<SaveResult> {
  const supabase = await createSessionClient();
  const { data: photo } = await supabase
    .from("memorial_photos")
    .select("id")
    .eq("id", photoId)
    .eq("memorial_id", memorialId)
    .maybeSingle();
  if (!photo) {
    return { ok: false, error: common.errors.generic };
  }
  const { data, error } = await supabase
    .from("memorials")
    .update({ cover_photo_id: photoId })
    .eq("id", memorialId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: common.errors.generic };
  }
  await refreshIfPublished(memorialId);
  return { ok: true };
}

export async function deletePhotoAction(memorialId: string, photoId: string): Promise<SaveResult> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("memorial_photos")
    .delete()
    .eq("id", photoId)
    .eq("memorial_id", memorialId)
    .select("id, storage_path");
  if (error || !data || data.length === 0) {
    return { ok: false, error: common.errors.generic };
  }
  await removePhotoFiles(supabase, data[0].storage_path);
  // Ako je uklonjena naslovna, sljedeća fotografija preuzima njezino mjesto.
  const { data: memorial } = await supabase
    .from("memorials")
    .select("cover_photo_id")
    .eq("id", memorialId)
    .maybeSingle();
  if (memorial && memorial.cover_photo_id === null) {
    const { data: next } = await supabase
      .from("memorial_photos")
      .select("id")
      .eq("memorial_id", memorialId)
      .eq("kind", "photo")
      .order("sort_order")
      .order("created_at")
      .limit(1);
    if (next && next.length > 0) {
      await supabase.from("memorials").update({ cover_photo_id: next[0].id }).eq("id", memorialId);
    }
  }
  await refreshIfPublished(memorialId);
  return { ok: true };
}

export type PublishState = { error: string | null };

/** Objava besplatnog spomena. Baza traži potvrđen e-mail i ime; ovdje se samo prevodi odgovor. */
export async function publishFreeAction(id: string, _previous: PublishState): Promise<PublishState> {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    return { error: wizard.review.email.body };
  }
  const supabase = await createSessionClient();
  const { data: slug, error } = await supabase.rpc("publish_memorial", { p_id: id });
  if (error || !slug) {
    const message = error?.message ?? "";
    if (message.includes("name_required")) {
      return { error: wizard.review.missingName };
    }
    if (message.includes("free_limit")) {
      return { error: wizard.review.freeLimit };
    }
    if (message.includes("hidden_by_admin")) {
      return { error: wizard.review.hidden };
    }
    return { error: common.errors.generic };
  }
  updateTag(`memorial:${id}`);
  updateTag(`memorial-slug:${slug}`);
  updateTag("sitemap");
  updateTag("livada");
  redirect(`/spomen/${slug}?objavljeno=1`);
}
