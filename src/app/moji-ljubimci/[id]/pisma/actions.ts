"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { LetterFormState, LetterValues } from "@/components/owner/letter-form";
import { LETTER_BODY_MAX, LETTER_TITLE_MAX } from "@/components/owner/limits";
import type { ActionState } from "@/components/owner/types";
import { zagrebDay } from "@/lib/time";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { getOwnerContext, isUuid, refreshPublicPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";

const t = owner.letters;

function readLetter(formData: FormData): LetterValues {
  return {
    writtenOn: String(formData.get("written_on") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    // Preglednik šalje prijelome kao CRLF; u bazi i u brojanju znakova to je jedan znak.
    body: String(formData.get("body") ?? "")
      .replace(/\r\n?/g, "\n")
      .trim(),
    visibility: formData.get("visibility") === "public" ? "public" : "private",
  };
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Sprema novo pismo ili izmjenu vlastitog. Pisati smije vlasnik ili suradnik na plaćenom
 * spomenu; da je pismo autorovo, provjerava i RLS.
 */
export async function saveLetterAction(
  memorialId: string,
  letterId: string | null,
  _previous: LetterFormState,
  formData: FormData,
): Promise<LetterFormState> {
  const values = readLetter(formData);
  const fieldErrors: LetterFormState["fieldErrors"] = {};
  if (!isRealDate(values.writtenOn) || values.writtenOn < "1950-01-01") {
    fieldErrors.date = t.errors.date;
  } else if (values.writtenOn > zagrebDay()) {
    fieldErrors.date = t.errors.dateFuture;
  }
  if (values.title.length > LETTER_TITLE_MAX) {
    fieldErrors.title = t.errors.title;
  }
  if (values.body.length === 0) {
    fieldErrors.body = t.errors.body;
  } else if (values.body.length > LETTER_BODY_MAX) {
    fieldErrors.body = t.errors.bodyTooLong;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors, values };
  }

  const context = await getOwnerContext(memorialId);
  if (!context) {
    return { error: common.errors.generic, fieldErrors: {}, values };
  }
  if (!context.paid) {
    return { error: t.errors.paid, fieldErrors: {}, values };
  }
  const supabase = await createSessionClient();
  const row = {
    written_on: values.writtenOn,
    title: values.title === "" ? null : values.title,
    body: values.body,
    visibility: values.visibility,
  };
  let wasPublic = false;
  if (letterId !== null) {
    if (!isUuid(letterId)) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
    const { data: existing } = await supabase
      .from("letters")
      .select("id, visibility")
      .eq("id", letterId)
      .eq("memorial_id", memorialId)
      .eq("author_id", context.viewer.id)
      .maybeSingle();
    if (!existing) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
    wasPublic = existing.visibility === "public";
    const { data, error } = await supabase
      .from("letters")
      .update(row)
      .eq("id", letterId)
      .eq("author_id", context.viewer.id)
      .select("id");
    if (error || !data || data.length === 0) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
  } else {
    const { error } = await supabase
      .from("letters")
      .insert({ ...row, memorial_id: memorialId, author_id: context.viewer.id });
    if (error) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
  }
  // Javna stranica prikazuje samo javna pisma; privatno je se ne tiče.
  if (wasPublic || values.visibility === "public") {
    refreshPublicPage(context.memorial);
  }
  redirect(`/moji-ljubimci/${memorialId}/pisma`);
}

/** Briše vlastito pismo. Dopušteno je i na besplatnom spomenu: svoje podatke uvijek možeš ukloniti. */
export async function deleteLetterAction(
  memorialId: string,
  letterId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const context = await getOwnerContext(memorialId);
  if (!context || !isUuid(letterId)) {
    return { error: common.errors.generic };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("letters")
    .delete()
    .eq("id", letterId)
    .eq("memorial_id", memorialId)
    .eq("author_id", context.viewer.id)
    .select("id, visibility");
  if (error || !data || data.length === 0) {
    return { error: common.errors.generic };
  }
  if (data[0].visibility === "public") {
    refreshPublicPage(context.memorial);
  }
  refresh();
  return { error: null, done: true };
}
