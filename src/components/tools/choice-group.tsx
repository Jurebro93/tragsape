"use client";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string; hint?: string };

const chip =
  "relative inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 border-line bg-white px-4 py-2 text-[15px] font-semibold leading-snug has-[:checked]:border-teal has-[:checked]:bg-mint has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal";

/**
 * Izbor jedne mogućnosti: prave radio-tipke unutar fieldseta, prikazane kao dodirne pločice.
 * Odabir se vidi po rubu, pozadini i kvačici, ne samo po boji.
 */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  stacked = false,
}: {
  legend: string;
  hint?: string;
  name: string;
  options: ReadonlyArray<Option<T>>;
  value: T | null;
  onChange: (value: T) => void;
  /** Mogućnosti jedna ispod druge, pune širine (za duže odgovore). */
  stacked?: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-[15px] font-bold leading-snug">{legend}</legend>
      {hint ? <p className="text-sm text-plum-soft">{hint}</p> : null}
      <div className={cn("flex gap-2", stacked ? "flex-col" : "flex-wrap")}>
        {options.map((option) => (
          <label key={option.value} className={cn(chip, stacked && "w-full")}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="flex flex-1 flex-wrap items-baseline gap-x-1.5">
              <span>{option.label}</span>
              {option.hint ? <span className="font-normal text-plum-soft">{option.hint}</span> : null}
            </span>
            {value === option.value ? <CheckIcon size={18} className="shrink-0 text-teal-deep" /> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Izbor više mogućnosti: prave potvrdne kućice prikazane kao dodirne pločice. */
export function CheckGroup<T extends string>({
  legend,
  hint,
  name,
  options,
  values,
  onToggle,
}: {
  legend: string;
  hint?: string;
  name: string;
  options: ReadonlyArray<Option<T>>;
  values: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-[15px] font-bold leading-snug">{legend}</legend>
      {hint ? <p className="text-sm text-plum-soft">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label key={option.value} className={chip}>
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              <span>{option.label}</span>
              {checked ? <CheckIcon size={18} className="shrink-0 text-teal-deep" /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
