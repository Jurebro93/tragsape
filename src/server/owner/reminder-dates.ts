import "server-only";

/**
 * Čista logika datuma za podsjetnike: koji se datumi obilježavaju na zadani dan.
 * Dan se uvijek zadaje kao YYYY-MM-DD u zoni Europe/Zagreb (vidi `zagrebDay`).
 */

export type ReminderKind = "birthday" | "adoption" | "anniversary";

export type ReminderDates = {
  birth_date: string | null;
  birth_precision: string;
  adoption_date: string | null;
  death_date: string | null;
  death_precision: string;
};

/** Najranija godina koju obrasci primaju (vidi `parseDateParts`). */
export const EARLIEST_YEAR = 1950;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Mjesec i dan (MM-DD) koji se obilježavaju na dan `today`. Uz sam dan to je i 29. veljače,
 * kad je danas 28. veljače u godini koja nema 29.
 */
export function monthDaysFor(today: string): string[] {
  const year = Number(today.slice(0, 4));
  const monthDay = today.slice(5, 10);
  if (monthDay === "02-28" && !isLeapYear(year)) {
    return ["02-28", "02-29"];
  }
  return [monthDay];
}

/**
 * Pada li godišnjica datuma `date` na `today`? Sam dan događaja se ne računa: podsjetnik
 * počinje tek sljedeće godine.
 */
export function isAnniversaryOn(date: string | null, today: string): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return false;
  }
  if (Number(date.slice(0, 4)) >= Number(today.slice(0, 4))) {
    return false;
  }
  return monthDaysFor(today).includes(date.slice(5, 10));
}

/**
 * Podsjetnici koji danas vrijede za jedan spomen. Rođenje i odlazak računaju se samo kad je
 * poznat točan dan; dan dolaska u obitelj uvijek je cijeli datum.
 */
export function dueKinds(memorial: ReminderDates, today: string): ReminderKind[] {
  const kinds: ReminderKind[] = [];
  if (memorial.birth_precision === "day" && isAnniversaryOn(memorial.birth_date, today)) {
    kinds.push("birthday");
  }
  if (isAnniversaryOn(memorial.adoption_date, today)) {
    kinds.push("adoption");
  }
  if (memorial.death_precision === "day" && isAnniversaryOn(memorial.death_date, today)) {
    kinds.push("anniversary");
  }
  return kinds;
}

/**
 * Svi datumi čija godišnjica pada na `today`, od najranije godine do prošle. Služi kao filtar
 * u upitu, jer se u upitu ne može uspoređivati samo mjesec i dan.
 */
export function candidateDates(today: string, fromYear: number = EARLIEST_YEAR): string[] {
  const year = Number(today.slice(0, 4));
  const dates: string[] = [];
  for (const monthDay of monthDaysFor(today)) {
    for (let candidate = fromYear; candidate < year; candidate += 1) {
      if (monthDay === "02-29" && !isLeapYear(candidate)) {
        continue;
      }
      dates.push(`${candidate}-${monthDay}`);
    }
  }
  return dates;
}
