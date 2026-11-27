import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, DataTable, EmptyState, LoadingBlock, PageHeader, Section, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { adminMeadow as t } from "@/messages/hr/meadow";
import { loadMeadowFlowers } from "@/server/admin/meadow";
import { setFlowerStatusAction } from "./actions";

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
                <Td>{row.number}</Td>
                <Td>{row.name}</Td>
                <Td>{row.memorialSlug ? t.fromMemorial : t.fromVisitor}</Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
                <Td>
                  <Badge tone={row.status === "visible" ? "good" : "warn"}>
                    {row.status === "visible" ? t.visible : t.hidden}
                  </Badge>
                </Td>
                <Td>
                  {row.memorialSlug ? (
                    <span className="text-sm text-plum-soft">{t.memorialNote}</span>
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

export default function AdminMeadowPage(props: PageProps<"/admin/livada">) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock className="h-40" />}>
        <Flowers searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
