import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { isIndexable } from "@/lib/indexing";
import { LEGAL_DRAFT } from "@/messages/hr/legal";
import { env } from "@/server/env";
import { createAnonClient } from "@/server/supabase/anon";

/** Javne stranice bez parametara. Nova javna stranica dodaje se ovdje. */
const STATIC_PATHS = ["/", "/livada", "/primjer", "/cjenik", "/donacije"] as const;
/** Pravni tekstovi ulaze u sitemap tek kad prestanu biti nacrt. */
const LEGAL_PATHS = ["/uvjeti", "/privatnost", "/kolacici"] as const;

const PAGE_SIZE = 500;
/** Jedan sitemap smije imati 50 000 adresa; iznad ovoga treba prijeći na `generateSitemaps`. */
const MAX_MEMORIALS = 45_000;

type SitemapMemorial = { slug: string; updatedAt: string };

/**
 * Javni spomeni koji se nude tražilicama. Čita se anonimnim klijentom, pa RLS već propušta
 * samo objavljene javne spomene; uvjeti se ipak ponavljaju u upitu i u `isIndexable`,
 * da spomen „samo s poveznicom” ili privatni ne može ući ni ako se jedno od toga promijeni.
 */
async function getIndexableMemorials(): Promise<SitemapMemorial[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sitemap");

  const supabase = createAnonClient();
  const memorials: SitemapMemorial[] = [];

  for (let from = 0; from < MAX_MEMORIALS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("memorials")
      .select("slug, status, tier, visibility, cover_photo_id, dedication, story_md, updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .not("cover_photo_id", "is", null)
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Spomeni za sitemap se ne mogu pročitati: ${error.message}`);
    }

    for (const row of data) {
      // Priča se na besplatnom spomenu ne prikazuje, pa se ne broji ni ovdje;
      // isto pravilo koristi robots meta na stranici spomena.
      const indexable = isIndexable({
        status: row.status,
        visibility: row.visibility,
        cover_photo_id: row.cover_photo_id,
        dedication: row.dedication,
        story_md: row.tier === "free" ? null : row.story_md,
      });
      if (indexable) {
        memorials.push({ slug: row.slug, updatedAt: row.updated_at });
      }
    }

    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return memorials;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const paths = LEGAL_DRAFT ? STATIC_PATHS : [...STATIC_PATHS, ...LEGAL_PATHS];
  const memorials = await getIndexableMemorials();

  return [
    ...paths.map((path) => ({ url: path === "/" ? base : `${base}${path}` })),
    ...memorials.map((memorial) => ({
      url: `${base}/spomen/${memorial.slug}`,
      lastModified: memorial.updatedAt,
    })),
  ];
}
