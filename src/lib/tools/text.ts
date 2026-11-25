/**
 * Čišćenje onoga što posjetitelj upiše prije nego što uđe u složenu rečenicu:
 * jedan red, bez viška razmaka, bez završne interpunkcije (rečenica je dodaje sama), do `max` znakova.
 */
export function cleanPart(value: string | null | undefined, max: number): string {
  const singleLine = (value ?? "").replace(/\s+/g, " ").trim();
  const withoutEnding = singleLine.replace(/[\s.,;:!?…]+$/u, "");
  return withoutEnding.slice(0, max).trim();
}

/** Prvo slovo veliko; ostatak ostaje kako je upisan (imena, pokrate). */
export function capitalizeFirst(text: string): string {
  if (text === "") {
    return text;
  }
  const [first, ...rest] = Array.from(text);
  return first.toLocaleUpperCase("hr") + rest.join("");
}

/** Uklanja ponovljene tekstove, čuvajući redoslijed. */
export function uniqueTexts(texts: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const text of texts) {
    if (text !== "" && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result;
}
