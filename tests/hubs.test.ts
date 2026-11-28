import { describe, expect, it } from "vitest";
import { hubGroups, hubsForArticle } from "@/lib/content/hubs";
import type { ArticleSummary, Cluster } from "@/lib/content/types";

const article = (slug: string, cluster: Cluster, animals: string[]): ArticleSummary => ({
  id: slug,
  slug,
  cluster,
  title: slug,
  excerpt: null,
  publishedAt: null,
  animals,
});

describe("stranice zdravlja po životinjama", () => {
  const all = [
    article("pas-povraca-uzroci-i-kada-veterinaru", "zdravlje", ["pas"]),
    article("macka-ne-jede-zasto-je-to-hitno", "zdravlje", ["macka"]),
    article("otrovne-biljke-za-pse-i-macke", "zdravlje", ["pas", "macka"]),
    article("krpelj-na-psu-sto-uciniti-i-kada-veterinaru", "zdravlje", ["pas"]),
    article("stari-pas-znakovi-da-pati", "kraj-zivota", ["pas"]),
    article("posveta-za-psa-primjeri", "tugovanje", ["pas"]),
  ];

  it("uzima samo članke te životinje iz zdravlja i kraja života, po područjima", () => {
    const groups = hubGroups("zdravlje-pasa", all);
    expect(groups.map((g) => g.group)).toEqual(["hitno", "paraziti", "otrovi", "starost"]);
    expect(groups.flatMap((g) => g.articles.map((a) => a.slug))).not.toContain("posveta-za-psa-primjeri");
    expect(groups.flatMap((g) => g.articles.map((a) => a.slug))).not.toContain("macka-ne-jede-zasto-je-to-hitno");
  });

  it("članak za obje životinje vodi na obje stranice, članak o tugovanju ni na jednu", () => {
    expect(hubsForArticle(all[2])).toEqual(["zdravlje-pasa", "zdravlje-macaka"]);
    expect(hubsForArticle(all[5])).toEqual([]);
  });
});
