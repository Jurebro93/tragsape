"use client";

import { useState, type ReactNode } from "react";
import { ActionForm, type AdminAction } from "@/components/admin/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { adminPanel } from "@/messages/hr/admin-panel";

const t = adminPanel.codes.promo;

export type PromoFormValues = {
  code: string;
  kind: "promo" | "partner";
  partnerId: string;
  discountType: "percent" | "fixed";
  /** Postotak kao cijeli broj ili iznos u eurima, kako se upisuje u polje. */
  discountValue: string;
  appliesTo: string[];
  maxRedemptions: string;
  /** Dani u Zagrebu, YYYY-MM-DD ili prazno. */
  validFrom: string;
  validTo: string;
  active: boolean;
};

/**
 * Obrazac koda za popust. Partner se bira samo za partnerski kod, a natpis uz vrijednost
 * prati vrstu popusta; sve se ionako ponovno provjerava na poslužitelju i u bazi.
 */
export function PromoForm({
  action,
  values,
  partners,
  products,
  submitLabel,
  doneLabel,
  resetOnDone,
  footer,
}: {
  action: AdminAction;
  values: PromoFormValues;
  partners: Array<{ id: string; name: string }>;
  products: Array<{ key: string; name: string }>;
  submitLabel: string;
  doneLabel: string;
  resetOnDone?: boolean;
  footer?: ReactNode;
}) {
  const [kind, setKind] = useState(values.kind);
  const [discountType, setDiscountType] = useState(values.discountType);

  return (
    // Kad se obrazac nakon dodavanja isprazni, i ovisna polja se vraćaju na početno stanje.
    <div
      onReset={() => {
        setKind(values.kind);
        setDiscountType(values.discountType);
      }}
    >
      <ActionForm
        action={action}
        submitLabel={submitLabel}
        doneLabel={doneLabel}
        resetOnDone={resetOnDone}
        footer={footer}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.fields.code} htmlFor="promo-code" hint={t.fields.codeHint}>
            <Input
              id="promo-code"
              name="code"
              required
              minLength={3}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              defaultValue={values.code}
              className="uppercase"
            />
          </Field>
          <Field label={t.fields.kind} htmlFor="promo-kind">
            <Select
              id="promo-kind"
              name="kind"
              defaultValue={values.kind}
              onChange={(event) => setKind(event.target.value === "partner" ? "partner" : "promo")}
            >
              <option value="promo">{t.kinds.promo}</option>
              <option value="partner">{t.kinds.partner}</option>
            </Select>
          </Field>
          {kind === "partner" ? (
            <Field
              label={t.fields.partner}
              htmlFor="promo-partner"
              hint={partners.length === 0 ? t.fields.partnerNeeded : undefined}
            >
              <Select id="promo-partner" name="partner_id" required defaultValue={values.partnerId}>
                <option value="">{t.fields.partnerPick}</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label={t.fields.discountType} htmlFor="promo-discount-type">
            <Select
              id="promo-discount-type"
              name="discount_type"
              defaultValue={values.discountType}
              onChange={(event) => setDiscountType(event.target.value === "fixed" ? "fixed" : "percent")}
            >
              <option value="percent">{t.discountTypes.percent}</option>
              <option value="fixed">{t.discountTypes.fixed}</option>
            </Select>
          </Field>
          <Field
            label={t.fields.value}
            htmlFor="promo-value"
            hint={discountType === "percent" ? t.fields.valuePercentHint : t.fields.valueFixedHint}
          >
            <Input
              id="promo-value"
              name="discount_value"
              required
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values.discountValue}
            />
          </Field>
          <Field
            label={t.fields.maxRedemptions}
            htmlFor="promo-max"
            hint={t.fields.maxRedemptionsHint}
            optional
          >
            <Input
              id="promo-max"
              name="max_redemptions"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={values.maxRedemptions}
            />
          </Field>
          <Field label={t.fields.validFrom} htmlFor="promo-from" optional>
            <Input id="promo-from" name="valid_from" type="date" defaultValue={values.validFrom} />
          </Field>
          <Field label={t.fields.validTo} htmlFor="promo-to" optional>
            <Input id="promo-to" name="valid_to" type="date" defaultValue={values.validTo} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-[15px] font-bold">{t.fields.appliesTo}</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {products.map((product) => (
              <label key={product.key} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  name="applies_to"
                  value={product.key}
                  defaultChecked={values.appliesTo.includes(product.key)}
                  className="size-6 shrink-0 accent-teal"
                />
                <span>{product.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={values.active} className="size-6 shrink-0 accent-teal" />
          <span>{t.fields.active}</span>
        </label>
      </ActionForm>
    </div>
  );
}
