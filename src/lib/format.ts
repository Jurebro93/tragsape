import { plural } from "@/lib/text";

export type DatePrecision = "day" | "month" | "year";

const fullDate = new Intl.DateTimeFormat("hr-HR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("hr-HR", { month: "long", year: "numeric", timeZone: "UTC" });

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

/** Datum iz baze (YYYY-MM-DD) prikazan onoliko točno koliko vlasnik zna. */
export function formatPetDate(value: string | null, precision: DatePrecision = "day"): string | null {
  if (!value) {
    return null;
  }
  const date = parseIsoDate(value);
  if (precision === "year") {
    return `${date.getUTCFullYear()}.`;
  }
  if (precision === "month") {
    return monthYear.format(date);
  }
  return fullDate.format(date);
}

/** Raspon života: „14. ožujka 2012. – 2. listopada 2026." */
export function formatLifespan(
  birth: { date: string | null; precision: DatePrecision },
  death: { date: string | null; precision: DatePrecision },
): string | null {
  const from = formatPetDate(birth.date, birth.precision);
  const to = formatPetDate(death.date, death.precision);
  if (from && to) {
    return `${from} – ${to}`;
  }
  return from ?? to;
}

/** Navršene godine između dva datuma, ili null ako se ne mogu pouzdano izračunati. */
export function yearsBetween(birth: string | null, death: string | null): number | null {
  if (!birth || !death) {
    return null;
  }
  const from = parseIsoDate(birth);
  const to = parseIsoDate(death);
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeBirthday =
    to.getUTCMonth() < from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  if (beforeBirthday) {
    years -= 1;
  }
  return years >= 0 ? years : null;
}

export function formatYears(years: number): string {
  return plural(years, { one: "godina", few: "godine", other: "godina" });
}

/** Datum i vrijeme događaja (poruka, narudžba) u hrvatskoj zoni. */
export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zagreb",
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** Iznos u centima kao „19,00 €". */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
