"use server";

import { adminPanel } from "@/messages/hr/admin-panel";
import { isUuid, type AdminActionState } from "@/server/admin/forms";
import { setGestureHidden } from "@/server/admin/visibility";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const t = adminPanel.common;

/** Sakriva gestu s javne stranice ili je vraća. Novac se time ne vraća. */
export async function setGestureHiddenAction(
  gestureId: string,
  hidden: boolean,
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin("/admin/geste");
  if (!isUuid(gestureId)) {
    return { error: t.notFound };
  }
  const supabase = await createSessionClient();
  const result = await setGestureHidden(supabase, gestureId, hidden === true);
  if (!result.ok) {
    return { error: result.reason === "not_found" ? t.notFound : t.failed };
  }
  return { error: null, done: true };
}
