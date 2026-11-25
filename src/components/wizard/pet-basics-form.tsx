"use client";

import { useActionState } from "react";
import type { BasicsState } from "@/app/izradi/actions";
import { AttributionFields } from "@/components/wizard/attribution-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SPECIES } from "@/lib/species";
import type { DateParts } from "@/lib/validation";
import { wizard } from "@/messages/hr/wizard";

export type BasicsInitial = {
  name: string;
  species: string;
  breed: string;
  sex: string;
  birth: Required<DateParts>;
  death: Required<DateParts>;
};

const empty: BasicsInitial = {
  name: "",
  species: "",
  breed: "",
  sex: "",
  birth: { day: "", month: "", year: "" },
  death: { day: "", month: "", year: "" },
};

function DateFields({
  prefix,
  legend,
  initial,
  error,
}: {
  prefix: "birth" | "death";
  legend: string;
  initial: Required<DateParts>;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[15px] font-bold">
        {legend}
        <span className="font-normal text-plum-soft"> (neobavezno)</span>
      </legend>
      <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <Input
          name={`${prefix}_day`}
          aria-label={`${legend}: ${wizard.pet.day}`}
          placeholder={wizard.pet.day}
          inputMode="numeric"
          maxLength={2}
          defaultValue={initial.day}
        />
        <Select name={`${prefix}_month`} aria-label={`${legend}: ${wizard.pet.month}`} defaultValue={initial.month}>
          <option value="">{wizard.pet.monthNone}</option>
          {wizard.months.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </Select>
        <Input
          name={`${prefix}_year`}
          aria-label={`${legend}: ${wizard.pet.year}`}
          placeholder={wizard.pet.year}
          inputMode="numeric"
          maxLength={4}
          defaultValue={initial.year}
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Prvi korak: osnovni podaci o ljubimcu. Ista forma služi novom nacrtu i kasnijem uređivanju. */
export function PetBasicsForm({
  action,
  initial = empty,
  withAttribution = false,
}: {
  action: (state: BasicsState, formData: FormData) => Promise<BasicsState>;
  initial?: BasicsInitial;
  /** Samo za novi nacrt: uz obrazac se šalje izvor posjeta iz adrese. */
  withAttribution?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {withAttribution ? <AttributionFields /> : null}
      <Card className="flex flex-col gap-5">
        <Field label={wizard.pet.name} htmlFor="name" error={state.errors.name}>
          <Input
            id="name"
            name="name"
            required
            maxLength={60}
            defaultValue={initial.name}
            placeholder={wizard.pet.namePlaceholder}
            autoComplete="off"
          />
        </Field>
        <Field label={wizard.pet.species} htmlFor="species" error={state.errors.species}>
          <Select id="species" name="species" required defaultValue={initial.species}>
            <option value="" disabled>
              {wizard.pet.speciesPlaceholder}
            </option>
            {SPECIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={wizard.pet.breed} htmlFor="breed" optional error={state.errors.breed}>
          <Input
            id="breed"
            name="breed"
            maxLength={80}
            defaultValue={initial.breed}
            placeholder={wizard.pet.breedPlaceholder}
            autoComplete="off"
          />
        </Field>
        <Field label={wizard.pet.sex} htmlFor="sex" optional>
          <Select id="sex" name="sex" defaultValue={initial.sex}>
            <option value="">{wizard.pet.sexNone}</option>
            <option value="m">{wizard.pet.male}</option>
            <option value="z">{wizard.pet.female}</option>
          </Select>
        </Field>
      </Card>
      <Card className="flex flex-col gap-5">
        <DateFields prefix="birth" legend={wizard.pet.birth} initial={initial.birth} error={state.errors.birth} />
        <DateFields prefix="death" legend={wizard.pet.death} initial={initial.death} error={state.errors.death} />
        <p className="text-sm text-plum-soft">{wizard.pet.dateHint}</p>
      </Card>
      {state.errors.form ? (
        <p className="rounded-2xl bg-butter px-4 py-3 font-medium" role="alert">
          {state.errors.form}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? wizard.pet.submitting : wizard.pet.submit}
      </Button>
    </form>
  );
}
