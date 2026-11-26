/** Tipovi sadržaja (članci, izvori, prodajne sekcije) dijeljeni između poslužitelja i sučelja. */

export const CLUSTERS = ["zdravlje", "kraj-zivota", "nakon-smrti", "tugovanje", "prigodni-datumi"] as const;
export type Cluster = (typeof CLUSTERS)[number];

export function isCluster(value: string): value is Cluster {
  return (CLUSTERS as readonly string[]).includes(value);
}

export const ARTICLE_STATUSES = ["draft", "in_review", "approved", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export function isArticleStatus(value: string): value is ArticleStatus {
  return (ARTICLE_STATUSES as readonly string[]).includes(value);
}

/** Mjesta u članku na kojima smije stajati prodajna sekcija; najviše jedna po mjestu. */
export const CTA_SLOTS = ["after_intro", "middle", "end"] as const;
export type CtaSlot = (typeof CTA_SLOTS)[number];

export function isCtaSlot(value: string): value is CtaSlot {
  return (CTA_SLOTS as readonly string[]).includes(value);
}

/** Naziv polja sekcije za zadano mjesto u obrascu članka. */
export function ctaFieldName(slot: CtaSlot): string {
  return `cta_${slot}`;
}

export const CTA_VARIANTS = ["butter", "mint", "plum"] as const;
export type CtaVariant = (typeof CTA_VARIANTS)[number];

export function isCtaVariant(value: string): value is CtaVariant {
  return (CTA_VARIANTS as readonly string[]).includes(value);
}

export type ArticleSummary = {
  id: string;
  slug: string;
  cluster: Cluster;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type ArticleSource = {
  id: string;
  claim: string | null;
  title: string;
  url: string;
  publisher: string | null;
  /** Datum pristupa, YYYY-MM-DD. */
  accessedOn: string;
};

export type CtaBlockData = {
  key: string;
  heading: string;
  body: string | null;
  buttonLabel: string;
  target: string;
  variant: CtaVariant;
};

/** Sve što treba za prikaz jednog članka: tekst, izvori i prodajne sekcije po mjestima. */
export type ArticleView = {
  id: string;
  slug: string;
  cluster: Cluster;
  title: string;
  excerpt: string | null;
  bodyMd: string;
  status: ArticleStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  /** Zdravstvena tema: dok nema pregleda veterinara, stranica prikazuje napomenu. */
  needsVetReview: boolean;
  vetReviewedBy: string | null;
  vetReviewedAt: string | null;
  sources: ArticleSource[];
  cta: Partial<Record<CtaSlot, CtaBlockData>>;
};
