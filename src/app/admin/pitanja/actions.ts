"use server";

import { refresh } from "next/cache";
import { requests } from "@/messages/hr/requests";
import { isUuid, type AdminActionState } from "@/server/admin/forms";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";
import { sendAnswerEmail } from "@/server/topic-requests";

const t = requests.admin;

/** Planiraj ili odbij pitanje. Odgovoreno pitanje se ne vraća u druga stanja. */
export async function setRequestStatusAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/pitanja");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "rejected" ? "rejected" : "planned";
  if (!isUuid(id)) return;
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("topic_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "answered");
  if (error) throw new Error(`${t.errors.failed} ${error.message}`);
  refresh();
}

/**
 * Pitanje je odgovoreno objavljenim člankom: sprema se adresa članka i čitatelju se šalje jedan e-mail.
 * Ponovljeni klik ne šalje drugi e-mail (notified_at).
 */
export async function answerRequestAction(id: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin("/admin/pitanja");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!isUuid(id) || !/^[a-z0-9-]{3,200}$/.test(slug)) return { error: t.errors.slug };
  const supabase = await createSessionClient();
  const { data: article } = await supabase.from("articles").select("title").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!article) return { error: t.errors.slug };
  const { data: rows, error } = await supabase
    .from("topic_requests")
    .update({ status: "answered", article_slug: slug, notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("email");
  if (error) return { error: t.errors.failed };
  const email = rows?.[0]?.email;
  if (email) await sendAnswerEmail(email, article.title, slug);
  refresh();
  return { error: null, done: true };
}
