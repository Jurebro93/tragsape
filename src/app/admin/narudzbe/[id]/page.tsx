import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GestureStateBadge, gestureKindLabel } from "@/components/admin/gesture-parts";
import { MemorialCell, OrderStatusBadge, lineLabel } from "@/components/admin/order-parts";
import {
  Badge,
  DataTable,
  DefinitionList,
  EmptyState,
  LoadingBlock,
  Note,
  NumTd,
  NumTh,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { formatDateTime, formatEuro } from "@/lib/format";
import { adminPanel } from "@/messages/hr/admin-panel";
import { loadOrderDetail } from "@/server/admin/orders";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.orders.detail;
const orders = adminPanel.orders;
const common = adminPanel.common;
const gestureText = adminPanel.gestures;
const commissionText = adminPanel.codes.commissions;

export const metadata: Metadata = { title: t.title };

function label<T extends Record<string, string>>(labels: T, key: string | null): string {
  if (key === null) {
    return common.none;
  }
  return key in labels ? labels[key as keyof T] : key;
}

function dateOr(value: string | null, fallback: string = common.none): string {
  return value ? formatDateTime(value) : fallback;
}

async function OrderData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/narudzbe/${id}`);
  const detail = await loadOrderDetail(id);
  if (!detail) {
    notFound();
  }
  const { order, lines, entitlements, gifts, gestures, donations, commission, productNames } = detail;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <Note>{t.refundNote}</Note>

      <Section title={t.sections.order}>
        <DefinitionList
          items={[
            { label: t.fields.id, value: order.id },
            { label: t.fields.status, value: label(orders.status, order.status) },
            { label: t.fields.created, value: formatDateTime(order.createdAt) },
            { label: t.fields.paid, value: dateOr(order.paidAt) },
            { label: t.fields.refunded, value: dateOr(order.refundedAt) },
            { label: t.fields.email, value: order.email ?? orders.noEmail },
            { label: t.fields.account, value: order.userId ?? t.fields.noAccount },
            { label: t.fields.subtotal, value: formatEuro(order.subtotalCents) },
            { label: t.fields.discount, value: formatEuro(order.discountCents) },
            { label: t.fields.total, value: formatEuro(order.totalCents) },
            { label: t.fields.promo, value: order.promoCode ?? common.none },
            { label: t.fields.waiver, value: dateOr(order.withdrawalWaiverAt, t.fields.waiverMissing) },
          ]}
        />
      </Section>

      <Section title={t.sections.lines}>
        {lines.length === 0 ? (
          <EmptyState>{orders.noLines}</EmptyState>
        ) : (
          <DataTable className="min-w-[820px]">
            <thead>
              <tr>
                <Th>{t.lines.kind}</Th>
                <Th>{t.lines.product}</Th>
                <NumTh>{t.lines.unit}</NumTh>
                <NumTh>{t.lines.discount}</NumTh>
                <NumTh>{t.lines.total}</NumTh>
                <Th>{t.lines.reason}</Th>
                <Th>{t.lines.memorial}</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <Td>{label(orders.lineKinds, line.kind)}</Td>
                  <Td>{lineLabel(line, productNames)}</Td>
                  <NumTd>{formatEuro(line.unitAmountCents)}</NumTd>
                  <NumTd>{line.discountCents > 0 ? formatEuro(line.discountCents) : common.none}</NumTd>
                  <NumTd>{formatEuro(line.totalCents)}</NumTd>
                  <Td>{label(t.discountReasons, line.discountReason)}</Td>
                  <Td>
                    <MemorialCell
                      memorial={line.memorial}
                      missing={line.memorialId ? t.lines.memorialGone : t.lines.noMemorial}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title={t.sections.entitlements}>
        {entitlements.length === 0 ? (
          <EmptyState>{t.entitlements.empty}</EmptyState>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t.entitlements.tier}</Th>
                <Th>{t.entitlements.status}</Th>
                <Th>{t.entitlements.applied}</Th>
                <Th>{t.entitlements.memorial}</Th>
              </tr>
            </thead>
            <tbody>
              {entitlements.map((entitlement) => (
                <tr key={entitlement.id}>
                  <Td>{label(common.tier, entitlement.tier)}</Td>
                  <Td>
                    <Badge
                      tone={
                        entitlement.status === "applied" ? "good" : entitlement.status === "revoked" ? "bad" : "warn"
                      }
                    >
                      {label(t.entitlements.statuses, entitlement.status)}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{dateOr(entitlement.appliedAt, t.entitlements.notApplied)}</Td>
                  <Td>
                    <MemorialCell memorial={entitlement.memorial} missing={t.entitlements.notApplied} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title={t.sections.gifts}>
        {gifts.length === 0 ? (
          <EmptyState>{t.gifts.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[820px]">
            <thead>
              <tr>
                <Th>{t.gifts.code}</Th>
                <Th>{t.gifts.buyer}</Th>
                <Th>{t.gifts.recipient}</Th>
                <Th>{t.gifts.recipientEmail}</Th>
                <Th>{t.gifts.sendAt}</Th>
                <Th>{t.gifts.sent}</Th>
                <Th>{t.gifts.redeemed}</Th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id}>
                  <Td className="whitespace-nowrap font-mono">{gift.codePreview}</Td>
                  <Td>{gift.buyerName ?? common.none}</Td>
                  <Td>{gift.recipientName ?? common.none}</Td>
                  <Td className="[overflow-wrap:anywhere]">{gift.recipientEmail}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(gift.sendAt)}</Td>
                  <Td className="whitespace-nowrap">{dateOr(gift.sentAt, t.gifts.notSent)}</Td>
                  <Td className="whitespace-nowrap">{dateOr(gift.redeemedAt, t.gifts.notRedeemed)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title={t.sections.gestures}>
        {gestures.length === 0 ? (
          <EmptyState>{t.gestures.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[820px]">
            <thead>
              <tr>
                <Th>{gestureText.columns.memorial}</Th>
                <Th>{gestureText.columns.kind}</Th>
                <Th>{gestureText.columns.name}</Th>
                <Th>{gestureText.columns.message}</Th>
                <Th>{gestureText.columns.expires}</Th>
                <Th>{gestureText.columns.status}</Th>
              </tr>
            </thead>
            <tbody>
              {gestures.map((gesture) => (
                <tr key={gesture.id}>
                  <Td>
                    <MemorialCell memorial={gesture.memorial} missing={t.lines.memorialGone} />
                  </Td>
                  <Td>{gestureKindLabel(gesture.kind)}</Td>
                  <Td className="[overflow-wrap:anywhere]">{gesture.displayName}</Td>
                  <Td className="[overflow-wrap:anywhere]">
                    {gesture.message ?? <span className="text-plum-soft">{gestureText.noMessage}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(gesture.expiresAt)}</Td>
                  <Td>
                    <GestureStateBadge state={gesture.state} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title={t.sections.donation}>
        {donations.length === 0 ? (
          <EmptyState>{t.donation.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[480px]">
            <thead>
              <tr>
                <Th>{t.donation.amount}</Th>
                <Th>{t.donation.shelter}</Th>
                <Th>{t.donation.status}</Th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation) => (
                <tr key={donation.id}>
                  <Td className="whitespace-nowrap tabular-nums">{formatEuro(donation.amountCents)}</Td>
                  <Td>{donation.shelterName ?? <span className="text-plum-soft">{t.donation.noShelter}</span>}</Td>
                  <Td>
                    <Badge tone={donation.status === "accrued" ? "good" : "bad"}>
                      {label(t.donation.statuses, donation.status)}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title={t.sections.commission}>
        {commission ? (
          <DefinitionList
            items={[
              { label: t.commission.partner, value: commission.partnerName ?? common.none },
              { label: commissionText.columns.status, value: label(commissionText.status, commission.status) },
              { label: commissionText.columns.base, value: formatEuro(commission.baseCents) },
              { label: commissionText.columns.commission, value: formatEuro(commission.commissionCents) },
              { label: commissionText.columns.paidAt, value: dateOr(commission.paidAt) },
              { label: commissionText.columns.note, value: commission.payoutNote ?? common.none },
            ]}
          />
        ) : (
          <EmptyState>{t.commission.empty}</EmptyState>
        )}
      </Section>

      <Section title={t.sections.attribution}>
        {order.attribution === null ? (
          <EmptyState>{t.attribution.empty}</EmptyState>
        ) : (
          <pre className="overflow-x-auto rounded-2xl bg-vanilla p-4 text-sm">
            {JSON.stringify(order.attribution, null, 2)}
          </pre>
        )}
      </Section>

      <Section title={t.sections.stripe}>
        <DefinitionList
          items={[
            { label: t.fields.checkoutSession, value: order.stripeCheckoutSessionId ?? common.none },
            { label: t.fields.paymentIntent, value: order.stripePaymentIntentId ?? common.none },
          ]}
        />
      </Section>
    </div>
  );
}

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/narudzbe" className="min-h-11 content-center self-start text-[15px] font-semibold">
        ← {t.back}
      </Link>
      <Suspense fallback={<LoadingBlock className="min-h-96" />}>
        <OrderData params={params} />
      </Suspense>
    </>
  );
}
