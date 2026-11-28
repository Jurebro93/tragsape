import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isArticleStatus,
  isCluster,
  isCtaSlot,
  isCtaVariant,
  type ArticleSource,
  type ArticleView,
  type CtaBlockData,
  type CtaSlot,
} from "@/lib/content/types";
import type { Database } from "@/server/supabase/database.types";

/**
 * Učitavanje jednog članka za prikaz: tekst, izvori po redu i prodajne sekcije po mjestima.
 * Isti kod služi javnoj stranici (anonimni klijent, predmemorirano) i pregledu nacrta u adminu
 * (klijent sa sesijom), pa obje prikazuju isto. Što se smije vidjeti, odlučuje RLS.
 */

type Client = SupabaseClient<Database>;

const ARTICLE_COLUMNS =
  "id, slug, locale, cluster, title, excerpt, body_md, status, seo_title, seo_description, published_at, updated_at, needs_vet_review, vet_reviewed_by, vet_reviewed_at, animals" as const;

export const SOURCE_COLUMNS = "id, position, claim, title, url, publisher, accessed_on" as const;

export type ArticleLookup = { slug: string; publishedOnly: true } | { id: string };

export async function loadArticleView(client: Client, lookup: ArticleLookup): Promise<ArticleView | null> {
  let query = client.from("articles").select(ARTICLE_COLUMNS).eq("locale", "hr");
  query =
    "slug" in lookup
      ? query.eq("slug", lookup.slug).eq("status", "published")
      : query.eq("id", lookup.id);
  const { data: row, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Članak se ne može pročitati: ${error.message}`);
  }
  if (!row || !isCluster(row.cluster) || !isArticleStatus(row.status)) {
    return null;
  }

  const [sources, slots] = await Promise.all([
    client
      .from("article_sources")
      .select(SOURCE_COLUMNS)
      .eq("article_id", row.id)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from("article_cta")
      .select("slot, cta_key, block:cta_blocks(key, heading, body, button_label, target, variant, active)")
      .eq("article_id", row.id),
  ]);
  if (sources.error) {
    throw new Error(`Izvori članka se ne mogu pročitati: ${sources.error.message}`);
  }
  if (slots.error) {
    throw new Error(`Prodajne sekcije članka se ne mogu pročitati: ${slots.error.message}`);
  }

  const cta: Partial<Record<CtaSlot, CtaBlockData>> = {};
  for (const entry of slots.data) {
    const block = entry.block;
    // Isključena sekcija se ne prikazuje ni adminu u pregledu: pregled mora izgledati kao javna stranica.
    if (!block || !block.active || !isCtaSlot(entry.slot) || !isCtaVariant(block.variant)) {
      continue;
    }
    cta[entry.slot] = {
      key: block.key,
      heading: block.heading,
      body: block.body,
      buttonLabel: block.button_label,
      target: block.target,
      variant: block.variant,
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    cluster: row.cluster,
    title: row.title,
    excerpt: row.excerpt,
    bodyMd: row.body_md,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    needsVetReview: row.needs_vet_review,
    vetReviewedBy: row.vet_reviewed_by,
    vetReviewedAt: row.vet_reviewed_at,
    animals: row.animals,
    sources: sources.data.map(
      (source): ArticleSource => ({
        id: source.id,
        claim: source.claim,
        title: source.title,
        url: source.url,
        publisher: source.publisher,
        accessedOn: source.accessed_on,
      }),
    ),
    cta,
  };
}
