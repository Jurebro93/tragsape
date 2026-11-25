"use client";

import { useState } from "react";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { fill } from "@/lib/text";
import {
  QOL_DIMENSIONS,
  QOL_MAX_SCORE,
  QOL_MAX_TOTAL,
  summarizeQuality,
  type QolAnswers,
  type QolDimension,
} from "@/lib/tools/quality-of-life";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.quality;
const SCORES = Array.from({ length: QOL_MAX_SCORE + 1 }, (_, score) => score);

const scoreChip =
  "relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-white text-[16px] font-bold has-[:checked]:border-teal has-[:checked]:bg-teal has-[:checked]:text-white has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal";

function DimensionField({
  dimension,
  value,
  onChange,
}: {
  dimension: QolDimension;
  value: number | undefined;
  onChange: (score: number) => void;
}) {
  const text = t.dimensions[dimension];
  return (
    <Card className="sm:p-6">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="font-display text-xl font-extrabold leading-snug">{text.label}</legend>
        <p className="leading-relaxed">{text.question}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {SCORES.map((score) => (
            <label key={score} className={scoreChip}>
              <input
                type="radio"
                name={`qol-${dimension}`}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                aria-label={
                  score === 0 ? `0 — ${text.low}` : score === QOL_MAX_SCORE ? `${score} — ${text.high}` : undefined
                }
                className="sr-only"
              />
              <span>{score}</span>
            </label>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-plum-soft">
          <span className="font-bold">0</span> — {text.low}
          <span aria-hidden="true"> · </span>
          <span className="font-bold">{QOL_MAX_SCORE}</span> — {text.high}
        </p>
      </fieldset>
    </Card>
  );
}

/**
 * Upitnik o kvaliteti života. Sve ostaje u stanju ove komponente: nema pohrane ni slanja.
 * Za ispis se prikazuje samo sažetak na dnu (ocjene, zbroj, bilješke).
 */
export function QualityOfLifeForm() {
  const hydrated = useHydrated();
  const [answers, setAnswers] = useState<QolAnswers>({});
  const [petName, setPetName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const summary = summarizeQuality(answers);
  const lowestList = summary.lowest
    .map((dimension) =>
      fill(t.result.lowestItem, { label: t.dimensions[dimension].label, score: summary.lowestScore ?? 0 }),
    )
    .join(", ");

  function clear() {
    setAnswers({});
    setPetName("");
    setDate("");
    setNotes("");
  }

  return (
    <>
      <div className="flex flex-col gap-5 print:hidden">
        <Note>{t.privacy}</Note>
        <p className="leading-relaxed text-plum-soft">{t.origin}</p>
        <p className="font-semibold leading-relaxed">{t.how}</p>

        <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()} noValidate>
          {QOL_DIMENSIONS.map((dimension) => (
            <DimensionField
              key={dimension}
              dimension={dimension}
              value={answers[dimension]}
              onChange={(score) => setAnswers((current) => ({ ...current, [dimension]: score }))}
            />
          ))}

          <section
            aria-labelledby="qol-result-title"
            className="flex flex-col gap-4 rounded-3xl bg-butter p-5 sm:p-6"
          >
            <h2 id="qol-result-title" className="font-display text-2xl font-extrabold leading-tight">
              {t.result.title}
            </h2>
            <div aria-live="polite" className="flex flex-col gap-3">
              {summary.complete ? (
                <>
                  <p className="font-display text-3xl font-extrabold leading-tight">
                    {fill(t.result.total, { total: summary.total ?? 0, max: QOL_MAX_TOTAL })}
                  </p>
                  <p className="leading-relaxed">{summary.aboveReference ? t.result.above : t.result.notAbove}</p>
                  {lowestList ? <p className="leading-relaxed">{fill(t.result.lowest, { list: lowestList })}</p> : null}
                </>
              ) : (
                <p className="leading-relaxed">{fill(t.result.incomplete, { count: summary.answered })}</p>
              )}
            </div>
            {summary.complete ? (
              <>
                <p className="leading-relaxed">{t.result.beyondTotal}</p>
                <p className="rounded-3xl bg-white px-5 py-4 font-semibold leading-relaxed">{t.result.notDecision}</p>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-extrabold">{t.result.tipsTitle}</h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
                    {t.result.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </section>

          <Card className="flex flex-col gap-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-xl font-extrabold leading-snug">{t.extras.title}</h2>
              <p className="text-[15px] text-plum-soft">{t.extras.intro}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.extras.petName} htmlFor="qol-pet-name" optional>
                <Input
                  id="qol-pet-name"
                  value={petName}
                  maxLength={60}
                  autoComplete="off"
                  onChange={(event) => setPetName(event.target.value)}
                />
              </Field>
              <Field label={t.extras.date} htmlFor="qol-date" optional>
                <Input id="qol-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
            </div>
            <Field label={t.extras.notes} htmlFor="qol-notes" hint={t.extras.notesHint} optional>
              <Textarea
                id="qol-notes"
                value={notes}
                maxLength={1000}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <Button
              onClick={() => window.print()}
              disabled={!hydrated || !summary.complete}
              className="w-full sm:w-auto sm:self-start"
            >
              {t.print}
            </Button>
            <p className="text-sm text-plum-soft">{summary.complete ? t.printHint : t.printNeedsAll}</p>
          </Card>

          <Button variant="quiet" onClick={clear} disabled={!hydrated} className="self-start">
            {t.clear}
          </Button>
        </form>
      </div>

      {/* Samo za ispis: sažetak koji se nosi veterinaru. */}
      <div className="hidden flex-col gap-4 print:flex">
        <h1 className="font-display text-2xl font-extrabold leading-tight">{t.printout.title}</h1>
        <p className="leading-relaxed">
          {petName.trim() ? (
            <>
              <span className="font-bold">{t.printout.petName}</span> {petName.trim()}
              <br />
            </>
          ) : null}
          {date ? (
            <>
              <span className="font-bold">{t.printout.date}</span> {date.split("-").reverse().join(". ")}.
            </>
          ) : null}
        </p>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="border-b-2 border-plum py-2 pr-4">
                {t.printout.area}
              </th>
              <th scope="col" className="border-b-2 border-plum py-2">
                {t.printout.score}
              </th>
            </tr>
          </thead>
          <tbody>
            {QOL_DIMENSIONS.map((dimension) => (
              <tr key={dimension}>
                <th scope="row" className="border-b border-plum-soft py-2 pr-4 font-normal">
                  <span className="font-bold">{t.dimensions[dimension].label}</span>
                  <br />
                  <span className="text-sm">{t.dimensions[dimension].question}</span>
                </th>
                <td className="border-b border-plum-soft py-2 align-top font-bold">
                  {answers[dimension] ?? t.notRated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.complete ? (
          <p className="text-lg font-bold">{fill(t.result.total, { total: summary.total ?? 0, max: QOL_MAX_TOTAL })}</p>
        ) : null}
        {notes.trim() ? (
          <div>
            <p className="font-bold">{t.printout.notes}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{notes.trim()}</p>
          </div>
        ) : null}
        <p className="text-sm leading-relaxed">{t.printout.footer}</p>
      </div>
    </>
  );
}
