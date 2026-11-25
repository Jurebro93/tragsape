"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { ResetWhenHidden } from "./reset-when-hidden";
import type { FormAction } from "./types";

export type AcceptInviteState = {
  error: string | null;
  code?: "already_used" | "not_found" | "is_owner";
};

const t = owner.invite;

function AcceptFields({ action }: { action: FormAction<AcceptInviteState> }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <p className="rounded-2xl bg-butter px-4 py-3 font-medium" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.code === "is_owner" ? (
        <ButtonLink href="/moji-ljubimci" variant="secondary">
          {common.nav.myPets}
        </ButtonLink>
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? t.accepting : t.accept}
        </Button>
      )}
    </form>
  );
}

/** Gumb koji prihvaća pozivnicu. Namjerno obrazac (POST), a ne poveznica. */
export function AcceptInviteForm(props: { action: FormAction<AcceptInviteState> }) {
  return (
    <ResetWhenHidden>
      <AcceptFields {...props} />
    </ResetWhenHidden>
  );
}
