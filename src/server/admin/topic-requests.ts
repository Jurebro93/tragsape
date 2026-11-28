import "server-only";
import { createSessionClient } from "@/server/supabase/session";

/** Pitanja čitatelja za admin. Čita se kroz RLS (samo admin), bez servisnog ključa. */

export const REQUEST_STATUSES = ["new", "planned", "answered", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type AdminTopicRequest = {
  id: string;
  question: string;
  email: string;
  page: string | null;
  status: RequestStatus;
  articleSlug: string | null;
  notifiedAt: string | null;
  createdAt: string;
};

export async function loadTopicRequests(status: RequestStatus): Promise<AdminTopicRequest[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("topic_requests")
    .select("id, question, email, page, status, article_slug, notified_at, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    throw new Error(`Pitanja čitatelja nisu učitana: ${error.message}`);
  }
  return data.map((row) => ({
    id: row.id,
    question: row.question,
    email: row.email,
    page: row.page,
    status: row.status as RequestStatus,
    articleSlug: row.article_slug,
    notifiedAt: row.notified_at,
    createdAt: row.created_at,
  }));
}
