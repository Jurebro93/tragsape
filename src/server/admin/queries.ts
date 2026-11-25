import "server-only";
import type { createSessionClient } from "@/server/supabase/session";

/**
 * Zajednički dijelovi adminovih upita. Svi upiti idu klijentom sa sesijom, pa i ovdje
 * odlučuje RLS: tko nije admin, ne dobiva ništa ni kad bi zaobišao stranicu.
 */

export type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

/** Redaka po stranici u adminovim popisima. */
export const PAGE_SIZE = 50;
/** Koliko redaka PostgREST vraća odjednom (`api.max_rows`). */
const CHUNK_SIZE = 1000;

type QueryError = { message: string } | null;

/**
 * Podaci upita ili bačena greška. Admin ne smije vidjeti „još nema ničega" kad upit
 * zapravo nije uspio.
 */
export function must<T>(result: { data: T | null; error: QueryError }, what: string): T {
  if (result.error || result.data === null) {
    throw new Error(`Admin (${what}): ${result.error?.message ?? "upit nije vratio podatke"}`);
  }
  return result.data;
}

/** Isto za upite koji samo broje (`head: true`). */
export function mustCount(result: { count: number | null; error: QueryError }, what: string): number {
  if (result.error || result.count === null) {
    throw new Error(`Admin (${what}): ${result.error?.message ?? "upit nije vratio broj"}`);
  }
  return result.count;
}

/** Čita sve retke upita, dio po dio, jer jedan odgovor vraća najviše 1000 redaka. */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: QueryError }>,
  what: string,
  maxRows = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += CHUNK_SIZE) {
    const chunk = must(await page(from, from + CHUNK_SIZE - 1), what);
    rows.push(...chunk);
    if (chunk.length < CHUNK_SIZE) {
      break;
    }
  }
  return rows;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Prva vrijednost parametra iz adrese, bez razmaka na rubovima. */
export function firstParam(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? "").trim();
}

/** Broj stranice iz adrese; sve neispravno je prva stranica. */
export function pageParam(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  if (!/^\d{1,5}$/.test(raw)) {
    return 1;
  }
  return Math.max(1, Number(raw));
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

export type MemorialRef = {
  id: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
};

/** Javna adresa spomena, samo ako je objavljen i javan. Za sve ostalo poveznice nema. */
export function publicMemorialPath(memorial: Pick<MemorialRef, "slug" | "status" | "visibility">): string | null {
  return memorial.status === "published" && memorial.visibility === "public" ? `/spomen/${memorial.slug}` : null;
}
