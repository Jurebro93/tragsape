"use server";

import { refresh } from "next/cache";
import type { AdoptionFormState } from "@/components/owner/reminder-forms";
import type { ActionState } from "@/components/owner/types";
import { parseDateParts } from "@/lib/validation";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { getOwnerContext, refreshPublicPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";

const t = owner.reminders;

async function savePrefs(
  memorialId: string,
  prefs: { birthday: boolean; adoption: boolean; anniversary: boolean },
): Promise<ActionState> {
  const context = await getOwnerContext(memorialId);
  if (!context) {
    return { error: common.errors.generic };
  }
  if (!context.paid) {
    return { error: t.errors.paid };
  }
  const supabase = await createSessionClient();
  // Redak je uvijek korisnikov vlastiti; RLS odbija tuđi `user_id` i spomen koji ne smije uređivati.
  const { error } = await supabase
    .from("reminder_prefs")
    .upsert(
      { memorial_id: memorialId, user_id: context.viewer.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "memorial_id,user_id" },
    );
  if (error) {
    return { error: common.errors.generic };
  }
  refresh();
  return { error: null, done: true };
}

/** Prvi pristanak: korisnik je rekao „da", pa se uključuju sva tri podsjetnika. */
export async function enableRemindersAction(
  memorialId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return savePrefs(memorialId, { birthday: true, adoption: true, anniversary: true });
}

export async function saveRemindersAction(
  memorialId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return savePrefs(memorialId, {
    birthday: formData.get("birthday") === "on",
    adoption: formData.get("adoption") === "on",
    anniversary: formData.get("anniversary") === "on",
  });
}

/** Postavlja ili briše dan dolaska u obitelj. Bez preciznosti u bazi, pa traži cijeli datum. */
export async function saveAdoptionDateAction(
  memorialId: string,
  _previous: AdoptionFormState,
  formData: FormData,
): Promise<AdoptionFormState> {
  const values = {
    day: String(formData.get("adoption_day") ?? "").trim(),
    month: String(formData.get("adoption_month") ?? "").trim(),
    year: String(formData.get("adoption_year") ?? "").trim(),
  };
  const parsed = parseDateParts(values);
  if ("error" in parsed) {
    return { error: parsed.error, values };
  }
  if (parsed.date !== null && parsed.precision !== "day") {
    return { error: t.adoption.errors.incomplete, values };
  }
  const context = await getOwnerContext(memorialId);
  if (!context) {
    return { error: common.errors.generic, values };
  }
  if (!context.paid) {
    return { error: t.errors.paid, values };
  }
  const { memorial } = context;
  if (parsed.date !== null) {
    if (memorial.deathDate && parsed.date > memorial.deathDate) {
      return { error: t.adoption.errors.afterDeath, values };
    }
    if (memorial.birthDate && parsed.date < memorial.birthDate) {
      return { error: t.adoption.errors.beforeBirth, values };
    }
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("memorials")
    .update({ adoption_date: parsed.date })
    .eq("id", memorialId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: common.errors.generic, values };
  }
  refreshPublicPage(memorial);
  refresh();
  return { error: null, done: true, message: parsed.date === null ? t.adoption.cleared : t.adoption.saved };
}
