import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderStatusBadge, summarizeLines } from "@/components/admin/order-parts";
import {
  DataTable,
  EmptyState,
  FilterTabs,
  LoadingBlock,
  NumTd,
  NumTh,
  PageHeader,
  Pagination,
  RowLink,
  Td,
  Th,
} from "@/components/admin/ui";
import { formatDateTime, formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { ORDER_STATUSES, isOrderStatus, loadOrders, type OrderStatus } from "@/server/admin/orders";
import { firstParam, pageCount, pageParam, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.orders;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

function listHref(status: OrderStatus | null, page = 1): string {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (page > 1) {
    params.set("stranica", String(page));
  }
  const query = params.toString();
  return query ? `/admin/narudzbe?${query}` : "/admin/narudzbe";
}

async function OrdersData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/narudzbe");
  const params = await searchParams;
  const statusParam = firstParam(params.status);
  const status = isOrderStatus(statusParam) ? statusParam : null;
  const page = pageParam(params.stranica);
  const { orders, total, productNames } = await loadOrders(status, page);

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        items={[
          { href: listHref(null), label: t.filters.all, current: status === null },
          ...ORDER_STATUSES.map((value) => ({
            href: listHref(value),
            label: t.filters[value],
            current: status === value,
          })),
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState>{status === null && page === 1 ? t.empty : t.emptyFiltered}</EmptyState>
      ) : (
        <>
          <p className="text-[15px] text-plum-soft">{fill(t.count, { count: total })}</p>
          <DataTable className="min-w-[860px]">
            <thead>
              <tr>
                <Th>{t.columns.date}</Th>
                <Th>{t.columns.email}</Th>
                <Th>{t.columns.status}</Th>
                <NumTh>{t.columns.total}</NumTh>
                <NumTh>{t.columns.discount}</NumTh>
                <Th>{t.columns.promo}</Th>
                <Th>{t.columns.lines}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td className="whitespace-nowrap">
                    <RowLink href={`/admin/narudzbe/${order.id}`}>
                      <span className="sr-only">{t.open}: </span>
                      {formatDateTime(order.createdAt)}
                    </RowLink>
                  </Td>
                  <Td className="[overflow-wrap:anywhere]">
                    {order.email ?? <span className="text-plum-soft">{t.noEmail}</span>}
                  </Td>
                  <Td>
                    <OrderStatusBadge status={order.status} />
                  </Td>
                  <NumTd>{formatEuro(order.totalCents)}</NumTd>
                  <NumTd>{order.discountCents > 0 ? formatEuro(order.discountCents) : common.none}</NumTd>
                  <Td className="whitespace-nowrap">{order.promoCode ?? common.none}</Td>
                  <Td>{summarizeLines(order.lines, productNames) || t.noLines}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
      <Pagination page={page} pages={pageCount(total)} hrefFor={(target) => listHref(status, target)} />
    </div>
  );
}

export default function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <OrdersData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
