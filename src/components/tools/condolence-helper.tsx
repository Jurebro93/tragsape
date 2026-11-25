"use client";

import { useState, type FormEvent } from "react";
import { ChoiceGroup } from "@/components/tools/choice-group";
import { EditableSuggestion } from "@/components/tools/editable-suggestion";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { fill } from "@/lib/text";
import {
  CONDOLENCE_ADDRESSES,
  CONDOLENCE_FAMILIARITIES,
  CONDOLENCE_MEMORY_MAX,
  CONDOLENCE_NAME_MAX,
  CONDOLENCE_RELATIONS,
  CONDOLENCE_TONES,
  buildCondolences,
  type CondolenceAddress,
  type CondolenceFamiliarity,
  type CondolenceRelation,
  type CondolenceTone,
} from "@/lib/tools/condolence";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.condolence;

const relationOptions = CONDOLENCE_RELATIONS.map((value) => ({ value, label: t.form.relations[value] }));
const addressOptions = CONDOLENCE_ADDRESSES.map((value) => ({ value, label: t.form.addresses[value] }));
const familiarityOptions = CONDOLENCE_FAMILIARITIES.map((value) => ({ value, label: t.form.familiarities[value] }));
const toneOptions = CONDOLENCE_TONES.map((value) => ({ value, label: t.form.tones[value] }));

type Shown = { round: number; messages: string[] };

/** Pomoćnik za poruku sućuti: nekoliko izbora, nekoliko kratkih poruka koje se mogu doraditi. */
export function CondolenceHelper() {
  const hydrated = useHydrated();
  const [relation, setRelation] = useState<CondolenceRelation>("friend");
  const [address, setAddress] = useState<CondolenceAddress>("ti");
  const [familiarity, setFamiliarity] = useState<CondolenceFamiliarity>("little");
  const [tone, setTone] = useState<CondolenceTone>("warm");
  const [petName, setPetName] = useState("");
  const [memory, setMemory] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messages = buildCondolences({ relation, address, familiarity, tone, petName, memory });
    setShown({ round: (shown?.round ?? 0) + 1, messages });
  }

  return (
    <div className="flex flex-col gap-5">
      <Note>{t.privacy}</Note>
      <form onSubmit={submit} noValidate>
        <Card className="flex flex-col gap-5 sm:p-6">
          <ChoiceGroup
            legend={t.form.relationLegend}
            name="relation"
            options={relationOptions}
            value={relation}
            onChange={setRelation}
          />
          <ChoiceGroup
            legend={t.form.addressLegend}
            name="address"
            options={addressOptions}
            value={address}
            onChange={setAddress}
          />
          <ChoiceGroup
            legend={t.form.familiarityLegend}
            name="familiarity"
            options={familiarityOptions}
            value={familiarity}
            onChange={setFamiliarity}
          />
          <ChoiceGroup legend={t.form.toneLegend} name="tone" options={toneOptions} value={tone} onChange={setTone} />
          <Field label={t.form.petName} htmlFor="sucut-ime" hint={t.form.petNameHint} optional>
            <Input
              id="sucut-ime"
              value={petName}
              maxLength={CONDOLENCE_NAME_MAX}
              autoComplete="off"
              onChange={(event) => setPetName(event.target.value)}
            />
          </Field>
          <Field label={t.form.memory} htmlFor="sucut-sjecanje" optional>
            <Input
              id="sucut-sjecanje"
              value={memory}
              maxLength={CONDOLENCE_MEMORY_MAX}
              placeholder={t.form.memoryPlaceholder}
              autoComplete="off"
              onChange={(event) => setMemory(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={!hydrated} className="w-full sm:w-auto sm:self-start">
            {t.form.submit}
          </Button>
        </Card>
      </form>

      <div aria-live="polite">
        {shown ? (
          <section aria-labelledby="sucut-poruke" className="flex flex-col gap-3">
            <h2 id="sucut-poruke" className="font-display text-2xl font-extrabold leading-tight">
              {t.result.title}
            </h2>
            <p className="leading-relaxed text-plum-soft">{t.result.intro}</p>
            {shown.messages.map((message, index) => (
              <EditableSuggestion
                key={`${shown.round}-${index}`}
                id={`sucut-poruka-${index + 1}`}
                label={fill(t.result.itemLabel, { index: index + 1 })}
                initial={message}
              />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
