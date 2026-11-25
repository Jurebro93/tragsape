import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { checkout } from "@/messages/hr/checkout";
import { getViewer } from "@/server/auth";
import { listMyMemorials } from "@/server/memorials/access";
import { createSessionClient } from "@/server/supabase/session";
import { PendingRefresher } from "./pending-refresher";

export const metadata: Metadata = {
  title: checkout.success.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function StatusCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {children}
    </Card>
  );
}

/** Zahvala koja ne otkriva ništa o narudžbi: za posjetitelja bez sesije ili tuđi broj narudžbe. */
function NeutralThanks() {
  const t = checkout.success.neutral;
  return (
    <StatusCard title={t.title}>
      <p>{t.body}</p>
      <ButtonLink href="/" variant="secondary">
        {t.home}
      </ButtonLink>
    </StatusCard>
  );
}

/**
 * Stanje narudžbe. Ova stranica ništa ne ispunjava: samo čita ono što je webhook zapisao,
 * i to kroz RLS, pa kupac vidi isključivo vlastitu narudžbu.
 */
async function OrderStatus({ searchParams }: { searchParams: SearchParams }) {
  const { n } = await searchParams;
  const orderId = typeof n === "string" && UUID_PATTERN.test(n) ? n : null;
  const viewer = await getViewer();
  if (!viewer || !orderId) {
    return <NeutralThanks />;
  }

  const supabase = await createSessionClient();
  const [{ data: order }, { data: lines }] = await Promise.all([
    supabase.from("orders").select("id, status, total_cents").eq("id", orderId).maybeSingle(),
    supabase.from("order_lines").select("kind, memorial_id").eq("order_id", orderId).order("position"),
  ]);
  if (!order) {
    return <NeutralThanks />;
  }

  const t = checkout.success;

  if (order.status === "pending") {
    return (
      <StatusCard title={t.pending.title}>
        <p role="status">{t.pending.body}</p>
        <PendingRefresher slowText={t.pending.slow} />
      </StatusCard>
    );
  }

  if (order.status === "refunded") {
    return (
      <StatusCard title={t.refunded.title}>
        <p>{t.refunded.body}</p>
      </StatusCard>
    );
  }

  if (order.status !== "paid") {
    return (
      <StatusCard title={t.notPaid.title}>
        <p>{t.notPaid.body}</p>
      </StatusCard>
    );
  }

  const orderLines = lines ?? [];
  const orderedIds = new Set(orderLines.flatMap((line) => (line.memorial_id ? [line.memorial_id] : [])));
  // Poveznice vode samo na kupčeve memorijale; tuđi (geste) dobivaju samo rečenicu.
  const ownMemorials = orderedIds.size > 0 ? (await listMyMemorials()).filter((item) => orderedIds.has(item.id)) : [];
  const hasGift = orderLines.some((line) => line.kind === "gift");
  const hasGesture = orderLines.some((line) => line.kind === "gesture");

  return (
    <StatusCard title={t.paid.title}>
      <p>{t.paid.body}</p>
      {order.total_cents > 0 ? (
        <p className="font-bold">{fill(t.paid.total, { amount: formatEuro(order.total_cents) })}</p>
      ) : null}
      {ownMemorials.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {ownMemorials.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-2xl bg-butter p-4">
              <span className="font-display text-xl font-extrabold [overflow-wrap:anywhere]">
                {item.name || t.paid.unnamedMemorial}
              </span>
              <ButtonLink href={`/moji-ljubimci/${item.id}`}>{t.paid.openMemorial}</ButtonLink>
            </li>
          ))}
        </ul>
      ) : null}
      {hasGift ? <p>{t.paid.giftNote}</p> : null}
      {hasGesture ? <p>{t.paid.gestureNote}</p> : null}
      {viewer.isAnonymous ? (
        <ButtonLink href="/" variant="secondary">
          {t.paid.home}
        </ButtonLink>
      ) : (
        <ButtonLink href="/moji-ljubimci" variant="secondary">
          {t.paid.myPets}
        </ButtonLink>
      )}
    </StatusCard>
  );
}

export default function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageShell>
      <Suspense
        fallback={
          <Card className="flex min-h-40 flex-col gap-4">
            <p role="status" className="text-plum-soft">
              {checkout.success.loading}
            </p>
          </Card>
        }
      >
        <OrderStatus searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
