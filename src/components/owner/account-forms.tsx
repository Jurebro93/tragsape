"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { owner } from "@/messages/hr/owner";
import { ResetWhenHidden } from "./reset-when-hidden";
import { idleState, type FormAction } from "./types";

const t = owner.account.delete;

function DeleteAccountFields({ action }: { action: FormAction }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label={t.confirmLabel} htmlFor={`${id}-email`} error={state.error}>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          required
        />
      </Field>
      <Button type="submit" size="md" disabled={pending} className="bg-danger! hover:bg-danger!">
        {pending ? t.deleting : t.action}
      </Button>
    </form>
  );
}

/** Brisanje računa traži da korisnik upiše svoju e-mail adresu. */
export function DeleteAccountForm(props: { action: FormAction }) {
  return (
    <ResetWhenHidden>
      <DeleteAccountFields {...props} />
    </ResetWhenHidden>
  );
}
