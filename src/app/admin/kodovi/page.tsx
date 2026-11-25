import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { markCommissionPaidAction, savePartnerAction, savePromoCodeAction } from "@/app/admin/kodovi/actions";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { PromoForm, type PromoFormValues } from "@/components/admin/promo-form";
import {
  Badge,
  DataTable,
  EmptyState,
  LoadingBlock,
  NumTd,
  NumTh,
  PageHeader,
  RowLink,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatDateTime, formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { loadCodes, type Partner, type PromoCode } from "@/server/admin/codes";
import { centsToEuroInput, isoToZagrebDay } from "@/server/admin/forms";
import { firstParam, type SearchParams } from "@/server/admin/queries";
import { PRODUCT_KEYS } from "@/server/admin/schemas";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.codes;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

const cancelLink = "inline-flex min-h-11 items-center font-bold underline underline-offset-4";
const checkboxLabel = "flex min-h-11 cursor-pointer items-center gap-3 text-[15px]";
const checkbox = "size-6 shrink-0 accent-teal";

function label<T extends Record<string, string>>(labels: T, key: string): string {
  return key in labels ? labels[key as keyof T] : key;
}

/** Popust ili provizija za prikaz: postotak ili iznos u eurima. */
function amountLabel(type: string, value: number): string {
  return type === "percent" ? `${value} %` : formatEuro(value);
}

function validityLabel(code: PromoCode): string {
  const text = t.promo;
  if (code.validFrom && code.validTo) {
    return fill(text.validRange, { from: formatDateTime(code.validFrom), to: formatDateTime(code.validTo) });
  }
  if (code.validFrom) {
    return fill(text.validFromOnly, { from: formatDateTime(code.validFrom) });
  }
  if (code.validTo) {
    return fill(text.validToOnly, { to: formatDateTime(code.validTo) });
  }
  return text.validAlways;
}

function promoFormValues(code: PromoCode | null): PromoFormValues {
  if (!code) {
    return {
      code: "",
      kind: "promo",
      partnerId: "",
      discountType: "percent",
      discountValue: "",
      appliesTo: ["memorial", "memorial_portrait"],
      maxRedemptions: "",
      validFrom: "",
      validTo: "",
      active: true,
    };
  }
  const fixed = code.discountType === "fixed";
  return {
    code: code.code,
    kind: code.kind === "partner" ? "partner" : "promo",
    partnerId: code.partnerId ?? "",
    discountType: fixed ? "fixed" : "percent",
    discountValue: fixed ? centsToEuroInput(code.discountValue) : String(code.discountValue),
    appliesTo: code.appliesTo,
    maxRedemptions: code.maxRedemptions === null ? "" : String(code.maxRedemptions),
    validFrom: isoToZagrebDay(code.validFrom),
    validTo: isoToZagrebDay(code.validTo),
    active: code.active,
  };
}

function PartnerFields({ partner }: { partner: Partner | null }) {
  const text = t.partners.fields;
  const fixed = partner?.commissionType === "fixed";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.name} htmlFor="partner-name">
          <Input id="partner-name" name="name" required maxLength={160} defaultValue={partner?.name ?? ""} />
        </Field>
        <Field label={text.type} htmlFor="partner-type">
          <Select id="partner-type" name="type" defaultValue={partner?.type ?? "vet"}>
            <option value="vet">{t.partners.types.vet}</option>
            <option value="crematorium">{t.partners.types.crematorium}</option>
            <option value="other">{t.partners.types.other}</option>
          </Select>
        </Field>
        <Field label={text.contact} htmlFor="partner-contact" optional>
          <Input id="partner-contact" name="contact" maxLength={300} defaultValue={partner?.contact ?? ""} />
        </Field>
        <Field label={text.commissionType} htmlFor="partner-commission-type">
          <Select
            id="partner-commission-type"
            name="commission_type"
            defaultValue={partner?.commissionType ?? "percent"}
          >
            <option value="percent">{t.partners.commissionTypes.percent}</option>
            <option value="fixed">{t.partners.commissionTypes.fixed}</option>
          </Select>
        </Field>
        <Field
          label={text.commissionValue}
          htmlFor="partner-commission-value"
          hint={`${text.commissionPercentHint} ${text.commissionFixedHint}`}
        >
          <Input
            id="partner-commission-value"
            name="commission_value"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={
              partner ? (fixed ? centsToEuroInput(partner.commissionValue) : String(partner.commissionValue)) : ""
            }
          />
        </Field>
      </div>
      <Field label={text.notes} htmlFor="partner-notes" optional>
        <Textarea id="partner-notes" name="notes" maxLength={2000} defaultValue={partner?.notes ?? ""} />
      </Field>
      <label className={checkboxLabel}>
        <input type="checkbox" name="active" defaultChecked={partner?.active ?? true} className={checkbox} />
        <span>{text.active}</span>
      </label>
    </>
  );
}

async function CodesData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/kodovi");
  const params = await searchParams;
  const { promoCodes, partners, commissions, products } = await loadCodes();
  const editingPromo = promoCodes.find((code) => code.id === firstParam(params.kod)) ?? null;
  const editingPartner = partners.find((partner) => partner.id === firstParam(params.partner)) ?? null;

  const productNames = new Map(products.map((product) => [product.key, product.name]));
  const productName = (key: string) => productNames.get(key) ?? key;
  const partnerName = (id: string | null) => partners.find((partner) => partner.id === id)?.name ?? null;
  // Kućice idu po poznatim proizvodima, da uređivanje koda ne izgubi proizvod koji je isključen iz prodaje.
  const productOptions = PRODUCT_KEYS.map((key) => ({ key, name: productName(key) }));
  const partnerOptions = partners.map((partner) => ({ id: partner.id, name: partner.name }));

  return (
    <div className="flex flex-col gap-5">
      <Section title={t.promo.title} id="kodovi">
        {promoCodes.length === 0 ? (
          <EmptyState>{t.promo.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[900px]">
            <thead>
              <tr>
                <Th>{t.promo.columns.code}</Th>
                <Th>{t.promo.columns.kind}</Th>
                <Th>{t.promo.columns.discount}</Th>
                <Th>{t.promo.columns.appliesTo}</Th>
                <Th>{t.promo.columns.redeemed}</Th>
                <Th>{t.promo.columns.validity}</Th>
                <Th>{t.promo.columns.active}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((code) => (
                <tr key={code.id}>
                  <Td className="whitespace-nowrap font-bold">{code.code}</Td>
                  <Td>
                    {label(t.promo.kinds, code.kind)}
                    {code.partnerId ? (
                      <span className="block text-plum-soft">{partnerName(code.partnerId) ?? common.none}</span>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap">{amountLabel(code.discountType, code.discountValue)}</Td>
                  <Td>{code.appliesTo.map(productName).join(", ") || common.none}</Td>
                  <Td className="whitespace-nowrap">
                    {code.maxRedemptions === null
                      ? fill(t.promo.redeemedUnlimited, { used: code.redeemedCount })
                      : fill(t.promo.redeemedOf, { used: code.redeemedCount, max: code.maxRedemptions })}
                  </Td>
                  <Td>{validityLabel(code)}</Td>
                  <Td>
                    <Badge tone={code.active ? "good" : "neutral"}>{code.active ? common.yes : common.no}</Badge>
                  </Td>
                  <Td>
                    <RowLink href={`/admin/kodovi?kod=${code.id}#kod`}>{common.edit}</RowLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        <div id="kod" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border-2 border-line p-4">
          <h3 className="text-xl font-extrabold">
            {editingPromo ? fill(t.promo.editTitle, { code: editingPromo.code }) : t.promo.newTitle}
          </h3>
          <PromoForm
            key={editingPromo?.id ?? "novi"}
            action={savePromoCodeAction.bind(null, editingPromo?.id ?? null)}
            values={promoFormValues(editingPromo)}
            partners={partnerOptions}
            products={productOptions}
            submitLabel={editingPromo ? common.save : common.add}
            doneLabel={editingPromo ? common.saved : common.added}
            resetOnDone={!editingPromo}
            footer={
              editingPromo ? (
                <Link href="/admin/kodovi#kodovi" className={cancelLink}>
                  {common.cancelEdit}
                </Link>
              ) : null
            }
          />
        </div>
      </Section>

      <Section title={t.partners.title} id="partneri" description={t.partners.inactiveNote}>
        {partners.length === 0 ? (
          <EmptyState>{t.partners.empty}</EmptyState>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t.partners.columns.name}</Th>
                <Th>{t.partners.columns.type}</Th>
                <Th>{t.partners.columns.contact}</Th>
                <Th>{t.partners.columns.commission}</Th>
                <Th>{t.partners.columns.active}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <Td className="font-bold [overflow-wrap:anywhere]">{partner.name}</Td>
                  <Td>{label(t.partners.types, partner.type)}</Td>
                  <Td className="[overflow-wrap:anywhere]">{partner.contact ?? common.none}</Td>
                  <Td className="whitespace-nowrap">
                    {amountLabel(partner.commissionType, partner.commissionValue)}
                  </Td>
                  <Td>
                    <Badge tone={partner.active ? "good" : "neutral"}>
                      {partner.active ? common.yes : common.no}
                    </Badge>
                  </Td>
                  <Td>
                    <RowLink href={`/admin/kodovi?partner=${partner.id}#partner`}>{common.edit}</RowLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        <div id="partner" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border-2 border-line p-4">
          <h3 className="text-xl font-extrabold">
            {editingPartner ? fill(t.partners.editTitle, { name: editingPartner.name }) : t.partners.newTitle}
          </h3>
          <ActionForm
            key={editingPartner?.id ?? "novi"}
            action={savePartnerAction.bind(null, editingPartner?.id ?? null)}
            submitLabel={editingPartner ? common.save : common.add}
            doneLabel={editingPartner ? common.saved : common.added}
            resetOnDone={!editingPartner}
            footer={
              editingPartner ? (
                <Link href="/admin/kodovi#partneri" className={cancelLink}>
                  {common.cancelEdit}
                </Link>
              ) : null
            }
          >
            <PartnerFields partner={editingPartner} />
          </ActionForm>
        </div>
      </Section>

      <Section title={t.commissions.title} id="provizije">
        {commissions.length === 0 ? (
          <EmptyState>{t.commissions.empty}</EmptyState>
        ) : (
          commissions.map((group) => (
            <div key={group.partnerId} className="flex flex-col gap-3">
              <h3 className="text-xl font-extrabold [overflow-wrap:anywhere]">{group.partnerName}</h3>
              <dl className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    [t.commissions.totals.accrued, group.totals.accruedCents],
                    [t.commissions.totals.paid, group.totals.paidCents],
                    [t.commissions.totals.void, group.totals.voidCents],
                  ] as const
                ).map(([name, cents]) => (
                  <div key={name} className="rounded-2xl bg-vanilla px-4 py-3">
                    <dt className="text-[15px] text-plum-soft">{name}</dt>
                    <dd className="font-display text-2xl font-extrabold tabular-nums">{formatEuro(cents)}</dd>
                  </div>
                ))}
              </dl>
              <DataTable className="min-w-[860px]">
                <thead>
                  <tr>
                    <Th>{t.commissions.columns.date}</Th>
                    <Th>{t.commissions.columns.order}</Th>
                    <NumTh>{t.commissions.columns.base}</NumTh>
                    <NumTh>{t.commissions.columns.commission}</NumTh>
                    <Th>{t.commissions.columns.status}</Th>
                    <Th>{t.commissions.columns.paidAt}</Th>
                    <Th>{t.commissions.columns.note}</Th>
                    <Th>{common.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {group.commissions.map((commission) => (
                    <tr key={commission.id}>
                      <Td className="whitespace-nowrap">{formatDateTime(commission.createdAt)}</Td>
                      <Td>
                        <RowLink href={`/admin/narudzbe/${commission.orderId}`}>{t.commissions.openOrder}</RowLink>
                      </Td>
                      <NumTd>{formatEuro(commission.baseCents)}</NumTd>
                      <NumTd>{formatEuro(commission.commissionCents)}</NumTd>
                      <Td>
                        <Badge
                          tone={
                            commission.status === "paid" ? "good" : commission.status === "void" ? "neutral" : "warn"
                          }
                        >
                          {label(t.commissions.status, commission.status)}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {commission.paidAt ? formatDateTime(commission.paidAt) : common.none}
                      </Td>
                      <Td className="max-w-64 [overflow-wrap:anywhere]">{commission.payoutNote ?? common.none}</Td>
                      <Td>
                        {commission.status === "accrued" ? (
                          <ActionButton
                            action={markCommissionPaidAction.bind(null, commission.id)}
                            label={t.commissions.markPaid}
                            confirm={t.commissions.confirm}
                          >
                            <input
                              name="note"
                              maxLength={500}
                              aria-label={t.commissions.noteLabel}
                              placeholder={t.commissions.noteLabel}
                              autoComplete="off"
                              className="min-h-11 w-52 rounded-2xl border-2 border-line bg-white px-3 text-[15px] text-plum placeholder:text-plum-soft/70 focus:border-teal focus:outline-none"
                            />
                          </ActionButton>
                        ) : (
                          common.none
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

export default function AdminCodesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <CodesData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
