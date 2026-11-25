import "server-only";
import { zagrebDay, zagrebDayStart } from "@/lib/time";

/**
 * Zajednički alati adminovih obrazaca: stanje akcije, čitanje polja i pretvorbe.
 * Sve što dolazi iz obrasca smatra se nepouzdanim, i kad ga šalje admin.
 */

/** Stanje koje poslužiteljska akcija vraća obrascu. */
export type AdminActionState = { error: string | null; done?: boolean };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Tekst polja bez razmaka na rubovima. Nepostojeće polje i datoteka daju prazan niz. */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Iznos u eurima kako ga admin upiše („19", „19,9", „19.90", „19 €") pretvoren u cente.
 * Razdjelnici tisućica se ne prihvaćaju, da „1.234" nikad ne bude protumačeno pogrešno.
 */
export function parseEuroToCents(value: string): number | null {
  const cleaned = value.replace(/[\s€]/g, "");
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** Centi za polje obrasca: 1990 → „19,90". */
export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Cijeli nenegativan broj unutar raspona, ili null. */
export function parseInteger(value: string, min: number, max: number): number | null {
  if (!/^\d{1,9}$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

/** Datum iz polja za datum (YYYY-MM-DD), samo ako takav dan postoji. */
export function parseDay(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return value;
}

/** Podne po UTC-u uvijek pada u isti kalendarski dan u Zagrebu. */
function noonUtc(day: string, addDays = 0): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + addDays, 12));
}

/** Trenutak u kojem zadani dan počinje u Zagrebu. */
export function zagrebDayStartIso(day: string): string {
  return zagrebDayStart(noonUtc(day)).toISOString();
}

/** Posljednja milisekunda zadanog dana u Zagrebu („vrijedi do, uključivo"). */
export function zagrebDayEndIso(day: string): string {
  return new Date(zagrebDayStart(noonUtc(day, 1)).getTime() - 1).toISOString();
}

/** Trenutak iz baze kao dan u Zagrebu, za polje obrasca. Prazno ako ga nema. */
export function isoToZagrebDay(value: string | null): string {
  return value ? zagrebDay(new Date(value)) : "";
}

/**
 * Adresa spomena iz onoga što admin zalijepi: sama adresa („medo-3f9a1c") ili cijela poveznica.
 * Vraća prazan niz ako u unosu nema ničega što može biti adresa.
 */
export function slugFromInput(input: string): string {
  let value = input.trim().toLowerCase();
  const marker = value.lastIndexOf("/spomen/");
  if (marker !== -1) {
    value = value.slice(marker + "/spomen/".length);
  }
  value = value.split(/[?#]/)[0].replace(/\/+$/, "");
  value = value.slice(value.lastIndexOf("/") + 1);
  return /^[a-z0-9-]{1,80}$/.test(value) ? value : "";
}

// ---------------------------------------------------------------------------------------------
// Dokazi o isplati donacija
// ---------------------------------------------------------------------------------------------

export const PROOF_BUCKET = "donation-proofs";
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export type ProofType = { contentType: string; extension: string };

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Vrsta datoteke prema njezinim prvim bajtovima, a ne prema imenu ili onome što javi preglednik.
 * Vraća null za sve što nije PDF, JPEG, PNG ili WebP.
 */
export function sniffProofType(bytes: Uint8Array): ProofType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { contentType: "application/pdf", extension: "pdf" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

/**
 * Ime datoteke sigurno za putanju u pohrani: mala slova bez dijakritike, brojke i crtice,
 * s nastavkom prema stvarnoj vrsti datoteke.
 */
export function sanitizeFilename(name: string, extension: string): string {
  const base = name
    .replace(/\.[^./\\]*$/, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base || "dokaz"}.${extension}`;
}
