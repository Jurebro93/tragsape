import type { Metadata } from "next";
import { Suspense } from "react";
import { saveProductsAction, saveRepeatDiscountAction } from "@/app/admin/postavke/actions";
import { ActionForm } from "@/components/admin/action-form";
import {
  DataTable,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { centsToEuroInput } from "@/server/admin/forms";
import { STRIPE_ERROR_LIMIT, loadSettings } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.settings;

export const metadata: Metadata = { title: t.title };

async function SettingsData() {
  await requireAdmin("/admin/postavke");
  const { products, repeatDiscountPct, stripeErrors } = await loadSettings();

  return (
    <div className="flex flex-col gap-5">
      <Section title={t.products.title} id="cijene" description={t.products.hint}>
        {products.length === 0 ? (
          <EmptyState>{t.products.empty}</EmptyState>
        ) : (
          <ActionForm action={saveProductsAction} submitLabel={t.products.save}>
            <DataTable className="min-w-[760px]">
              <thead>
                <tr>
                  <Th>{t.products.columns.product}</Th>
                  <Th>{t.products.columns.price}</Th>
                  <Th>{t.products.columns.base}</Th>
                  <Th>{t.products.columns.offeredOn}</Th>
                  <Th>{t.products.columns.active}</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.key}>
                    <Td className="align-middle!">
                      <input type="hidden" name="product" value={product.key} />
                      <span className="block font-bold">{product.name}</span>
                      <span className="block text-sm text-plum-soft">{product.key}</span>
                    </Td>
                    <Td className="align-middle!">
                      <input
                        name={`price:${product.key}`}
                        required
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={fill(t.products.priceLabel, { name: product.name })}
                        defaultValue={centsToEuroInput(product.unitAmountCents)}
                        className="min-h-11 w-28 rounded-2xl border-2 border-line bg-white px-3 text-right text-[16px] tabular-nums text-plum focus:border-teal focus:outline-none"
                      />
                    </Td>
                    <Td className="align-middle!">
                      <input
                        name={`base:${product.key}`}
                        required
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={fill(t.products.baseLabel, { name: product.name })}
                        defaultValue={centsToEuroInput(product.baseAmountCents)}
                        className="min-h-11 w-28 rounded-2xl border-2 border-line bg-white px-3 text-right text-[16px] tabular-nums text-plum focus:border-teal focus:outline-none"
                      />
                    </Td>
                    <Td className="align-middle!">
                      <input
                        type="date"
                        name={`offered:${product.key}`}
                        aria-label={fill(t.products.offeredOnLabel, { name: product.name })}
                        defaultValue={product.offeredOn ?? ""}
                        className="min-h-11 rounded-2xl border-2 border-line bg-white px-3 text-[16px] text-plum focus:border-teal focus:outline-none"
                      />
                    </Td>
                    <Td className="align-middle!">
                      <label className="flex min-h-11 min-w-11 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name={`active:${product.key}`}
                          defaultChecked={product.active}
                          aria-label={fill(t.products.activeLabel, { name: product.name })}
                          className="size-6 accent-teal"
                        />
                      </label>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </ActionForm>
        )}
      </Section>

      <Section title={t.repeat.title} id="popust">
        <ActionForm action={saveRepeatDiscountAction}>
          <div className="max-w-xs">
            <Field label={t.repeat.label} htmlFor="repeat-discount" hint={t.repeat.hint}>
              <Input
                id="repeat-discount"
                name="repeat_discount_pct"
                required
                inputMode="numeric"
                autoComplete="off"
                defaultValue={String(repeatDiscountPct)}
              />
            </Field>
          </div>
        </ActionForm>
      </Section>

      <Section title={t.stripe.title} id="stripe" description={t.stripe.explanation}>
        {stripeErrors.length === 0 ? (
          <EmptyState>{t.stripe.empty}</EmptyState>
        ) : (
          <>
            <DataTable className="min-w-[760px]">
              <thead>
                <tr>
                  <Th>{t.stripe.columns.event}</Th>
                  <Th>{t.stripe.columns.type}</Th>
                  <Th>{t.stripe.columns.received}</Th>
                  <Th>{t.stripe.columns.error}</Th>
                </tr>
              </thead>
              <tbody>
                {stripeErrors.map((event) => (
                  <tr key={event.eventId}>
                    <Td className="font-mono text-sm [overflow-wrap:anywhere]">{event.eventId}</Td>
                    <Td className="[overflow-wrap:anywhere]">{event.type}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(event.receivedAt)}</Td>
                    <Td className="[overflow-wrap:anywhere]">{event.error}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {stripeErrors.length === STRIPE_ERROR_LIMIT ? (
              <p className="text-sm text-plum-soft">{fill(t.stripe.limit, { count: STRIPE_ERROR_LIMIT })}</p>
            ) : null}
          </>
        )}
      </Section>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <SettingsData />
      </Suspense>
    </>
  );
}
