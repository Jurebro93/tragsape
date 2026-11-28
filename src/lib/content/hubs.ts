import type { ArticleSummary, Cluster } from "@/lib/content/types";

/**
 * Stranice „Zdravstveni problemi kod pasa” i „… kod mačaka”: svi članci o zdravlju jedne životinje
 * na jednom mjestu, složeni po područjima. Članak ulazi po oznaci životinje (polje `animals`), a u
 * područje po riječima iz adrese, pa novi članci dolaze na svoje mjesto sami.
 */

export const HUBS = ["zdravlje-pasa", "zdravlje-macaka"] as const;
export type Hub = (typeof HUBS)[number];

export const HUB_ANIMAL: Record<Hub, "pas" | "macka"> = { "zdravlje-pasa": "pas", "zdravlje-macaka": "macka" };

/** Teme Vodiča koje ulaze na stranicu zdravlja: zdravlje, te starost i kraj života. */
const HUB_CLUSTERS: readonly Cluster[] = ["zdravlje", "kraj-zivota"];

export const HUB_GROUPS = ["hitno", "paraziti", "prevencija", "koza", "otrovi", "starost", "ostalo"] as const;
export type HubGroup = (typeof HUB_GROUPS)[number];

const GROUP_MATCH: Record<Exclude<HubGroup, "ostalo">, RegExp> = {
  hitno: /povraca|proljev|zatvor|gastritis|pankreatitis|torzija|ne-jede|hitna/,
  paraziti: /krpelj|buhe|glist|parazit|lismanioz|babezioz|srcani-crv|zastita-od/,
  prevencija: /cijeplj|cipiranje|putovnica|steriliz|pregled|cjenik/,
  koza: /koze|uha|zubi|kamenc/,
  otrovi: /otrovn/,
  starost: /stari|stara|umire|uspavlj|odluciti|posljednji|koliko-zive|godine|suplement/,
};

export function hubPath(hub: Hub): string {
  return `/vodic/${hub}`;
}

export function isHub(value: string): value is Hub {
  return (HUBS as readonly string[]).includes(value);
}

/** Članci stranice, po područjima; područja bez članaka se izostavljaju. */
export function hubGroups(hub: Hub, articles: ArticleSummary[]): Array<{ group: HubGroup; articles: ArticleSummary[] }> {
  const animal = HUB_ANIMAL[hub];
  const own = articles.filter((article) => HUB_CLUSTERS.includes(article.cluster) && article.animals.includes(animal));
  const groups = new Map<HubGroup, ArticleSummary[]>(HUB_GROUPS.map((group) => [group, []]));
  for (const article of own) {
    const group = (Object.keys(GROUP_MATCH) as Array<Exclude<HubGroup, "ostalo">>).find((key) => GROUP_MATCH[key].test(article.slug)) ?? "ostalo";
    groups.get(group)?.push(article);
  }
  return HUB_GROUPS.map((group) => ({ group, articles: groups.get(group) ?? [] })).filter((entry) => entry.articles.length > 0);
}

/** Stranice zdravlja na koje članak pripada (za poveznicu na dnu zdravstvenih članaka). */
export function hubsForArticle(article: { cluster: Cluster; animals: string[] }): Hub[] {
  if (!HUB_CLUSTERS.includes(article.cluster)) return [];
  return HUBS.filter((hub) => article.animals.includes(HUB_ANIMAL[hub]));
}
