import type { Metadata } from "next";
import { Suspense } from "react";
import { setGestureHiddenAction } from "@/app/admin/geste/actions";
import { ActionButton } from "@/components/admin/action-form";
import { GestureStateBadge, gestureKindLabel } from "@/components/admin/gesture-parts";
import { MemorialCell } from "@/components/admin/order-parts";
import {
  DataTable,
  EmptyState,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import {
  DEFAULT_GESTURE_FILTER,
  GESTURE_FILTERS,
  loadGestures,
  parseGestureFilter,
  type GestureFilter,
} from "@/server/admin/gestures";
import { firstParam, pageCount, pageParam, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.gestures;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

function listHref(filter: GestureFilter, page = 1): string {
  const params = new URLSearchParams();
  if (filter !== DEFAULT_GESTURE_FILTER) {
    params.set("filtar", filter);
  }
  if (page > 1) {
    params.set("stranica", String(page));
  }
  const query = params.toString();
  return query ? `/admin/geste?${query}` : "/admin/geste";
}

async function GesturesData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/geste");
  const params = await searchParams;
  const filter = parseGestureFilter(firstParam(params.filtar));
  const page = pageParam(params.stranica);
  const { gestures, total } = await loadGestures(filter, page);

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        items={GESTURE_FILTERS.map((value) => ({
          href: listHref(value),
          label: t.filters[value],
          current: value === filter,
        }))}
      />
      {gestures.length === 0 ? (
        <EmptyState>{filter === "all" && page === 1 ? t.empty : t.emptyFiltered}</EmptyState>
      ) : (
        <>
          <p className="text-[15px] text-plum-soft">{fill(t.count, { count: total })}</p>
          <DataTable className="min-w-[900px]">
            <thead>
              <tr>
                <Th>{t.columns.memorial}</Th>
                <Th>{t.columns.kind}</Th>
                <Th>{t.columns.name}</Th>
                <Th>{t.columns.message}</Th>
                <Th>{t.columns.expires}</Th>
                <Th>{t.columns.status}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {gestures.map((gesture) => (
                <tr key={gesture.id}>
                  <Td>
                    <MemorialCell memorial={gesture.memorial} missing={common.none} />
                  </Td>
                  <Td className="whitespace-nowrap">{gestureKindLabel(gesture.kind)}</Td>
                  <Td className="[overflow-wrap:anywhere]">{gesture.displayName}</Td>
                  <Td className="max-w-80 [overflow-wrap:anywhere]">
                    {gesture.message ?? <span className="text-plum-soft">{t.noMessage}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(gesture.expiresAt)}</Td>
                  <Td>
                    <GestureStateBadge state={gesture.state} />
                  </Td>
                  <Td>
                    {gesture.state === "hidden" ? (
                      <ActionButton action={setGestureHiddenAction.bind(null, gesture.id, false)} label={t.unhide} />
                    ) : gesture.state === "refunded" ? (
                      common.none
                    ) : (
                      <ActionButton action={setGestureHiddenAction.bind(null, gesture.id, true)} label={t.hide} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
      <Pagination page={page} pages={pageCount(total)} hrefFor={(target) => listHref(filter, target)} />
    </div>
  );
}

export default function AdminGesturesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <GesturesData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
