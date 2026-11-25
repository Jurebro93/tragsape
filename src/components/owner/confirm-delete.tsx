"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { owner } from "@/messages/hr/owner";
import { ResetWhenHidden } from "./reset-when-hidden";
import { idleState, type FormAction } from "./types";

type Props = {
  action: FormAction;
  question: string;
  label?: string;
  yes?: string;
};

function Confirm({ action, question, label = owner.remove.action, yes = owner.remove.yes }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, idleState);
  if (!open) {
    return (
      <Button variant="quiet" className="text-danger! hover:text-danger!" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-2xl bg-butter p-3.5">
      <p className="text-[15px] font-medium [overflow-wrap:anywhere]">{question}</p>
      {state.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="md" disabled={pending} className="bg-danger! hover:bg-danger!">
          {yes}
        </Button>
        <Button variant="secondary" size="md" autoFocus onClick={() => setOpen(false)}>
          {owner.cancel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Brisanje u dva koraka: prvi dodir samo pita, drugi briše. Nakon uspjeha stranica se osvježi
 * i stavka nestane zajedno s ovim obrascem. Otvorena potvrda ne ostaje otvorena nakon odlaska
 * sa stranice.
 */
export function ConfirmDelete(props: Props) {
  return (
    <ResetWhenHidden>
      <Confirm {...props} />
    </ResetWhenHidden>
  );
}
