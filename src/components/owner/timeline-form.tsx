"use client";

import type { Route } from "next";
import { useActionState, useEffect, useId } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { DateParts } from "@/lib/validation";
import { owner } from "@/messages/hr/owner";
import { DateFields } from "./date-fields";
import { TIMELINE_BODY_MAX, TIMELINE_TITLE_MAX } from "./limits";
import { useResetWhenHidden } from "./reset-when-hidden";
import type { FormAction } from "./types";

export type TimelineValues = Required<DateParts> & { title: string; body: string };

export type TimelineFormState = {
  error: string | null;
  fieldErrors: Partial<Record<"date" | "title" | "body", string>>;
  /** Ono što je poslano, da se nakon greške ništa ne izgubi. */
  values?: TimelineValues;
  done?: boolean;
};

type Props = {
  action: FormAction<TimelineFormState>;
  initial?: TimelineValues;
  /** Postoji samo pri uređivanju: kamo vodi „Odustani". */
  cancelHref?: string;
};

const emptyTimelineValues: TimelineValues = { day: "", month: "", year: "", title: "", body: "" };

const t = owner.timeline;

function TimelineFields({
  action,
  initial = emptyTimelineValues,
  cancelHref,
  arm,
}: Props & { arm: (armed: boolean) => void }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, { error: null, fieldErrors: {} });
  const values = state.values ?? initial;
  useEffect(() => {
    if (state.error !== null || Object.keys(state.fieldErrors).length > 0) {
      arm(false);
    }
  }, [state, arm]);
  return (
    <form action={formAction} onChange={() => arm(false)} onSubmit={() => arm(true)} className="flex flex-col gap-5">
      <DateFields
        prefix="event"
        hintId={`${id}-date-hint`}
        legend={t.fields.date}
        initial={{ day: values.day, month: values.month, year: values.year }}
        hint={t.fields.dateHint}
        error={state.fieldErrors.date}
      />
      <Field label={t.fields.title} htmlFor={`${id}-title`} error={state.fieldErrors.title}>
        <Input
          id={`${id}-title`}
          name="title"
          required
          maxLength={TIMELINE_TITLE_MAX}
          defaultValue={values.title}
          placeholder={t.fields.titlePlaceholder}
          autoComplete="off"
        />
      </Field>
      <Field label={t.fields.body} htmlFor={`${id}-body`} optional error={state.fieldErrors.body}>
        <Textarea
          id={`${id}-body`}
          name="body"
          maxLength={TIMELINE_BODY_MAX}
          defaultValue={values.body}
          placeholder={t.fields.bodyPlaceholder}
          className="min-h-24"
        />
      </Field>
      {state.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p className="text-sm font-medium text-teal" role="status">
          {t.saved}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button type="submit" variant={cancelHref ? "primary" : "secondary"} size={cancelHref ? "lg" : "md"} disabled={pending}>
          {pending ? owner.saving : t.save}
        </Button>
        {cancelHref ? (
          <ButtonLink href={cancelHref as Route} variant="quiet" className="self-center" onClick={() => arm(true)}>
            {owner.cancel}
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Događaj na vremenskoj crti: datum u tri polja, naslov i neobavezan opis. Ista forma dodaje
 * novi događaj (ostaje na popisu) i uređuje postojeći (akcija vodi natrag na popis). Nedovršen
 * unos ostaje sačuvan pri odlasku sa stranice; nakon spremanja ili odustajanja obrazac se
 * sljedeći put otvara iznova.
 */
export function TimelineForm(props: Props) {
  const [version, arm] = useResetWhenHidden(false);
  return <TimelineFields key={version} {...props} arm={arm} />;
}
