"use client";

import { useActionState } from "react";
import { applyEntitlementAction, redeemGiftAction } from "@/app/poklon/actions";
import { Button } from "@/components/ui/button";
import { gift } from "@/messages/hr/gift";

const text = gift.redeem;

export function RedeemButton({ code }: { code: string }) {
  const [state, action, pending] = useActionState(redeemGiftAction.bind(null, code), { error: null });
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? text.accepting : text.accept}
      </Button>
    </form>
  );
}

export function ApplyEntitlementButton({
  entitlementId,
  memorialId,
  label,
  pendingLabel,
}: {
  entitlementId: string;
  memorialId: string;
  label?: string;
  pendingLabel?: string;
}) {
  const [state, action, pending] = useActionState(applyEntitlementAction.bind(null, entitlementId, memorialId), {
    error: null,
  });
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? (pendingLabel ?? text.applying) : (label ?? text.applyTo)}
      </Button>
    </form>
  );
}
