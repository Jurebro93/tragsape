import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isCluster, type ArticleSummary, type ArticleView } from "@/lib/content/types";
import { loadArticleView } from "@/server/content/view";
import { createAnonClient } from "@/server/supabase/anon";

/**
 * Javno čitanje članaka. Sve ide anonimnim klijentom (RLS propušta samo objavljeno) i
 * predmemorira se, pa stranice vodiča ostaju statične. Admin nakon svake izmjene osvježava
 * oznake `articles` i `article:{slug}`, pa se promjena vidi bez deploya.
 *
 * Greška baze se baca, a ne pretvara u „nema članka": tako se prazna stranica nikad ne predmemorira.
 */

export type { ArticleSummary, ArticleView };

export function articleTag(slug: string): string {
  return `article:${slug}`;
}

/** Objavljeni članci, najnoviji prvi. */
export async function listPublishedArticles(): Promise<ArticleSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");

  const { data, error } = await createAnonClient()
    .from("articles")
    .select("id, slug, cluster, title, excerpt, published_at")
    .eq("status", "published")
    .eq("locale", "hr")
    .order("published_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Članci se ne mogu pročitati: ${error.message}`);
  }
  return data.flatMap((row) =>
    isCluster(row.cluster)
      ? [
          {
            id: row.id,
            slug: row.slug,
            cluster: row.cluster,
            title: row.title,
            excerpt: row.excerpt,
            publishedAt: row.published_at,
          },
        ]
      : [],
  );
}

/**
 * Objavljeni članak s izvorima i prodajnim sekcijama, ili null. Nosi i opću oznaku `articles`:
 * tako se i odgovor „nema ga" osvježi kad se članak objavi, a izmjena sekcije dođe do svih članaka.
 */
export async function getPublishedArticle(slug: string): Promise<ArticleView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", articleTag(slug));

  return loadArticleView(createAnonClient(), { slug, publishedOnly: true });
}

export type ArticleSitemapEntry = { slug: string; updatedAt: string };

/** Adrese objavljenih članaka za sitemap. */
export async function listPublishedArticleSlugs(): Promise<ArticleSitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "sitemap");

  const { data, error } = await createAnonClient()
    .from("articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("locale", "hr")
    .order("published_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Članci za sitemap se ne mogu pročitati: ${error.message}`);
  }
  return data.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
