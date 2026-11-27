import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { fetchAllRows } from "./queries";

/** Prijave na newsletter za admin. Čita se kroz RLS (samo admin), bez servisnog ključa. */

export type NewsletterRow = {
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string | null;
  consentedAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
};

export async function loadNewsletter(): Promise<NewsletterRow[]> {
  const supabase = await createSessionClient();
  const rows = await fetchAllRows(
    (from, to) =>
      supabase
        .from("newsletter_subscribers")
        .select("email, status, source, consented_at, confirmed_at, unsubscribed_at")
        .order("created_at", { ascending: false })
        .range(from, to),
    "prijave na newsletter",
  );
  return rows.map((row) => ({
    email: row.email,
    status: row.status as NewsletterRow["status"],
    source: row.source,
    consentedAt: row.consented_at,
    confirmedAt: row.confirmed_at,
    unsubscribedAt: row.unsubscribed_at,
  }));
}
