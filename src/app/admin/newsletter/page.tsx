import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, DataTable, EmptyState, LoadingBlock, PageHeader, Section, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { loadNewsletter, type NewsletterRow } from "@/server/admin/newsletter";

export const metadata: Metadata = { title: "Newsletter" };

const STATUS: Record<NewsletterRow["status"], { label: string; tone: "good" | "warn" | "neutral" }> = {
  confirmed: { label: "potvrđeno", tone: "good" },
  pending: { label: "čeka potvrdu", tone: "warn" },
  unsubscribed: { label: "odjavljen", tone: "neutral" },
};

async function Subscribers() {
  const rows = await loadNewsletter();
  const count = (status: NewsletterRow["status"]) => rows.filter((row) => row.status === status).length;
  const bySource = new Map<string, number>();
  for (const row of rows) {
    const key = row.source?.startsWith("clanak:") ? "članci" : (row.source ?? "nepoznato");
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  return (
    <>
      <Section title="Ukupno">
        <p className="text-[15px]">
          Potvrđeno: <strong>{count("confirmed")}</strong> · čeka potvrdu: <strong>{count("pending")}</strong> · odjavljeno:{" "}
          <strong>{count("unsubscribed")}</strong>
        </p>
        <p className="text-[15px] text-plum-soft">
          Po mjestu prijave: {[...bySource.entries()].map(([key, value]) => `${key} ${value}`).join(" · ") || "još nema"}
        </p>
        <a href="/admin/newsletter/potvrdeni.csv" className="inline-flex min-h-11 items-center font-bold text-teal underline">
          Preuzmi potvrđene adrese (CSV)
        </a>
      </Section>
      <Section title="Prijave">
        {rows.length === 0 ? (
          <EmptyState>Još nema prijava.</EmptyState>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>E-mail</Th>
                <Th>Stanje</Th>
                <Th>Mjesto</Th>
                <Th>Prijava</Th>
                <Th>Potvrda</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((row) => (
                <tr key={row.email}>
                  <Td>{row.email}</Td>
                  <Td>
                    <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                  </Td>
                  <Td>{row.source ?? "–"}</Td>
                  <Td>{formatDateTime(row.consentedAt)}</Td>
                  <Td>{row.confirmedAt ? formatDateTime(row.confirmedAt) : "–"}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>
    </>
  );
}

export default function AdminNewsletterPage() {
  return (
    <>
      <PageHeader
        title="Newsletter"
        intro="Prijave s privolom. Adresa smije primati newsletter tek kad je potvrđena gumbom iz e-maila."
      />
      <Suspense fallback={<LoadingBlock className="h-40" />}>
        <Subscribers />
      </Suspense>
    </>
  );
}
