import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DatePrecision } from "@/lib/format";
import { createAnonClient } from "@/server/supabase/anon";

/** Javni popisi: Livada, sat svijeća i obiteljska stranica. Sve čita anonimni klijent. */

export const LIVADA_PAGE_SIZE = 24;

const CARD_COLUMNS =
  "id, slug, name, species, breed, cover_photo_id, birth_date, birth_precision, death_date, death_precision, candle_count" as const;

export type MemorialCard = {
  id: string;
  slug: string;
  name: string;
  species: string | null;
  breed: string | null;
  coverPhotoId: string | null;
  birthDate: string | null;
  birthPrecision: DatePrecision;
  deathDate: string | null;
  deathPrecision: DatePrecision;
  candleCount: number;
};

type CardRow = {
  id: string;
  slug: string;
  name: string;
  species: string | null;
  breed: string | null;
  cover_photo_id: string | null;
  birth_date: string | null;
  birth_precision: string;
  death_date: string | null;
  death_precision: string;
  candle_count: number;
};

function toCard(row: CardRow): MemorialCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    species: row.species,
    breed: row.breed,
    coverPhotoId: row.cover_photo_id,
    birthDate: row.birth_date,
    birthPrecision: row.birth_precision as DatePrecision,
    deathDate: row.death_date,
    deathPrecision: row.death_precision as DatePrecision,
    candleCount: row.candle_count,
  };
}

/** Javni objavljeni memorijali, najnoviji prvi, uz neobavezan filtar po vrsti i pasmini. */
export async function listLivada(
  species: string | null,
  breed: string | null,
  page: number,
): Promise<{ items: MemorialCard[]; hasMore: boolean }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("livada");
  const from = page * LIVADA_PAGE_SIZE;
  let query = createAnonClient()
    .from("memorials")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .range(from, from + LIVADA_PAGE_SIZE);
  if (species) {
    query = query.eq("species", species);
  }
  if (breed) {
    // Točno podudaranje bez obzira na velika slova; znakovi uzorka se ne tumače.
    query = query.ilike("breed", breed.replace(/[\\%_]/g, (char) => `\\${char}`));
  }
  const { data } = await query;
  const rows = data ?? [];
  return { items: rows.slice(0, LIVADA_PAGE_SIZE).map(toCard), hasMore: rows.length > LIVADA_PAGE_SIZE };
}

export async function listLivadaBreeds(species: string | null): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("livada");
  const { data } = await createAnonClient().rpc("livada_breeds", species ? { p_species: species } : {});
  return (data ?? []).map((row) => row.breed);
}

export type EveningCandle = {
  slug: string;
  name: string;
  species: string | null;
  breed: string | null;
  coverPhotoId: string | null;
  candles: number;
};

/** Svijeće upaljene od zadanog trenutka. Ključ predmemorije je taj trenutak, pa svaka večer ima svoj zapis. */
export async function getEveningCandles(sinceIso: string): Promise<EveningCandle[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = await createAnonClient().rpc("evening_candles", { p_since: sinceIso, p_limit: 60 });
  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    species: row.species,
    breed: row.breed,
    coverPhotoId: row.cover_photo_id,
    candles: Number(row.candles),
  }));
}

export type FamilyPage = { title: string; intro: string | null; slug: string; memorials: MemorialCard[] };

/** Javna obiteljska stranica sa svim javnim objavljenim memorijalima tog računa. */
export async function getFamilyBySlug(slug: string): Promise<FamilyPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`family:${slug}`);
  cacheTag("livada");
  const client = createAnonClient();
  const { data: family } = await client
    .from("families")
    .select("owner_id, slug, title, intro, is_public")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!family) {
    return null;
  }
  const { data } = await client
    .from("memorials")
    .select(CARD_COLUMNS)
    .eq("owner_id", family.owner_id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("death_date", { ascending: false, nullsFirst: false });
  return { title: family.title, intro: family.intro, slug: family.slug, memorials: (data ?? []).map(toCard) };
}
