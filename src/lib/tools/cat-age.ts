import { interpolate } from "@/lib/tools/age";

/**
 * Mačje godine u ljudskima.
 *
 * Izvor (pristupljeno 25. 11. 2026.): International Cat Care, „How to tell your cat's age in
 * human years" (objavljeno 19. 6. 2024., ažurirano 28. 11. 2025.). Tablica daje vrijednosti za
 * 0–1, 2, 3, 4, 5, 6, 7, 12 i 18 mjeseci te za pune godine od 2 do 25; pravilo izvora:
 * prve dvije godine = 24 ljudske, svaka sljedeća = 4.
 */

/** Točke tablice za prve dvije godine: [dob mačke u mjesecima, ljudske godine]. */
export const CAT_EARLY_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 4],
  [4, 6],
  [5, 8],
  [6, 10],
  [7, 12],
  [12, 15],
  [18, 21],
  [24, 24],
];

/** Ljudskih godina za svaku mačju godinu nakon druge. */
export const CAT_YEARS_PER_YEAR_AFTER_TWO = 4;

export type CatAgeResult = {
  humanYears: number;
  /** True kad je vrijednost izravno iz tablice (ne računa se između dviju točaka). */
  exact: boolean;
};

export function catToHumanYears(ageMonths: number): CatAgeResult {
  if (ageMonths >= 24) {
    const humanYears = 24 + ((ageMonths - 24) * CAT_YEARS_PER_YEAR_AFTER_TWO) / 12;
    return { humanYears, exact: ageMonths % 12 === 0 };
  }
  for (let index = 0; index < CAT_EARLY_POINTS.length - 1; index += 1) {
    const [x0, y0] = CAT_EARLY_POINTS[index];
    const [x1, y1] = CAT_EARLY_POINTS[index + 1];
    if (ageMonths === x0) {
      return { humanYears: y0, exact: true };
    }
    if (ageMonths > x0 && ageMonths < x1) {
      return { humanYears: interpolate(ageMonths, x0, y0, x1, y1), exact: false };
    }
  }
  return { humanYears: 24, exact: true };
}

export type CatLifeStage = "kitten" | "junior" | "adult" | "mature" | "senior" | "super-senior";

/**
 * Šest životnih faza International Cat Carea. Rasponi su u izvoru zadani punim godinama
 * (npr. „3–6 godina"), pa faza traje do dana prije sljedećeg rođendana.
 */
export function catLifeStage(ageMonths: number): CatLifeStage {
  if (ageMonths <= 6) {
    return "kitten";
  }
  if (ageMonths < 3 * 12) {
    return "junior";
  }
  if (ageMonths < 7 * 12) {
    return "adult";
  }
  if (ageMonths < 11 * 12) {
    return "mature";
  }
  if (ageMonths < 15 * 12) {
    return "senior";
  }
  return "super-senior";
}
