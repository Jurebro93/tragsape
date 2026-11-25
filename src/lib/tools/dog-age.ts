import { interpolate } from "@/lib/tools/age";

/**
 * Pseće godine u ljudskima.
 *
 * Izvori (pristupljeno 25. 11. 2026.):
 * - tablica: American Kennel Club, „How to Calculate Dog Years to Human Years", grafika
 *   „How Old Is My Dog in Human Years?" (pune godine 1–16, četiri veličine);
 * - životne faze: 2019 AAHA Canine Life Stage Guidelines (plakat „What's your dog's life stage?");
 * - početak seniorske dobi po veličini: AVMA, brošura „Senior Pets" (2023.);
 * - epigenetska formula: Wang i sur., Cell Systems 2020, human_age = 16 ln(dog_age) + 31.
 * Poveznice su u `src/messages/hr/tools.ts`. Brojke se ne mijenjaju bez novog izvora.
 */

export const DOG_SIZES = ["small", "medium", "large", "giant"] as const;
export type DogSize = (typeof DOG_SIZES)[number];

/** Tablica AKC-a: indeks 0 je navršena 1 godina, indeks 15 je 16 godina. */
export const DOG_HUMAN_YEARS: Record<DogSize, readonly number[]> = {
  small: [15, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80],
  medium: [15, 24, 28, 32, 36, 42, 47, 51, 56, 60, 65, 69, 74, 78, 83, 87],
  large: [15, 24, 28, 32, 36, 45, 50, 55, 61, 66, 72, 77, 82, 88, 93, 99],
  giant: [12, 22, 31, 38, 45, 49, 56, 64, 71, 79, 86, 93, 100, 107, 114, 121],
};

/** Zadnja puna godina koju tablica pokriva. */
export const DOG_TABLE_MAX_YEARS = 16;

export type DogAgeResult =
  /** Mlađi od godinu dana: izvor nema vrijednosti po mjesecima. `atOneYear` je prva vrijednost tablice. */
  | { kind: "under-one"; atOneYear: number }
  /** Vrijednost iz tablice (`exact`) ili ravnomjerno između dviju susjednih punih godina. */
  | { kind: "table"; humanYears: number; exact: boolean }
  /** Stariji od zadnje godine u tablici: izvor nema vrijednosti. `atTableEnd` je zadnja vrijednost. */
  | { kind: "beyond-table"; atTableEnd: number };

export function dogToHumanYears(size: DogSize, ageMonths: number): DogAgeResult {
  const row = DOG_HUMAN_YEARS[size];
  if (ageMonths < 12) {
    return { kind: "under-one", atOneYear: row[0] };
  }
  if (ageMonths > DOG_TABLE_MAX_YEARS * 12) {
    return { kind: "beyond-table", atTableEnd: row[DOG_TABLE_MAX_YEARS - 1] };
  }
  const fullYears = Math.floor(ageMonths / 12);
  const extraMonths = ageMonths % 12;
  const lower = row[fullYears - 1];
  if (extraMonths === 0) {
    return { kind: "table", humanYears: lower, exact: true };
  }
  const upper = row[fullYears];
  return { kind: "table", humanYears: interpolate(extraMonths, 0, lower, 12, upper), exact: false };
}

/**
 * Epigenetska formula Wanga i sur. (2020.), izvedena na 104 labrador retrivera u rasponu od 16 godina.
 * Prikazujemo je samo od navršene prve do šesnaeste godine; izvan toga vraća null.
 */
export function epigeneticHumanYears(ageMonths: number): number | null {
  if (ageMonths < 12 || ageMonths > DOG_TABLE_MAX_YEARS * 12) {
    return null;
  }
  return 16 * Math.log(ageMonths / 12) + 31;
}

/** AAHA 2019: nagli rast završava između 6. i 9. mjeseca. */
export const PUPPY_END_MONTHS = { min: 6, max: 9 } as const;
/** AAHA 2019: tjelesna i socijalna zrelost nastupa između 3. i 4. godine. */
export const YOUNG_ADULT_END_MONTHS = { min: 36, max: 48 } as const;
/** AVMA 2023: dob (u godinama) u kojoj u prosjeku počinje seniorska dob, po veličini. */
export const SENIOR_START_YEARS: Record<DogSize, { min: number; max: number }> = {
  small: { min: 8, max: 11 },
  medium: { min: 8, max: 10 },
  large: { min: 8, max: 9 },
  giant: { min: 6, max: 7 },
};

export type DogLifeStage =
  | "puppy"
  | "puppy-or-young-adult"
  | "young-adult"
  | "young-or-mature-adult"
  | "mature-adult"
  | "mature-or-senior"
  | "senior";

/**
 * Životna faza prema AAHA-i i AVMA-i. Izvori granice daju kao raspone (ovise o pasmini),
 * pa dob unutar raspona vraća prijelaznu fazu umjesto lažno točne granice.
 */
export function dogLifeStage(size: DogSize, ageMonths: number): DogLifeStage {
  const senior = SENIOR_START_YEARS[size];
  if (ageMonths < PUPPY_END_MONTHS.min) {
    return "puppy";
  }
  if (ageMonths < PUPPY_END_MONTHS.max) {
    return "puppy-or-young-adult";
  }
  if (ageMonths < YOUNG_ADULT_END_MONTHS.min) {
    return "young-adult";
  }
  if (ageMonths < YOUNG_ADULT_END_MONTHS.max) {
    return "young-or-mature-adult";
  }
  if (ageMonths < senior.min * 12) {
    return "mature-adult";
  }
  if (ageMonths <= senior.max * 12) {
    return "mature-or-senior";
  }
  return "senior";
}
