import { z } from "zod";
import type { DatePrecision } from "@/lib/format";
import { SPECIES_KEYS } from "@/lib/species";
import { DEDICATION_MAX } from "@/lib/memorial";
import { parseVideoUrl } from "@/lib/video";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export type DateParts = { day?: string; month?: string; year?: string };
export type ParsedDate = { date: string | null; precision: DatePrecision };

/**
 * Datum iz tri polja. Vlasnik često zna samo godinu ili mjesec, pa se sprema i preciznost.
 * Vraća grešku za nemoguć datum, datum u budućnosti ili godinu prije 1950.
 */
export function parseDateParts(parts: DateParts, now: Date = new Date()): ParsedDate | { error: string } {
  const year = (parts.year ?? "").trim();
  const month = (parts.month ?? "").trim();
  const day = (parts.day ?? "").trim();
  if (year === "" && month === "" && day === "") {
    return { date: null, precision: "day" };
  }
  if (!/^\d{4}$/.test(year)) {
    return { error: "Upiši godinu s četiri znamenke." };
  }
  const y = Number(year);
  if (y < 1950 || y > now.getFullYear()) {
    return { error: "Provjeri godinu." };
  }
  if (month === "") {
    if (day !== "") {
      return { error: "Uz dan odaberi i mjesec." };
    }
    return { date: `${year}-01-01`, precision: "year" };
  }
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return { error: "Provjeri mjesec." };
  }
  const mm = String(m).padStart(2, "0");
  if (day === "") {
    return { date: `${year}-${mm}-01`, precision: "month" };
  }
  const d = Number(day);
  const candidate = new Date(Date.UTC(y, m - 1, d));
  if (!Number.isInteger(d) || candidate.getUTCMonth() !== m - 1 || candidate.getUTCDate() !== d) {
    return { error: "Taj datum ne postoji." };
  }
  if (candidate.getTime() > now.getTime()) {
    return { error: "Datum ne može biti u budućnosti." };
  }
  return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, precision: "day" };
}

/** Obrnuto: datum iz baze u tri polja obrasca. */
export function toDateParts(date: string | null, precision: DatePrecision): Required<DateParts> {
  if (!date) {
    return { day: "", month: "", year: "" };
  }
  const [year, month, day] = date.split("-");
  return {
    year,
    month: precision === "year" ? "" : String(Number(month)),
    day: precision === "day" ? String(Number(day)) : "",
  };
}

export const petBasicsSchema = z.object({
  name: z.string().trim().min(1, "Upiši ime ljubimca.").max(60),
  species: z.enum(SPECIES_KEYS, "Odaberi vrstu."),
  breed: optionalText(80),
  sex: z
    .enum(["m", "z", ""])
    .transform((value) => (value === "" ? null : value))
    .optional(),
});

const stringList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    .transform((items) => Array.from(new Set(items)));

/** Polja drugog koraka. Sva su neobavezna; sprema se samo ono što je poslano. */
export const storyPatchSchema = z
  .object({
    dedication: optionalText(DEDICATION_MAX),
    story_md: optionalText(20000),
    nicknames: stringList(8, 40),
    traits: stringList(12, 40),
    favorite_toy: optionalText(120),
    favorite_treat: optionalText(120),
    favorite_place: optionalText(120),
    funny_habits: optionalText(600),
    video_url: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === "" || isSupportedVideoUrl(value), "Podržane su poveznice s YouTubea i Vimea.")
      .transform((value) => (value === "" ? null : value))
      .nullable(),
    guestbook_mode: z.enum(["premoderate", "open", "off"]),
  })
  .partial();

export type StoryPatch = z.infer<typeof storyPatchSchema>;

/**
 * Video je samo poveznica; ugrađujemo jedino YouTube i Vimeo. Prolazi samo poveznica koju stranica
 * spomena zna prikazati, pa vlasnik ne može spremiti video koji se posjetiteljima ne bi vidio.
 */
export function isSupportedVideoUrl(value: string): boolean {
  return parseVideoUrl(value) !== null;
}

export const emailSchema = z.email("Provjeri e-mail adresu.").max(254);

export const guestbookSchema = z.object({
  memorialId: z.uuid(),
  name: z.string().trim().min(1, "Upiši svoje ime.").max(60),
  message: z.string().trim().min(2, "Napiši poruku.").max(1000),
  email: z.union([z.literal(""), emailSchema]).optional(),
  shareKey: z.string().max(64).nullable().optional(),
  // Zamka za robote: ljudi ovo polje ne vide i ostavljaju ga praznim.
  website: z.string().max(0).optional(),
  /** Koliko je obrazac bio otvoren; mjeri preglednik, pa sat uređaja ne smeta. */
  elapsedMs: z.number().int().min(0),
});

export const reportSchema = z.object({
  targetType: z.enum(["memorial", "guestbook_entry", "gesture", "photo"]),
  targetId: z.uuid(),
  memorialId: z.uuid(),
  reason: z.enum(["neprimjereno", "spam", "tudji_sadrzaj", "drugo"]),
  details: z.string().trim().max(1000).optional(),
  email: z.union([z.literal(""), emailSchema]).optional(),
  website: z.string().max(0).optional(),
});
