/** Sva vremenska logika računa se u hrvatskoj vremenskoj zoni. */
export const TIME_ZONE = "Europe/Zagreb";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Današnji datum u Zagrebu kao YYYY-MM-DD. */
export function zagrebDay(now: Date = new Date()): string {
  return dayFormat.format(now);
}

/** Pomak zone u minutama za zadani trenutak (ljeti 120, zimi 60). */
function zoneOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Trenutak u kojem je u Zagrebu počeo dan (ponoć) koji sadrži `now`. */
export function zagrebDayStart(now: Date = new Date()): Date {
  const [year, month, day] = zagrebDay(now).split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return new Date(guess.getTime() - zoneOffsetMinutes(guess) * 60000);
}
