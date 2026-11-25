import "server-only";
import {
  CTA_SLOTS,
  isArticleStatus,
  isCluster,
  isCtaSlot,
  isCtaVariant,
  type ArticleStatus,
  type ArticleView,
  type Cluster,
  type CtaSlot,
  type CtaVariant,
} from "@/lib/content/types";
import { isUuid } from "@/lib/content/limits";
import { loadArticleView, SOURCE_COLUMNS } from "@/server/content/view";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Čitanje za admin: članci u svim stanjima i sve prodajne sekcije. Ide klijentom sa sesijom, pa
 * retke izvan objavljenog vraća samo adminu (RLS); stranica koja ovo zove prvo zove `requireAdmin()`.
 * Ništa se ne predmemorira.
 */

export type AdminArticleRow = {
  id: string;
  slug: string;
  cluster: Cluster | null;
  title: string;
  status: ArticleStatus;
  needsVetReview: boolean;
  vetReviewedAt: string | null;
  updatedAt: string;
};

export async function listArticlesForAdmin(): Promise<AdminArticleRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, cluster, title, status, needs_vet_review, vet_reviewed_at, updated_at")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Članci se ne mogu pročitati: ${error.message}`);
  }
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    cluster: isCluster(row.cluster) ? row.cluster : null,
    title: row.title,
    status: isArticleStatus(row.status) ? row.status : "draft",
    needsVetReview: row.needs_vet_review,
    vetReviewedAt: row.vet_reviewed_at,
    updatedAt: row.updated_at,
  }));
}

export type EditableSource = {
  id: string;
  claim: string;
  title: string;
  url: string;
  publisher: string;
  accessedOn: string;
};

export type EditableArticle = {
  id: string;
  slug: string;
  cluster: Cluster;
  title: string;
  excerpt: string;
  bodyMd: string;
  seoTitle: string;
  seoDescription: string;
  status: ArticleStatus;
  needsVetReview: boolean;
  vetReviewedBy: string | null;
  vetReviewedAt: string | null;
  ownerApprovedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  sources: EditableSource[];
  cta: Record<CtaSlot, string | null>;
};

export async function getArticleForEdit(id: string): Promise<EditableArticle | null> {
  if (!isUuid(id)) {
    return null;
  }
  const supabase = await createSessionClient();
  const [article, sources, slots] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id, slug, cluster, title, excerpt, body_md, seo_title, seo_description, status, needs_vet_review, vet_reviewed_by, vet_reviewed_at, owner_approved_at, published_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("article_sources")
      .select(SOURCE_COLUMNS)
      .eq("article_id", id)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("article_cta").select("slot, cta_key").eq("article_id", id),
  ]);
  if (article.error || sources.error || slots.error) {
    const message = article.error?.message ?? sources.error?.message ?? slots.error?.message;
    throw new Error(`Članak se ne može pročitati: ${message}`);
  }
  const row = article.data;
  if (!row || !isCluster(row.cluster) || !isArticleStatus(row.status)) {
    return null;
  }
  const cta = Object.fromEntries(CTA_SLOTS.map((slot) => [slot, null])) as Record<CtaSlot, string | null>;
  for (const entry of slots.data) {
    if (isCtaSlot(entry.slot)) {
      cta[entry.slot] = entry.cta_key;
    }
  }
  return {
    id: row.id,
    slug: row.slug,
    cluster: row.cluster,
    title: row.title,
    excerpt: row.excerpt ?? "",
    bodyMd: row.body_md,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    status: row.status,
    needsVetReview: row.needs_vet_review,
    vetReviewedBy: row.vet_reviewed_by,
    vetReviewedAt: row.vet_reviewed_at,
    ownerApprovedAt: row.owner_approved_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    sources: sources.data.map((source) => ({
      id: source.id,
      claim: source.claim ?? "",
      title: source.title,
      url: source.url,
      publisher: source.publisher ?? "",
      accessedOn: source.accessed_on,
    })),
    cta,
  };
}

/** Nacrt ili objavljeni članak onako kako bi izgledao na javnoj stranici. */
export async function getArticlePreview(id: string): Promise<ArticleView | null> {
  if (!isUuid(id)) {
    return null;
  }
  return loadArticleView(await createSessionClient(), { id });
}

export type AdminCtaBlock = {
  key: string;
  heading: string;
  body: string | null;
  buttonLabel: string;
  target: string;
  variant: CtaVariant;
  active: boolean;
  /** Broj članaka kojima je sekcija dodijeljena. */
  articleCount: number;
};

export async function listCtaBlocksForAdmin(): Promise<AdminCtaBlock[]> {
  const supabase = await createSessionClient();
  const [blocks, usage] = await Promise.all([
    supabase
      .from("cta_blocks")
      .select("key, heading, body, button_label, target, variant, active")
      .order("key", { ascending: true }),
    supabase.from("article_cta").select("article_id, cta_key"),
  ]);
  if (blocks.error || usage.error) {
    throw new Error(`Prodajne sekcije se ne mogu pročitati: ${blocks.error?.message ?? usage.error?.message}`);
  }
  const articlesByKey = new Map<string, Set<string>>();
  for (const entry of usage.data) {
    const articles = articlesByKey.get(entry.cta_key) ?? new Set<string>();
    articles.add(entry.article_id);
    articlesByKey.set(entry.cta_key, articles);
  }
  return blocks.data.map((row) => ({
    key: row.key,
    heading: row.heading,
    body: row.body,
    buttonLabel: row.button_label,
    target: row.target,
    variant: isCtaVariant(row.variant) ? row.variant : "butter",
    active: row.active,
    articleCount: articlesByKey.get(row.key)?.size ?? 0,
  }));
}

export type CtaOption = { key: string; heading: string; active: boolean };

/** Sekcije za izbornike u uređivaču članka. */
export async function listCtaOptions(): Promise<CtaOption[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("cta_blocks")
    .select("key, heading, active")
    .order("heading", { ascending: true });
  if (error) {
    throw new Error(`Prodajne sekcije se ne mogu pročitati: ${error.message}`);
  }
  return data;
}
