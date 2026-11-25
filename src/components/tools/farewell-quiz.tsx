"use client";

import { useState, type FormEvent } from "react";
import { ChoiceGroup } from "@/components/tools/choice-group";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/text";
import {
  FAREWELL_QUESTIONS,
  FAREWELL_QUESTION_IDS,
  recommendFarewells,
  type FarewellAnswers,
  type FarewellQuestion,
  type FarewellWay,
} from "@/lib/tools/farewell";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.farewell;

function optionsFor(question: FarewellQuestion) {
  const labels = t.questions[question].options as Record<string, string>;
  return FAREWELL_QUESTIONS[question].map((value) => ({ value: value as string, label: labels[value] }));
}

/** Kviz o oproštaju: šest pitanja, dva do tri neutralno opisana prijedloga. Bez cijena i bez prava. */
export function FarewellQuiz() {
  const hydrated = useHydrated();
  const [answers, setAnswers] = useState<FarewellAnswers>({});
  const [ways, setWays] = useState<FarewellWay[] | null>(null);
  const [missing, setMissing] = useState(false);

  const answered = FAREWELL_QUESTION_IDS.filter((question) => answers[question] !== undefined).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = recommendFarewells(answers);
    setMissing(result.length === 0);
    setWays(result.length === 0 ? null : result);
  }

  return (
    <div className="flex flex-col gap-5">
      <Note>{t.privacy}</Note>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {FAREWELL_QUESTION_IDS.map((question) => (
          <Card key={question} className="sm:p-6">
            <ChoiceGroup
              stacked
              legend={t.questions[question].legend}
              name={`oprostaj-${question}`}
              options={optionsFor(question)}
              value={(answers[question] as string | undefined) ?? null}
              onChange={(value) => {
                setAnswers((current) => ({ ...current, [question]: value }));
                setMissing(false);
              }}
            />
          </Card>
        ))}
        <Button type="submit" disabled={!hydrated} className="w-full sm:w-auto sm:self-start">
          {t.submit}
        </Button>
        {missing ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {fill(t.incomplete, { count: answered })}
          </p>
        ) : null}
      </form>

      <div aria-live="polite">
        {ways ? (
          <section aria-labelledby="oprostaj-prijedlozi" className="flex flex-col gap-3">
            <h2 id="oprostaj-prijedlozi" className="font-display text-2xl font-extrabold leading-tight">
              {t.result.title}
            </h2>
            <p className="leading-relaxed text-plum-soft">{t.result.intro}</p>
            <ul className="flex flex-col gap-3">
              {ways.map((way) => (
                <li key={way}>
                  <Card className="flex flex-col gap-2 sm:p-6">
                    <h3 className="font-display text-xl font-extrabold leading-snug">{t.ways[way].title}</h3>
                    <p className="leading-relaxed text-plum-soft">{t.ways[way].body}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
