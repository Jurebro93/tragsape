"use client";

import { useActionState } from "react";
import { passwordSignInAction, type PasswordState } from "@/app/prijava/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { keepValues } from "@/lib/keep-values";
import { auth } from "@/messages/hr/auth";

const initial: PasswordState = { email: "", error: null };

export function PasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(passwordSignInAction, initial);
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={auth.password.emailLabel} htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="username" required defaultValue={state.email} />
      </Field>
      <Field label={auth.password.passwordLabel} htmlFor="password" error={state.error}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? auth.password.submitting : auth.password.submit}
      </Button>
    </form>
  );
}
