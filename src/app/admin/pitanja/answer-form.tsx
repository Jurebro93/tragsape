"use client";

import { useActionState } from "react";
import { answerRequestAction } from "@/app/admin/pitanja/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { keepValues } from "@/lib/keep-values";
import { requests } from "@/messages/hr/requests";

const t = requests.admin;

/** Upis adrese objavljenog članka i jedan e-mail čitatelju. */
export function AnswerForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(answerRequestAction.bind(null, id), { error: null });
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-bold">
        {t.slugLabel}
        <Input name="slug" placeholder="npr. macka-pije-puno-vode" className="min-w-64" />
      </label>
      <Button type="submit" size="md" disabled={pending}>
        {t.notify}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
