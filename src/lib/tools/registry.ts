import type { Metadata } from "next";
import { common } from "@/messages/hr/common";
import { tools } from "@/messages/hr/tools";

export type ToolStatus = "public" | "draft";

export type ToolSlug =
  | "psece-godine"
  | "macje-godine"
  | "kvaliteta-zivota"
  | "prva-24-sata"
  | "posveta"
  | "sucut"
  | "oprostaj";

export type Tool = {
  slug: ToolSlug;
  title: string;
  description: string;
  /** `draft` vidi samo admin; ostalima stranica ne postoji. Objava je promjena ove jedne riječi. */
  status: ToolStatus;
};

/**
 * Svi alati, redom kojim se nude na /alati.
 * Alati o zdravlju i propisima kreću kao nacrt: objavljuju se tek nakon pregleda veterinara
 * i vlasnikova odobrenja (AGENTS.md, „Sadržaj").
 */
export const TOOLS: readonly Tool[] = [
  { slug: "psece-godine", ...tools.registry["psece-godine"], status: "public" },
  { slug: "macje-godine", ...tools.registry["macje-godine"], status: "public" },
  { slug: "posveta", ...tools.registry.posveta, status: "public" },
  { slug: "sucut", ...tools.registry.sucut, status: "public" },
  { slug: "oprostaj", ...tools.registry.oprostaj, status: "public" },
  { slug: "kvaliteta-zivota", ...tools.registry["kvaliteta-zivota"], status: "draft" },
  { slug: "prva-24-sata", ...tools.registry["prva-24-sata"], status: "draft" },
];

export function getTool(slug: ToolSlug): Tool {
  const tool = TOOLS.find((item) => item.slug === slug);
  if (!tool) {
    throw new Error(`Nepoznat alat: ${slug}`);
  }
  return tool;
}

/** Alati koje smije vidjeti svatko; samo oni idu na popis i u sitemap. */
export function publicTools(): Tool[] {
  return TOOLS.filter((tool) => tool.status === "public");
}

export function toolPath(slug: ToolSlug): string {
  return `/alati/${slug}`;
}

/**
 * Poveznica sljedećeg koraka s oznakom izvora. Izrada spomena sprema `iz` i `cta` uz nacrt,
 * pa se vidi koji je alat doveo posjetitelja.
 */
export function nextStepHref(path: string, slug: ToolSlug, cta: string): string {
  const params = new URLSearchParams({ iz: `alat-${slug}`, cta });
  return `${path}?${params.toString()}`;
}

/**
 * Metapodaci stranice alata. Nacrt se ne nudi tražilicama i ne odaje naslov ni opis:
 * metapodaci su dio statične ljuske koju dobiva svatko, pa nacrt izvana izgleda kao stranica koje nema.
 */
export function toolMetadata(slug: ToolSlug, meta: { title: string; description: string }): Metadata {
  if (getTool(slug).status === "draft") {
    return { title: common.errors.notFoundTitle, robots: { index: false, follow: false } };
  }
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: toolPath(slug) },
  };
}
