"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { yearsBetween } from "@/lib/format";
import { isPaid } from "@/lib/memorial";
import { speciesLabel } from "@/lib/species";
import { common } from "@/messages/hr/common";
import { storyHelper } from "@/messages/hr/story-helper";
import { generateStoryDraft } from "@/server/ai/story";
import { getEditableMemorial, memorialTags } from "@/server/memorials/access";
import { withinRateLimit } from "@/server/public/visitor";
import { createSessionClient } from "@/server/supabase/session";

export type HelperState = { draft: string | null; error: string | null; answers: Record<string, string> };

const DAILY_DRAFTS_PER_MEMORIAL = 5;

/** Nacrt priče iz vlasnikovih odgovora. Dostupno uz plaćeni paket, uz dnevno ograničenje. */
export async function draftStoryAction(id: string, _previous: HelperState, formData: FormData): Promise<HelperState> {
  const answers: Record<string, string> = {};
  for (const question of storyHelper.questions) {
    answers[question.key] = String(formData.get(question.key) ?? "").slice(0, 600);
  }
  const editable = await getEditableMemorial(id);
  if (!editable) {
    return { draft: null, error: common.errors.generic, answers };
  }
  const { memorial } = editable;
  if (!isPaid(memorial.tier)) {
    return { draft: null, error: storyHelper.errors.paid, answers };
  }
  if (Object.values(answers).filter((value) => value.trim() !== "").length < 2) {
    return { draft: null, error: storyHelper.errors.tooFew, answers };
  }
  if (!(await withinRateLimit(`ai-prica:${id}`, 86400, DAILY_DRAFTS_PER_MEMORIAL))) {
    return { draft: null, error: storyHelper.errors.limit, answers };
  }
  const result = await generateStoryDraft({
    name: memorial.name,
    species: speciesLabel(memorial.species),
    breed: memorial.breed,
    sex: memorial.sex,
    years: yearsBetween(memorial.birthDate, memorial.deathDate),
    answers,
  });
  if (!result.ok) {
    const error =
      result.error === "not_configured"
        ? storyHelper.errors.notConfigured
        : result.error === "too_few"
          ? storyHelper.errors.tooFew
          : result.error === "refused"
            ? storyHelper.errors.refused
            : storyHelper.errors.failed;
    return { draft: null, error, answers };
  }
  return { draft: result.draft, error: null, answers };
}

/** Sprema (uređeni) nacrt kao priču spomena. */
export async function saveDraftAsStoryAction(id: string, formData: FormData): Promise<void> {
  const story = String(formData.get("story") ?? "").trim().slice(0, 20000);
  if (story !== "") {
    const supabase = await createSessionClient();
    const { data } = await supabase
      .from("memorials")
      .update({ story_md: story })
      .eq("id", id)
      .select("id, slug, status");
    if (data && data.length > 0 && data[0].status === "published") {
      for (const tag of memorialTags(data[0])) {
        updateTag(tag);
      }
    }
  }
  redirect(`/izradi/${id}/prica`);
}
