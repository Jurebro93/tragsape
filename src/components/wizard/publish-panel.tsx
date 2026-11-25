"use client";

import { useActionState, useState } from "react";
import { keepValues } from "@/lib/keep-values";
import { applyEntitlementAndPublishAction, publishFreeAction } from "@/app/izradi/actions";
import { startMemorialCheckoutAction } from "@/app/izradi/checkout-actions";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { account } from "@/messages/hr/account";
import { gift } from "@/messages/hr/gift";
import { wizard } from "@/messages/hr/wizard";

const text = wizard.review;

/** Cijene paketa u centima. `memorialPortrait` je null dok se taj paket ne prodaje. */
export type PackagePrices = {
  memorial: number;
  memorialPortrait: number | null;
  /** Bazne cijene istih paketa; ističu se uz cijenu. */
  base?: { memorial: number; memorialPortrait: number | null };
};

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
  available = null,
}: {
  memorialId: string;
  canPublish: boolean;
  prices: PackagePrices | null;
  checkoutReady: boolean;
  /** Nadogradnja već objavljenog besplatnog spomena ne nudi ponovnu besplatnu objavu. */
  allowFree?: boolean;
  /** Već plaćen ili poklonjen paket koji čeka na računu. */
  available?: { id: string; tier: "memorial" | "portrait" } | null;
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

  if (available) {
    return <AvailablePackage memorialId={memorialId} available={available} />;
  }

  const options: Array<{ key: "memorial" | "memorial_portrait"; name: string; body: string; price: number; base?: number }> = [];
  if (prices) {
    options.push({
      key: "memorial",
      name: text.paid.memorial,
      body: text.paid.memorialBody,
      price: prices.memorial,
      base: prices.base?.memorial,
    });
    if (prices.memorialPortrait !== null) {
      options.push({
        key: "memorial_portrait",
        name: text.paid.portrait,
        body: text.paid.portraitBody,
        price: prices.memorialPortrait,
        base: prices.base?.memorialPortrait ?? undefined,
      });
    }
  }

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
        <form action={paidAction} onSubmit={keepValues(paidAction)} className="flex flex-col gap-4">
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
                    <span className="shrink-0 font-bold">{formatEuro(option.price)}</span>
                  </span>
                  {option.base !== undefined ? (
                    <span className="self-end text-[13px] text-plum-soft">
                      {fill(common.price.base, { amount: formatEuro(option.base) })}
                    </span>
                  ) : null}
                  <span className="text-[15px] text-plum-soft">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-plum-soft">{text.paid.oneOff}</p>

          {checkoutReady && options.length > 0 ? (
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

/** Paket koji već čeka na računu (poklon ili ranije plaćen): primjena bez novog plaćanja. */
function AvailablePackage({
  memorialId,
  available,
}: {
  memorialId: string;
  available: { id: string; tier: "memorial" | "portrait" };
}) {
  const [state, action, pending] = useActionState(
    applyEntitlementAndPublishAction.bind(null, memorialId, available.id),
    { error: null },
  );
  return (
    <Card className="flex flex-col gap-4 bg-mint">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">{gift.available.title}</h2>
        <p>{fill(gift.available.body, { tier: account.tier[available.tier] })}</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        {state.error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? gift.available.applying : gift.available.apply}
        </Button>
      </form>
    </Card>
  );
}
