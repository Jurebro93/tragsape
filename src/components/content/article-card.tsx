import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon, BallIcon, CandleIcon, FlowerIcon, PawIcon, PenIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Cluster } from "@/lib/content/types";
import { content } from "@/messages/hr/content";

const t = content.guide;

export type GuideArticle = { id: string; slug: string; title: string; excerpt: string | null; cluster: Cluster };

export const CLUSTER_ART: Record<Cluster, { Icon: typeof CandleIcon; tile: string }> = {
  zdravlje: { Icon: PawIcon, tile: "bg-mint text-teal-deep" },
  "kraj-zivota": { Icon: PenIcon, tile: "bg-sun text-plum" },
  "nakon-smrti": { Icon: CandleIcon, tile: "bg-terracotta text-white" },
  tugovanje: { Icon: FlowerIcon, tile: "bg-teal text-white" },
  "prigodni-datumi": { Icon: BallIcon, tile: "bg-plum text-white" },
};

export function topicPath(cluster: Cluster): Route {
  return `/vodic/tema/${cluster}` as Route;
}

/** Kartica članka na popisima Vodiča: naslovna slika, tema, naslov i sažetak. */
export function ArticleCard({ article }: { article: GuideArticle }) {
  const { Icon, tile } = CLUSTER_ART[article.cluster];
  return (
    <Link
      href={`/vodic/${article.slug}` as Route}
      className="group flex h-full flex-col gap-3 rounded-3xl bg-white p-5 text-plum no-underline hover:bg-butter"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- sliku crta vlastita ruta */}
      <img
        src={`/vodic/${article.slug}/opengraph-image`}
        alt=""
        width={1200}
        height={630}
        loading="lazy"
        className="h-auto w-full rounded-2xl"
      />
      <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-terracotta-deep">
        <span className={cn("flex size-7 items-center justify-center rounded-full", tile)}>
          <Icon size={15} />
        </span>
        {t.clusters[article.cluster].name}
      </span>
      <span className="font-display text-xl font-extrabold leading-snug [overflow-wrap:anywhere] group-hover:underline">
        {article.title}
      </span>
      {article.excerpt ? (
        <span className="line-clamp-3 text-[15px] leading-relaxed text-plum-soft">{article.excerpt}</span>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[15px] font-bold text-teal">
        {t.filter.read}
        <ArrowRightIcon size={18} />
      </span>
    </Link>
  );
}

/** Pločice tema: svaka vodi na stranicu teme. `current` je tema na kojoj je posjetitelj. */
export function TopicTiles({
  clusters,
  counts,
  current,
}: {
  clusters: readonly Cluster[];
  counts: Record<Cluster, number>;
  current?: Cluster;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {clusters.map((cluster) => {
        const { Icon, tile } = CLUSTER_ART[cluster];
        const selected = current === cluster;
        return (
          <li key={cluster} className="flex">
            <Link
              href={topicPath(cluster)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-h-28 w-full flex-col items-start gap-2 rounded-3xl border-2 p-4 text-left text-plum no-underline",
                selected ? "border-teal bg-mint" : "border-transparent bg-white hover:bg-butter",
              )}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-full", tile)}>
                <Icon size={22} />
              </span>
              <span className="font-display text-lg font-extrabold leading-tight">{t.clusters[cluster].name}</span>
              <span className="text-[13px] text-plum-soft">{t.filter.count.replace("{count}", String(counts[cluster]))}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
