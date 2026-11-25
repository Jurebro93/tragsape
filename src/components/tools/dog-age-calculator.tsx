"use client";

import { useState, type FormEvent } from "react";
import { AgeFields } from "@/components/tools/age-fields";
import { ChoiceGroup } from "@/components/tools/choice-group";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill, plural } from "@/lib/text";
import { parseAgeMonths } from "@/lib/tools/age";
import {
  DOG_SIZES,
  SENIOR_START_YEARS,
  dogLifeStage,
  dogToHumanYears,
  epigeneticHumanYears,
  type DogSize,
} from "@/lib/tools/dog-age";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.dogAge;
const common = tools.common;

const sizeOptions = DOG_SIZES.map((size) => ({ value: size, ...t.form.sizes[size] }));

function humanYears(value: number): string {
  return plural(Math.round(value), common.humanYears);
}

type Shown = { ageMonths: number; size: DogSize };

function Result({ ageMonths, size }: Shown) {
  const converted = dogToHumanYears(size, ageMonths);
  const stage = dogLifeStage(size, ageMonths);
  const epigenetic = epigeneticHumanYears(ageMonths);
  const senior = SENIOR_START_YEARS[size];

  return (
    <Card className="flex flex-col gap-4 sm:p-6">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">{t.result.title}</h2>
      {converted.kind === "table" ? (
        <p className="font-display text-3xl font-extrabold leading-tight">
          {common.about} {humanYears(converted.humanYears)}
        </p>
      ) : null}
      {converted.kind === "under-one" ? (
        <p className="leading-relaxed">{fill(t.result.underOne, { value: humanYears(converted.atOneYear) })}</p>
      ) : null}
      {converted.kind === "beyond-table" ? (
        <p className="leading-relaxed">{fill(t.result.beyondTable, { value: humanYears(converted.atTableEnd) })}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-bold text-plum-soft">{t.result.stageLabel}</p>
        <p className="font-display text-xl font-extrabold leading-snug">{t.stages[stage].label}</p>
        <p className="leading-relaxed text-plum-soft">{fill(t.stages[stage].body, senior)}</p>
      </div>
      {converted.kind === "table" && !converted.exact ? (
        <p className="text-[15px] leading-relaxed text-plum-soft">{t.result.interpolated}</p>
      ) : null}
      {epigenetic !== null ? (
        <p className="text-[15px] leading-relaxed text-plum-soft">
          {fill(t.result.epigenetic, { value: humanYears(epigenetic) })}
        </p>
      ) : null}
      <Note>{t.result.caveat}</Note>
    </Card>
  );
}

/** Kalkulator psećih godina: dob i veličina, rezultat se najavljuje čitačima zaslona. */
export function DogAgeCalculator() {
  const hydrated = useHydrated();
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("0");
  const [size, setSize] = useState<DogSize | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const empty = years.trim() === "" && months === "0";
    const ageMonths = empty ? null : parseAgeMonths(years, months);
    const nextAgeError = empty ? common.ageRequired : ageMonths === null ? common.ageInvalid : null;
    const nextSizeError = size === null ? t.form.sizeRequired : null;
    setAgeError(nextAgeError);
    setSizeError(nextSizeError);
    setShown(ageMonths !== null && size !== null ? { ageMonths, size } : null);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} noValidate>
        <Card className="flex flex-col gap-5 sm:p-6">
          <AgeFields
            idPrefix="pas"
            legend={t.form.ageLegend}
            years={years}
            months={months}
            onYears={setYears}
            onMonths={setMonths}
            error={ageError}
          />
          <div className="flex flex-col gap-2">
            <ChoiceGroup
              legend={t.form.sizeLegend}
              name="size"
              options={sizeOptions}
              value={size}
              onChange={(value) => {
                setSize(value);
                setSizeError(null);
              }}
            />
            <p className="text-sm text-plum-soft">{t.form.sizeHint}</p>
            {sizeError ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {sizeError}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={!hydrated} className="w-full sm:w-auto sm:self-start">
            {common.calculate}
          </Button>
        </Card>
      </form>
      <div aria-live="polite">{shown ? <Result {...shown} /> : null}</div>
    </div>
  );
}
