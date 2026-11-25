"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { TIMELINE_BODY_MAX, TIMELINE_EVENTS_MAX, TIMELINE_TITLE_MAX } from "@/components/owner/limits";
import type { TimelineFormState, TimelineValues } from "@/components/owner/timeline-form";
import type { ActionState } from "@/components/owner/types";
import { parseDateParts } from "@/lib/validation";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { getOwnerContext, isUuid, refreshPublicPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";

const t = owner.timeline;

function readEvent(formData: FormData): TimelineValues {
  return {
    day: String(formData.get("event_day") ?? "").trim(),
    month: String(formData.get("event_month") ?? "").trim(),
    year: String(formData.get("event_year") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "")
      .replace(/\r\n?/g, "\n")
      .trim(),
  };
}

/**
 * Dodaje događaj ili sprema izmjenu. Vremenska crta je dio javne stranice, pa se objavljeni
 * spomen nakon svake izmjene osvježava. Tko smije uređivati, odlučuje RLS.
 */
export async function saveTimelineEventAction(
  memorialId: string,
  eventId: string | null,
  _previous: TimelineFormState,
  formData: FormData,
): Promise<TimelineFormState> {
  const values = readEvent(formData);
  const fieldErrors: TimelineFormState["fieldErrors"] = {};
  const parsed = parseDateParts({ day: values.day, month: values.month, year: values.year });
  if ("error" in parsed) {
    fieldErrors.date = parsed.error;
  } else if (parsed.date === null) {
    fieldErrors.date = t.errors.year;
  }
  if (values.title.length === 0) {
    fieldErrors.title = t.errors.title;
  } else if (values.title.length > TIMELINE_TITLE_MAX) {
    fieldErrors.title = t.errors.titleTooLong;
  }
  if (values.body.length > TIMELINE_BODY_MAX) {
    fieldErrors.body = t.errors.bodyTooLong;
  }
  if (Object.keys(fieldErrors).length > 0 || "error" in parsed || parsed.date === null) {
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
    event_date: parsed.date,
    date_precision: parsed.precision,
    title: values.title,
    body: values.body === "" ? null : values.body,
  };
  if (eventId !== null) {
    if (!isUuid(eventId)) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
    const { data, error } = await supabase
      .from("timeline_events")
      .update(row)
      .eq("id", eventId)
      .eq("memorial_id", memorialId)
      .select("id");
    if (error || !data || data.length === 0) {
      return { error: common.errors.generic, fieldErrors: {}, values };
    }
    refreshPublicPage(context.memorial);
    redirect(`/moji-ljubimci/${memorialId}/vremenska-crta`);
  }

  const { count } = await supabase
    .from("timeline_events")
    .select("id", { count: "exact", head: true })
    .eq("memorial_id", memorialId);
  if ((count ?? 0) >= TIMELINE_EVENTS_MAX) {
    return { error: t.errors.limit, fieldErrors: {}, values };
  }
  const { error } = await supabase.from("timeline_events").insert({ ...row, memorial_id: memorialId });
  if (error) {
    return { error: common.errors.generic, fieldErrors: {}, values };
  }
  refreshPublicPage(context.memorial);
  refresh();
  return { error: null, fieldErrors: {}, done: true };
}

/** Briše događaj. Dopušteno je i na besplatnom spomenu, gdje se crta ionako ne prikazuje. */
export async function deleteTimelineEventAction(
  memorialId: string,
  eventId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const context = await getOwnerContext(memorialId);
  if (!context || !isUuid(eventId)) {
    return { error: common.errors.generic };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("id", eventId)
    .eq("memorial_id", memorialId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: common.errors.generic };
  }
  refreshPublicPage(context.memorial);
  refresh();
  return { error: null, done: true };
}
