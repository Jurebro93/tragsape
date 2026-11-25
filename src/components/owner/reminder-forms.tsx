"use client";

import { useActionState, useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { DateParts } from "@/lib/validation";
import { owner } from "@/messages/hr/owner";
import { DateFields } from "./date-fields";
import { Feedback } from "./feedback";
import { ResetWhenHidden } from "./reset-when-hidden";
import { idleState, type ActionState, type FormAction } from "./types";

const t = owner.reminders;

export type ReminderKindKey = "birthday" | "adoption" | "anniversary";

export type ReminderOption = {
  kind: ReminderKindKey;
  enabled: boolean;
  /** Kada stiže e-mail, ili što nedostaje da bi mogao stići. */
  note: ReactNode;
};

export type AdoptionFormState = ActionState & { values?: Required<DateParts> };

function EnableFields({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? owner.saving : t.optIn.action}
      </Button>
    </form>
  );
}

/** Prvi „da": bez njega se podsjetnici ne šalju. */
export function EnableRemindersForm(props: { action: FormAction }) {
  return (
    <ResetWhenHidden>
      <EnableFields {...props} />
    </ResetWhenHidden>
  );
}

function PrefsFields({ action, options }: { action: FormAction; options: ReminderOption[] }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-bold">{t.legend}</legend>
        {options.map((option) => (
          <div
            key={option.kind}
            className="flex flex-col gap-1.5 rounded-2xl border-2 border-line p-3.5 has-checked:border-teal has-checked:bg-mint"
          >
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span className="font-bold">{t.kinds[option.kind]}</span>
              <input
                type="checkbox"
                role="switch"
                name={option.kind}
                defaultChecked={option.enabled}
                aria-describedby={`${id}-${option.kind}`}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-8 w-14 shrink-0 items-center rounded-full bg-plum-soft/50 p-1 transition-colors peer-checked:bg-teal peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal peer-checked:[&>span]:translate-x-6"
              >
                <span className="size-6 rounded-full bg-white transition-transform" />
              </span>
            </label>
            <p id={`${id}-${option.kind}`} className="text-sm text-plum-soft">
              {option.note}
            </p>
          </div>
        ))}
      </fieldset>
      <Feedback state={state} done={t.saved} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? owner.saving : t.save}
      </Button>
    </form>
  );
}

/** Tri prekidača, po jedan za svaku vrstu podsjetnika. */
export function ReminderPrefsForm(props: { action: FormAction; options: ReminderOption[] }) {
  return (
    <ResetWhenHidden>
      <PrefsFields {...props} />
    </ResetWhenHidden>
  );
}

type AdoptionProps = { action: FormAction<AdoptionFormState>; initial: Required<DateParts> };

function AdoptionFields({ action, initial }: AdoptionProps) {
  const id = useId();
  const [state, formAction, pending] = useActionState<AdoptionFormState, FormData>(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <DateFields
        prefix="adoption"
        hintId={`${id}-hint`}
        legend={t.adoption.title}
        initial={state.values ?? initial}
        hint={t.adoption.hint}
        error={state.error}
        optional
      />
      {state.done && state.message ? (
        <p className="text-sm font-medium text-teal" role="status">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? owner.saving : t.adoption.save}
      </Button>
    </form>
  );
}

/** Dan dolaska u obitelj: cijeli datum ili prazno. */
export function AdoptionDateForm(props: AdoptionProps) {
  return (
    <ResetWhenHidden>
      <AdoptionFields {...props} />
    </ResetWhenHidden>
  );
}
