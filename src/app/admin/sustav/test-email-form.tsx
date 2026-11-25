"use client";

import { useActionState } from "react";
import { sendTestEmailAction } from "@/app/admin/sustav/actions";
import { Button } from "@/components/ui/button";

export function TestEmailForm() {
  const [state, action, pending] = useActionState(sendTestEmailAction, { message: null });
  return (
    <form action={action} className="flex flex-col gap-3">
      <Button type="submit" variant="secondary" size="md" disabled={pending} className="self-start">
        {pending ? "Šaljem…" : "Pošalji mi probni e-mail"}
      </Button>
      {state.message ? (
        <p className="text-[15px]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
