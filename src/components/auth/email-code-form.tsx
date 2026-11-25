"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-values";
import { requestCodeAction, verifyCodeAction, type EmailCodeState } from "@/app/prijava/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { fill } from "@/lib/text";
import { auth } from "@/messages/hr/auth";

const initial: EmailCodeState = { step: "email", email: "", mode: "email", error: null };

/**
 * E-mail, zatim šesteroznamenkasti kod. Kod radi i kad se e-mail otvori u drugom pregledniku,
 * što je čest slučaj u aplikacijama društvenih mreža.
 */
export function EmailCodeForm({ next, sendLabel }: { next: string; sendLabel?: string }) {
  const [requested, requestAction, requesting] = useActionState(requestCodeAction, initial);
  const [verified, verifyAction, verifying] = useActionState(verifyCodeAction, requested);
  // Greška provjere koda pripada koraku s kodom; stanje slanja određuje na kojem smo koraku.
  const state = requested.step === "code" ? { ...requested, error: verified.error ?? requested.error } : requested;

  if (state.step === "email") {
    return (
      <form action={requestAction} onSubmit={keepValues(requestAction)} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label={auth.signIn.emailLabel} htmlFor="email" error={state.error}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder={auth.signIn.emailPlaceholder}
          />
        </Field>
        <Button type="submit" disabled={requesting}>
          {requesting ? auth.signIn.sending : (sendLabel ?? auth.signIn.send)}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px]">{fill(auth.code.sentTo, { email: state.email })}</p>
      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="mode" value={state.mode} />
        <Field label={auth.code.label} htmlFor="code" error={state.error} hint={auth.code.spamHint}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            className="text-center text-2xl font-bold tracking-[0.3em]"
          />
        </Field>
        <Button type="submit" disabled={verifying}>
          {verifying ? auth.code.confirming : auth.code.confirm}
        </Button>
      </form>
      <form action={requestAction}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value="" />
        <Button type="submit" variant="quiet">
          {auth.code.otherEmail}
        </Button>
      </form>
    </div>
  );
}
