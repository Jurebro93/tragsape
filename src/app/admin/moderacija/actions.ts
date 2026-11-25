"use server";

import { refresh } from "next/cache";
import { adminPanel } from "@/messages/hr/admin-panel";
import { isUuid, type AdminActionState } from "@/server/admin/forms";
import type { SessionClient } from "@/server/admin/queries";
import {
  removeGuestbookEntry,
  setGestureHidden,
  setMemorialHidden,
  type VisibilityResult,
} from "@/server/admin/visibility";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const t = adminPanel.common;
const errors = adminPanel.moderation.reports.errors;

const REPORT_ACTIONS = ["hide_memorial", "restore_memorial", "remove_entry", "hide_gesture"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

/** Zatvara otvorenu prijavu i bilježi tko ju je riješio. Već riješena prijava se ne dira. */
async function closeReport(
  supabase: SessionClient,
  reportId: string,
  status: "actioned" | "dismissed",
  adminId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("reports")
    .update({ status, handled_by: adminId })
    .eq("id", reportId)
    .eq("status", "open")
    .select("id");
  return !error && (data ?? []).length > 0;
}

/** Prijava bez osnove: zatvara se, sadržaj ostaje. */
export async function dismissReportAction(
  reportId: string,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const viewer = await requireAdmin("/admin/moderacija");
  if (!isUuid(reportId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  if (!(await closeReport(supabase, reportId, "dismissed", viewer.id))) {
    return { error: t.notFound };
  }
  refresh();
  return { error: null, done: true };
}

/**
 * Radnja nad prijavljenim sadržajem. Što se mijenja, čita se iz same prijave u bazi, a ne iz
 * zahtjeva; nakon uspjeha prijava postaje riješena.
 */
export async function resolveReportAction(
  reportId: string,
  action: ReportAction,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const viewer = await requireAdmin("/admin/moderacija");
  if (!isUuid(reportId) || !REPORT_ACTIONS.includes(action)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, target_type, target_id, memorial_id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.status !== "open") {
    return { error: t.notFound };
  }

  let result: VisibilityResult;
  if (action === "hide_memorial" || action === "restore_memorial") {
    const memorialId = await reportedMemorialId(supabase, report);
    if (!memorialId) {
      return { error: t.notFound };
    }
    const hide = action === "hide_memorial";
    result = await setMemorialHidden(supabase, memorialId, hide);
    if (!result.ok && result.reason === "not_found") {
      return { error: hide ? errors.notHidable : errors.notHidden };
    }
  } else if (action === "remove_entry") {
    if (report.target_type !== "guestbook_entry") {
      return { error: errors.wrongTarget };
    }
    result = await removeGuestbookEntry(supabase, report.target_id);
  } else {
    if (report.target_type !== "gesture") {
      return { error: errors.wrongTarget };
    }
    result = await setGestureHidden(supabase, report.target_id, true);
  }
  if (!result.ok) {
    return { error: result.reason === "not_found" ? t.notFound : t.failed };
  }

  if (!(await closeReport(supabase, reportId, "actioned", viewer.id))) {
    // Sadržaj je promijenjen, a prijava nije zatvorena: admin je vidi i može je odbaciti.
    refresh();
    return { error: t.failed };
  }
  refresh();
  return { error: null, done: true };
}

/** Spomen prijave: onaj upisan uz prijavu, inače onaj kojem prijavljeni sadržaj pripada. */
async function reportedMemorialId(
  supabase: SessionClient,
  report: { target_type: string; target_id: string; memorial_id: string | null },
): Promise<string | null> {
  if (report.memorial_id) {
    return report.memorial_id;
  }
  if (report.target_type === "memorial") {
    return report.target_id;
  }
  if (report.target_type === "guestbook_entry") {
    const { data } = await supabase
      .from("guestbook_entries")
      .select("memorial_id")
      .eq("id", report.target_id)
      .maybeSingle();
    return data?.memorial_id ?? null;
  }
  if (report.target_type === "gesture") {
    const { data } = await supabase.from("gestures").select("memorial_id").eq("id", report.target_id).maybeSingle();
    return data?.memorial_id ?? null;
  }
  if (report.target_type === "photo") {
    const { data } = await supabase
      .from("memorial_photos")
      .select("memorial_id")
      .eq("id", report.target_id)
      .maybeSingle();
    return data?.memorial_id ?? null;
  }
  return null;
}

/** Skrivanje ili vraćanje spomena bez prijave (popis skrivenih, pretraga po adresi). */
export async function setMemorialHiddenAction(
  memorialId: string,
  hidden: boolean,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/moderacija");
  if (!isUuid(memorialId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const hide = hidden === true;
  const result = await setMemorialHidden(supabase, memorialId, hide);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return { error: hide ? errors.notHidable : errors.notHidden };
    }
    return { error: t.failed };
  }
  return { error: null, done: true };
}
