import { Input, Select } from "@/components/ui/field";
import type { DateParts } from "@/lib/validation";
import { wizard } from "@/messages/hr/wizard";

/**
 * Datum u tri polja (dan, mjesec, godina), isti obrazac kao u izradi spomena. Polja se šalju kao
 * `{prefix}_day`, `{prefix}_month` i `{prefix}_year`.
 */
export function DateFields({
  prefix,
  hintId,
  legend,
  initial,
  hint,
  error,
  optional = false,
}: {
  prefix: string;
  /** Jedinstven `id` napomene (iz `useId`), jer ista polja mogu postojati na više stranica. */
  hintId: string;
  legend: string;
  initial: Required<DateParts>;
  hint?: string;
  error?: string | null;
  optional?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-1.5 text-[15px] font-bold">
        {legend}
        {optional ? <span className="font-normal text-plum-soft"> (neobavezno)</span> : null}
      </legend>
      <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <Input
          name={`${prefix}_day`}
          aria-label={`${legend}: ${wizard.pet.day}`}
          placeholder={wizard.pet.day}
          inputMode="numeric"
          maxLength={2}
          autoComplete="off"
          defaultValue={initial.day}
        />
        {/* Ključ: React nakon slanja obrasca vraća <select> na vrijednost s kojom je nastao, pa se
            pri promjeni zadane vrijednosti (greška, spremljen datum) polje mora stvoriti iznova. */}
        <Select
          key={initial.month}
          name={`${prefix}_month`}
          aria-label={`${legend}: ${wizard.pet.month}`}
          defaultValue={initial.month}
        >
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
          autoComplete="off"
          defaultValue={initial.year}
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-plum-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
