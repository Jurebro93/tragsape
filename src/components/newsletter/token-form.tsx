"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { keepValues } from "@/lib/keep-values";
import type { TokenState } from "@/app/newsletter/actions";

/** Jedan gumb koji potvrđuje ili odjavljuje prijavu za token iz poveznice. */
export function TokenForm({
  token,
  action,
  button,
  done,
  invalid,
}: {
  token: string;
  action: (state: TokenState, formData: FormData) => Promise<TokenState>;
  button: string;
  done: string;
  invalid: string;
}) {
  const [state, dispatch, pending] = useActionState<TokenState, FormData>(action, { status: "idle" });
  if (state.status !== "idle") {
    return (
      <p role="status" className="rounded-3xl bg-mint px-5 py-4 font-medium">
        {state.status === "done" ? done : invalid}
      </p>
    );
  }
  return (
    <form action={dispatch} onSubmit={keepValues(dispatch)}>
      <input type="hidden" name="t" value={token} />
      <Button type="submit" disabled={pending}>
        {button}
      </Button>
    </form>
  );
}
