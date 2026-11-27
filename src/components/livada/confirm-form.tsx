"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useEffect } from "react";
import type { MeadowConfirmState } from "@/app/livada/potvrda/actions";
import { Button } from "@/components/ui/button";
import { keepValues } from "@/lib/keep-values";
import { placeText } from "@/lib/meadow-text";
import { fill } from "@/lib/text";
import { meadow } from "@/messages/hr/meadow";
import { rememberMine } from "./mine";

const t = meadow.confirm;

/** Gumb koji potvrđuje trag iz poveznice; nakon potvrde pamti trag u ovom pregledniku kao „Moj trag”. */
export function MeadowConfirmForm({
  token,
  action,
}: {
  token: string;
  action: (state: MeadowConfirmState, formData: FormData) => Promise<MeadowConfirmState>;
}) {
  const [state, dispatch, pending] = useActionState<MeadowConfirmState, FormData>(action, { status: "idle" });

  useEffect(() => {
    if (state.status === "done") rememberMine(state.number);
  }, [state]);

  if (state.status === "done") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-3xl bg-mint px-5 py-5">
        <p className="font-display text-2xl font-extrabold [overflow-wrap:anywhere]">{fill(t.doneTitle, { name: state.name })}</p>
        <p className="text-[17px]">
          {fill(t.doneBody, {
            number: state.number.toLocaleString("hr-HR"),
            place: placeText(state.species, state.zoneIndex),
          })}
        </p>
        <p className="text-[15px] text-plum-soft">{t.doneHint}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/livada?trag=${state.number}` as Route}
            className="inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 font-bold text-white no-underline hover:bg-terracotta-deep"
          >
            {t.open}
          </Link>
          <Link
            href={`/livada/trag/${state.number}` as Route}
            className="inline-flex min-h-12 items-center rounded-full border-2 border-teal bg-white px-6 font-bold text-teal-deep no-underline"
          >
            {meadow.card.page}
          </Link>
        </div>
      </div>
    );
  }
  if (state.status === "invalid") {
    return (
      <p role="status" className="rounded-3xl bg-butter px-5 py-4 font-medium">
        {t.invalid}
      </p>
    );
  }
  return (
    <form action={dispatch} onSubmit={keepValues(dispatch)}>
      <input type="hidden" name="t" value={token} />
      <Button type="submit" disabled={pending}>
        {t.button}
      </Button>
    </form>
  );
}
