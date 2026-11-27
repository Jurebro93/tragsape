import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, DataTable, EmptyState, LoadingBlock, PageHeader, Section, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { adminMeadow as t } from "@/messages/hr/meadow";
import { loadMeadowFlowers, loadPendingDedications } from "@/server/admin/meadow";
import { setDedicationStatusAction, setFlowerStatusAction } from "./actions";

export const metadata: Metadata = { title: t.title };

async function Flowers({ searchParams }: Pick<PageProps<"/admin/livada">, "searchParams">) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = raw?.trim().slice(0, 40) || null;
  const rows = await loadMeadowFlowers(query);
  return (
    <Section title={t.listTitle}>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t.search}
          <input
            name="q"
            defaultValue={query ?? ""}
            className="min-h-11 rounded-xl border border-line bg-white px-3 text-[15px]"
          />
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-plum px-4 font-bold text-white">
          {t.searchButton}
        </button>
      </form>
      {rows.length === 0 ? (
        <EmptyState>{t.empty}</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t.columns.number}</Th>
              <Th>{t.columns.name}</Th>
              <Th>{t.columns.source}</Th>
              <Th>{t.columns.created}</Th>
              <Th>{t.columns.status}</Th>
              <Th>{t.columns.action}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.number ?? "–"}</Td>
                <Td>{row.name}</Td>
                <Td>{row.memorialSlug ? t.fromMemorial : t.fromVisitor}</Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
                <Td>
                  <Badge tone={row.status === "visible" ? "good" : row.status === "pending" ? "neutral" : "warn"}>
                    {row.status === "visible" ? t.visible : row.status === "pending" ? t.pending : t.hidden}
                  </Badge>
                </Td>
                <Td>
                  {row.memorialSlug || row.status === "pending" ? (
                    <span className="text-sm text-plum-soft">{row.memorialSlug ? t.memorialNote : "–"}</span>
                  ) : (
                    <form action={setFlowerStatusAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value={row.status === "visible" ? "hidden" : "visible"} />
                      <button type="submit" className="min-h-11 font-bold text-teal underline">
                        {row.status === "visible" ? t.hide : t.show}
                      </button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Section>
  );
}

async function Dedications() {
  const rows = await loadPendingDedications();
  return (
    <Section title={t.dedicationsTitle} description={t.dedicationsIntro}>
      {rows.length === 0 ? (
        <EmptyState>{t.dedicationsEmpty}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
              <span className="text-sm text-plum-soft">
                {row.name} · {row.number ?? "–"} · {formatDateTime(row.createdAt)}
              </span>
              <span className="text-[17px] font-semibold">„{row.dedication}”</span>
              <div className="flex gap-3">
                {(["approved", "rejected"] as const).map((status) => (
                  <form key={status} action={setDedicationStatusAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="number" value={row.number ?? ""} />
                    <input type="hidden" name="status" value={status} />
                    <button
                      type="submit"
                      className={`min-h-11 rounded-full px-4 font-bold ${status === "approved" ? "bg-teal text-white" : "border-2 border-plum text-plum"}`}
                    >
                      {status === "approved" ? t.approve : t.reject}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default function AdminMeadowPage(props: PageProps<"/admin/livada">) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock className="h-40" />}>
        <Dedications />
      </Suspense>
      <Suspense fallback={<LoadingBlock className="h-40" />}>
        <Flowers searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
