"use client";

import { useActionState, useState } from "react";
import { keepValues } from "@/lib/keep-values";
import { startGiftCheckoutAction } from "@/app/poklon/actions";
import { Button } from "@/components/ui/button";
import { AttributionFields } from "@/components/wizard/attribution-fields";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { gift } from "@/messages/hr/gift";

const text = gift.form;

/** Obrazac za kupnju poklona. Prikazuje se tek prijavljenom kupcu. */
export function GiftForm({
  prices,
  today,
}: {
  prices: {
    memorial: number;
    memorialPortrait: number | null;
    base?: { memorial: number; memorialPortrait: number | null };
  } | null;
  today: string;
}) {
  const [state, action, pending] = useActionState(startGiftCheckoutAction, { error: null });
  const [product, setProduct] = useState<"memorial" | "memorial_portrait">("memorial");
  const [later, setLater] = useState(false);
  const options: Array<{ key: "memorial" | "memorial_portrait"; name: string; body: string; price?: number; base?: number }> = [
    { key: "memorial", name: text.memorial, body: text.memorialBody, price: prices?.memorial, base: prices?.base?.memorial },
  ];
  // Portret se nudi samo dok je uključen u cjeniku.
  if (prices && prices.memorialPortrait !== null) {
    options.push({
      key: "memorial_portrait",
      name: text.portrait,
      body: text.portraitBody,
      price: prices.memorialPortrait,
      base: prices.base?.memorialPortrait ?? undefined,
    });
  }
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-5">
      <AttributionFields />
      <Card className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-[15px] font-bold">{text.package}</legend>
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
        <p className="text-sm text-plum-soft">{text.oneOff}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label={text.recipientEmail} htmlFor="recipient_email">
          <Input id="recipient_email" name="recipient_email" type="email" inputMode="email" required maxLength={254} />
        </Field>
        <Field label={text.recipientName} htmlFor="recipient_name" optional>
          <Input id="recipient_name" name="recipient_name" maxLength={80} autoComplete="off" />
        </Field>
        <Field label={text.buyerName} htmlFor="buyer_name" hint={text.buyerNameHint}>
          <Input id="buyer_name" name="buyer_name" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={text.message} htmlFor="message" optional>
          <Textarea id="message" name="message" maxLength={1000} placeholder={text.messagePlaceholder} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-bold">{text.sendOn}</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="send"
              value="now"
              checked={!later}
              onChange={() => setLater(false)}
              className="size-5 accent-teal"
            />
            <span>{text.sendNow}</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="send"
              value="later"
              checked={later}
              onChange={() => setLater(true)}
              className="size-5 accent-teal"
            />
            <span>{text.sendLater}</span>
          </label>
        </fieldset>
        {later ? (
          <Field label={text.sendDate} htmlFor="send_date">
            <Input id="send_date" name="send_date" type="date" min={today} defaultValue={today} required />
          </Field>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label={text.promo} htmlFor="promo" optional>
          <Input id="promo" name="promo" maxLength={40} autoComplete="off" autoCapitalize="characters" />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input type="checkbox" name="waiver" required className="mt-0.5 size-6 shrink-0 accent-teal" />
          <span>{text.waiver}</span>
        </label>
        {state.error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? text.submitting : text.submit}
        </Button>
      </Card>
    </form>
  );
}
