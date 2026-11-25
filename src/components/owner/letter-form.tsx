"use client";

import type { Route } from "next";
import { useActionState, useEffect, useId, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { fill } from "@/lib/text";
import { owner } from "@/messages/hr/owner";
import { LETTER_BODY_MAX, LETTER_TITLE_MAX } from "./limits";
import { useResetWhenHidden } from "./reset-when-hidden";
import type { FormAction } from "./types";

export type LetterValues = {
  writtenOn: string;
  title: string;
  body: string;
  visibility: "private" | "public";
};

export type LetterFormState = {
  error: string | null;
  fieldErrors: Partial<Record<"date" | "title" | "body", string>>;
  /** Ono što je poslano, da se nakon greške ništa ne izgubi. */
  values?: LetterValues;
};

type Props = {
  action: FormAction<LetterFormState>;
  initial: LetterValues;
  /** Današnji dan u Zagrebu; pismo ne može nositi kasniji datum. */
  maxDate: string;
  cancelHref: string;
};

const t = owner.letters;

function LetterFields({ action, initial, maxDate, cancelHref, arm }: Props & { arm: (armed: boolean) => void }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, { error: null, fieldErrors: {} });
  const values = state.values ?? initial;
  const [length, setLength] = useState(values.body.length);
  // Pismo koje nije spremljeno zbog greške i dalje je nacrt koji treba sačuvati.
  useEffect(() => {
    if (state.error !== null || Object.keys(state.fieldErrors).length > 0) {
      arm(false);
    }
  }, [state, arm]);
  const options = [
    { value: "private", label: t.fields.private, body: t.fields.privateBody },
    { value: "public", label: t.fields.public, body: t.fields.publicBody },
  ] as const;
  return (
    <form action={formAction} onChange={() => arm(false)} onSubmit={() => arm(true)} className="flex flex-col gap-5">
      <Card className="flex flex-col gap-5">
        <Field label={t.fields.date} htmlFor={`${id}-date`} error={state.fieldErrors.date}>
          <Input
            id={`${id}-date`}
            name="written_on"
            type="date"
            required
            max={maxDate}
            min="1950-01-01"
            defaultValue={values.writtenOn}
          />
        </Field>
        <Field label={t.fields.title} htmlFor={`${id}-title`} optional error={state.fieldErrors.title}>
          <Input
            id={`${id}-title`}
            name="title"
            maxLength={LETTER_TITLE_MAX}
            defaultValue={values.title}
            placeholder={t.fields.titlePlaceholder}
            autoComplete="off"
          />
        </Field>
        <Field
          label={t.fields.body}
          htmlFor={`${id}-body`}
          error={state.fieldErrors.body}
          hint={fill(t.fields.counter, { n: length, max: LETTER_BODY_MAX })}
        >
          <Textarea
            id={`${id}-body`}
            name="body"
            required
            maxLength={LETTER_BODY_MAX}
            defaultValue={values.body}
            placeholder={t.fields.bodyPlaceholder}
            onChange={(event) => setLength(event.target.value.length)}
            className="min-h-64"
          />
        </Field>
      </Card>
      <Card>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-bold">{t.fields.visibility}</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-3.5 has-checked:border-teal has-checked:bg-mint"
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                defaultChecked={values.visibility === option.value}
                className="mt-0.5 size-5 shrink-0 accent-teal"
              />
              <span className="flex flex-col">
                <span className="font-bold">{option.label}</span>
                <span className="text-sm text-plum-soft">{option.body}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Card>
      {state.error ? (
        <p className="rounded-2xl bg-butter px-4 py-3 font-medium" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? owner.saving : t.save}
        </Button>
        <ButtonLink href={cancelHref as Route} variant="quiet" className="self-center" onClick={() => arm(true)}>
          {owner.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}

/**
 * Obrazac za novo pismo i za uređivanje postojećeg. Nakon spremanja akcija vodi na popis.
 * Nedovršeno pismo ostaje sačuvano ako korisnik slučajno ode sa stranice; nakon spremanja ili
 * odustajanja obrazac se sljedeći put otvara iznova.
 */
export function LetterForm(props: Props) {
  const [version, arm] = useResetWhenHidden(false);
  return <LetterFields key={version} {...props} arm={arm} />;
}
