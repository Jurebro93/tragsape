"use client";

import { useState, type FormEvent } from "react";
import { CheckGroup, ChoiceGroup } from "@/components/tools/choice-group";
import { EditableSuggestion } from "@/components/tools/editable-suggestion";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { fill } from "@/lib/text";
import {
  DEDICATION_MAX,
  DEDICATION_NAME_MAX,
  DEDICATION_PART_MAX,
  DEDICATION_TONES,
  DEDICATION_TOPICS,
  DEDICATION_VOICES,
  buildDedications,
  type DedicationTone,
  type DedicationTopic,
  type DedicationVoice,
} from "@/lib/tools/dedication";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.dedication;

const toneOptions = DEDICATION_TONES.map((tone) => ({ value: tone, label: t.form.tones[tone] }));
const voiceOptions = DEDICATION_VOICES.map((voice) => ({ value: voice, label: t.form.voices[voice] }));
const topicOptions = DEDICATION_TOPICS.map((topic) => ({ value: topic, label: t.form.topics[topic].chip }));

type Shown = { round: number; suggestions: string[] };

/**
 * Pomoćnik za posvetu: bez AI-ja. Prijedlozi nastaju u pregledniku od onoga što vlasnik upiše
 * i svaki se može mijenjati; brojač pazi na 300 znakova.
 */
export function DedicationHelper() {
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [tone, setTone] = useState<DedicationTone>("warm");
  const [voice, setVoice] = useState<DedicationVoice>("we");
  const [topics, setTopics] = useState<DedicationTopic[]>([]);
  const [parts, setParts] = useState<Partial<Record<DedicationTopic, string>>>({});
  const [shown, setShown] = useState<Shown | null>(null);
  const [empty, setEmpty] = useState(false);

  function toggleTopic(topic: DedicationTopic) {
    setTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : DEDICATION_TOPICS.filter((item) => item === topic || current.includes(item)),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = Object.fromEntries(topics.map((topic) => [topic, parts[topic] ?? ""]));
    const suggestions = buildDedications({ name, tone, voice, parts: chosen });
    setEmpty(suggestions.length === 0);
    setShown(suggestions.length === 0 ? null : { round: (shown?.round ?? 0) + 1, suggestions });
  }

  return (
    <div className="flex flex-col gap-5">
      <Note>{t.privacy}</Note>
      <form onSubmit={submit} noValidate>
        <Card className="flex flex-col gap-5 sm:p-6">
          <Field label={t.form.name} htmlFor="posveta-ime" hint={t.form.nameHint} optional>
            <Input
              id="posveta-ime"
              value={name}
              maxLength={DEDICATION_NAME_MAX}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <ChoiceGroup legend={t.form.toneLegend} name="tone" options={toneOptions} value={tone} onChange={setTone} />
          <ChoiceGroup
            legend={t.form.voiceLegend}
            name="voice"
            options={voiceOptions}
            value={voice}
            onChange={setVoice}
          />
          <CheckGroup
            legend={t.form.topicsLegend}
            hint={t.form.topicsHint}
            name="topics"
            options={topicOptions}
            values={topics}
            onToggle={toggleTopic}
          />
          {topics.map((topic) => (
            <Field key={topic} label={t.form.topics[topic].label} htmlFor={`posveta-${topic}`}>
              <Input
                id={`posveta-${topic}`}
                value={parts[topic] ?? ""}
                maxLength={DEDICATION_PART_MAX}
                placeholder={t.form.topics[topic].placeholder}
                autoComplete="off"
                onChange={(event) => setParts((current) => ({ ...current, [topic]: event.target.value }))}
              />
            </Field>
          ))}
          <Button type="submit" disabled={!hydrated} className="w-full sm:w-auto sm:self-start">
            {t.form.submit}
          </Button>
          {empty ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {t.form.empty}
            </p>
          ) : null}
        </Card>
      </form>

      <div aria-live="polite">
        {shown ? (
          <section aria-labelledby="posveta-prijedlozi" className="flex flex-col gap-3">
            <h2 id="posveta-prijedlozi" className="font-display text-2xl font-extrabold leading-tight">
              {t.result.title}
            </h2>
            <p className="leading-relaxed text-plum-soft">{t.result.intro}</p>
            {shown.suggestions.map((suggestion, index) => (
              <EditableSuggestion
                key={`${shown.round}-${index}`}
                id={`posveta-prijedlog-${index + 1}`}
                label={fill(t.result.itemLabel, { index: index + 1 })}
                initial={suggestion}
                maxLength={DEDICATION_MAX}
              />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
