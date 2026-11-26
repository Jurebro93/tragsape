"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, BallIcon, CandleIcon, FlowerIcon, PenIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Cluster } from "@/lib/content/types";
import { content } from "@/messages/hr/content";

const t = content.guide;

export type GuideArticle = { id: string; slug: string; title: string; excerpt: string | null; cluster: Cluster };

const CLUSTER_ART: Record<Cluster, { Icon: typeof CandleIcon; tile: string }> = {
  "kraj-zivota": { Icon: PenIcon, tile: "bg-sun text-plum" },
  "nakon-smrti": { Icon: CandleIcon, tile: "bg-terracotta text-white" },
  tugovanje: { Icon: FlowerIcon, tile: "bg-teal text-white" },
  "prigodni-datumi": { Icon: BallIcon, tile: "bg-plum text-white" },
};

/** Popis članaka koji se filtrira po temi bez učitavanja stranice. Bez JavaScripta prikazuje sve. */
export function GuideBrowser({ articles, clusters }: { articles: GuideArticle[]; clusters: Cluster[] }) {
  const [active, setActive] = useState<Cluster | null>(null);
  const shown = active ? articles.filter((article) => article.cluster === active) : articles;
  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label={t.filter.label} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {clusters.map((cluster) => {
          const { Icon, tile } = CLUSTER_ART[cluster];
          const selected = active === cluster;
          const count = articles.filter((article) => article.cluster === cluster).length;
          return (
            <button
              key={cluster}
              type="button"
              aria-pressed={selected}
              onClick={() => setActive(selected ? null : cluster)}
              className={cn(
                "flex min-h-28 cursor-pointer flex-col items-start gap-2 rounded-3xl border-2 p-4 text-left",
                selected ? "border-teal bg-mint" : "border-transparent bg-white hover:bg-butter",
              )}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-full", tile)}>
                <Icon size={22} />
              </span>
              <span className="font-display text-lg font-extrabold leading-tight">{t.clusters[cluster].name}</span>
              <span className="text-[13px] text-plum-soft">{t.filter.count.replace("{count}", String(count))}</span>
            </button>
          );
        })}
      </div>
      {active ? (
        <p className="flex flex-wrap items-center gap-3 text-plum-soft">
          <span>{t.clusters[active].lead}</span>
          <button type="button" onClick={() => setActive(null)} className="min-h-11 cursor-pointer font-bold text-teal underline underline-offset-4">
            {t.filter.all}
          </button>
        </p>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((article) => {
          const { Icon, tile } = CLUSTER_ART[article.cluster];
          return (
            <li key={article.id}>
              <Link
                href={`/vodic/${article.slug}` as Route}
                className="group flex h-full flex-col gap-3 rounded-3xl bg-white p-5 text-plum no-underline hover:bg-butter"
              >
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
