"use client";

import { useActionState, useState } from "react";
import { publishFreeAction } from "@/app/izradi/actions";
import { startMemorialCheckoutAction } from "@/app/izradi/checkout-actions";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatEuro } from "@/lib/format";
import { wizard } from "@/messages/hr/wizard";

const text = wizard.review;

export type PackagePrices = { memorial: number; memorialPortrait: number };

/**
 * Zadnji korak: potvrda e-maila ako je potrebna, zatim izbor između besplatne objave i
 * plaćenog paketa. Plaćanje dolazi tek ovdje, nakon pregleda, i bez ikakvog požurivanja.
 */
export function PublishPanel({
  memorialId,
  canPublish,
  prices,
  checkoutReady,
  allowFree = true,
}: {
  memorialId: string;
  canPublish: boolean;
  prices: PackagePrices | null;
  checkoutReady: boolean;
  /** Nadogradnja već objavljenog besplatnog spomena ne nudi ponovnu besplatnu objavu. */
  allowFree?: boolean;
}) {
  const path = `/izradi/${memorialId}/pregled`;
  const [product, setProduct] = useState<"memorial" | "memorial_portrait">("memorial");
  const [freeState, freeAction, publishing] = useActionState(publishFreeAction.bind(null, memorialId), { error: null });
  const [paidState, paidAction, redirecting] = useActionState(
    startMemorialCheckoutAction.bind(null, memorialId, path),
    { error: null },
  );

  if (!canPublish) {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold">{text.email.title}</h2>
          <p className="text-plum-soft">{text.email.body}</p>
        </div>
        <EmailCodeForm next={path} sendLabel={text.email.send} />
      </Card>
    );
  }

  const options = [
    { key: "memorial" as const, name: text.paid.memorial, body: text.paid.memorialBody, price: prices?.memorial },
    {
      key: "memorial_portrait" as const,
      name: text.paid.portrait,
      body: text.paid.portraitBody,
      price: prices?.memorialPortrait,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[28px] font-extrabold">{text.choose}</h2>

      {allowFree ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-extrabold">{text.free.name}</h3>
            <p className="text-plum-soft">{text.free.body}</p>
          </div>
          <form action={freeAction} className="flex flex-col gap-3">
            {freeState.error ? (
              <p className="text-sm font-medium text-danger" role="alert">
                {freeState.error}
              </p>
            ) : null}
            <Button type="submit" disabled={publishing}>
              {publishing ? text.free.publishing : text.free.action}
            </Button>
          </form>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <form action={paidAction} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">{text.choose}</legend>
            {options.map((option) => (
              <label
                key={option.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4",
                  product === option.key ? "border-teal bg-mint" : "border-line bg-white",
                )}
              >
                <input
                  type="radio"
                  name="product"
                  value={option.key}
                  checked={product === option.key}
                  onChange={() => setProduct(option.key)}
                  className="mt-1 size-5 accent-teal"
                />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl font-extrabold">{option.name}</span>
                    {option.price !== undefined ? (
                      <span className="shrink-0 font-bold">{formatEuro(option.price)}</span>
                    ) : null}
                  </span>
                  <span className="text-[15px] text-plum-soft">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-plum-soft">{text.paid.oneOff}</p>

          {checkoutReady ? (
            <>
              <Field label={text.paid.visibility} htmlFor="visibility">
                <Select id="visibility" name="visibility" defaultValue="public">
                  <option value="public">{text.paid.visibilityOptions.public}</option>
                  <option value="unlisted">{text.paid.visibilityOptions.unlisted}</option>
                  <option value="private">{text.paid.visibilityOptions.private}</option>
                </Select>
              </Field>
              <Field label={text.paid.promo} htmlFor="promo" optional>
                <Input id="promo" name="promo" maxLength={40} autoComplete="off" autoCapitalize="characters" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 text-[15px]">
                <input type="checkbox" name="waiver" required className="mt-0.5 size-6 shrink-0 accent-teal" />
                <span>{text.paid.waiver}</span>
              </label>
              {paidState.error ? (
                <p className="text-sm font-medium text-danger" role="alert">
                  {paidState.error}
                </p>
              ) : null}
              <Button type="submit" variant="secondary" disabled={redirecting}>
                {redirecting ? text.paid.redirecting : text.paid.action}
              </Button>
            </>
          ) : (
            <p className="rounded-2xl bg-butter px-4 py-3 text-[15px] font-medium">{text.paid.notConfigured}</p>
          )}
        </form>
      </Card>
    </div>
  );
}
