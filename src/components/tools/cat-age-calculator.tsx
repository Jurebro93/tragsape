"use client";

import { useState, type FormEvent } from "react";
import { AgeFields } from "@/components/tools/age-fields";
import { Note } from "@/components/tools/note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plural } from "@/lib/text";
import { parseAgeMonths } from "@/lib/tools/age";
import { catLifeStage, catToHumanYears } from "@/lib/tools/cat-age";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.catAge;
const common = tools.common;

function Result({ ageMonths }: { ageMonths: number }) {
  const converted = catToHumanYears(ageMonths);
  const stage = catLifeStage(ageMonths);
  return (
    <Card className="flex flex-col gap-4 sm:p-6">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">{t.result.title}</h2>
      <p className="font-display text-3xl font-extrabold leading-tight">
        {common.about} {plural(Math.round(converted.humanYears), common.humanYears)}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-bold text-plum-soft">{t.result.stageLabel}</p>
        <p className="font-display text-xl font-extrabold leading-snug">{t.stages[stage].label}</p>
        <p className="leading-relaxed text-plum-soft">{t.stages[stage].body}</p>
      </div>
      {converted.exact ? null : (
        <p className="text-[15px] leading-relaxed text-plum-soft">{t.result.interpolated}</p>
      )}
      <Note>{t.result.caveat}</Note>
    </Card>
  );
}

/** Kalkulator mačjih godina prema tablici International Cat Carea. */
export function CatAgeCalculator() {
  const hydrated = useHydrated();
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const empty = years.trim() === "" && months === "0";
    const ageMonths = empty ? null : parseAgeMonths(years, months);
    setError(empty ? common.ageRequired : ageMonths === null ? common.ageInvalid : null);
    setShown(ageMonths);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} noValidate>
        <Card className="flex flex-col gap-5 sm:p-6">
          <AgeFields
            idPrefix="macka"
            legend={t.form.ageLegend}
            years={years}
            months={months}
            onYears={setYears}
            onMonths={setMonths}
            error={error}
          />
          <Button type="submit" disabled={!hydrated} className="w-full sm:w-auto sm:self-start">
            {common.calculate}
          </Button>
        </Card>
      </form>
      <div aria-live="polite">{shown !== null ? <Result ageMonths={shown} /> : null}</div>
    </div>
  );
}
