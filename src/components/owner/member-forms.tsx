"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { owner } from "@/messages/hr/owner";
import { Feedback } from "./feedback";
import { ResetWhenHidden } from "./reset-when-hidden";
import { idleState, type FormAction } from "./types";

const t = owner.members;

function InviteFields({ action }: { action: FormAction }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label={t.form.email} htmlFor={`${id}-email`} hint={t.form.hint}>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          required
          maxLength={254}
          placeholder={t.form.emailPlaceholder}
        />
      </Field>
      <Feedback state={state} />
      <Button type="submit" size="md" disabled={pending}>
        {pending ? t.form.sending : t.form.submit}
      </Button>
    </form>
  );
}

/** Pozivnica novom suradniku: jedna e-mail adresa. */
export function InviteForm(props: { action: FormAction }) {
  return (
    <ResetWhenHidden>
      <InviteFields {...props} />
    </ResetWhenHidden>
  );
}

function ResendFields({ action, email }: { action: FormAction; email: string }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="quiet" className="self-start" disabled={pending}>
        {pending ? t.form.sending : t.resend}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/** Ponovno slanje pozivnice koja još nije prihvaćena; stara poveznica time prestaje vrijediti. */
export function ResendInviteForm(props: { action: FormAction; email: string }) {
  return (
    <ResetWhenHidden>
      <ResendFields {...props} />
    </ResetWhenHidden>
  );
}
