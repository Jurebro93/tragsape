import { requireAdmin } from "@/server/auth";
import { loadNewsletter } from "@/server/admin/newsletter";

/** Potvrđene adrese za slanje newslettera. Samo admin; čita se kroz RLS. */
export async function GET() {
  await requireAdmin("/admin/newsletter");
  const rows = (await loadNewsletter()).filter((row) => row.status === "confirmed");
  const escape = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const body = ["email,izvor,potvrdeno", ...rows.map((row) => [row.email, row.source, row.confirmedAt].map(escape).join(","))].join("\n");
  return new Response(`﻿${body}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="newsletter-potvrdeni.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
