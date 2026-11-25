import type { ArticleSummary, Cluster } from "@/lib/content/types";

/** Povezani članci: objavljeni iz iste teme, bez samog članka, redom kojim su zadani (najnoviji prvi). */
export function pickRelated(
  published: readonly ArticleSummary[],
  current: { id: string; cluster: Cluster },
  limit = 3,
): ArticleSummary[] {
  return published
    .filter((article) => article.cluster === current.cluster && article.id !== current.id)
    .slice(0, limit);
}
