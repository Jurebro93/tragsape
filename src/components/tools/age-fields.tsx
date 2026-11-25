"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { tools } from "@/messages/hr/tools";

const t = tools.common;
const MONTHS = Array.from({ length: 12 }, (_, month) => month);

/** Dob u godinama i mjesecima: dva prava polja s oznakama, zajednička kalkulatorima dobi. */
export function AgeFields({
  idPrefix,
  legend,
  years,
  months,
  onYears,
  onMonths,
  error,
}: {
  idPrefix: string;
  legend: string;
  years: string;
  months: string;
  onYears: (value: string) => void;
  onMonths: (value: string) => void;
  error?: string | null;
}) {
  const errorId = `${idPrefix}-age-error`;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-[15px] font-bold leading-snug">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.yearsLabel} htmlFor={`${idPrefix}-years`}>
          <Input
            id={`${idPrefix}-years`}
            name="years"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            autoComplete="off"
            value={years}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onYears(event.target.value)}
          />
        </Field>
        <Field label={t.monthsLabel} htmlFor={`${idPrefix}-months`}>
          <Select
            id={`${idPrefix}-months`}
            name="months"
            value={months}
            onChange={(event) => onMonths(event.target.value)}
          >
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
