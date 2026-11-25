/** Umeće vrijednosti u tekst: fill("Bok, {ime}", { ime: "Ana" }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const pluralRules = new Intl.PluralRules("hr");

export type PluralForms = { one: string; few: string; other: string };

/**
 * Hrvatska množina: 1 svijeća, 2 svijeće, 5 svijeća, 21 svijeća.
 * Vraća broj i riječ zajedno.
 */
export function plural(count: number, forms: PluralForms): string {
  const rule = pluralRules.select(count);
  const word = rule === "one" ? forms.one : rule === "few" ? forms.few : forms.other;
  return `${count} ${word}`;
}
