import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard, CLUSTER_ART, TopicTiles, topicPath } from "@/components/content/article-card";
import { HubTiles } from "@/components/content/hub-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { cn } from "@/lib/cn";
import { CLUSTERS, isCluster, type Cluster } from "@/lib/content/types";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { listPublishedArticles } from "@/server/content/articles";
import { env } from "@/server/env";

const t = content.guide;

/** Sve teme se iscrtavaju pri buildu, pa tražilica dobiva cijeli popis u prvom HTML odgovoru. */
export function generateStaticParams(): Array<{ tema: Cluster }> {
  return CLUSTERS.map((tema) => ({ tema }));
}

export async function generateMetadata({ params }: PageProps<"/vodic/tema/[tema]">): Promise<Metadata> {
  const { tema } = await params;
  if (!isCluster(tema)) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  const articles = await listPublishedArticles();
  const cluster = t.clusters[tema];
  return {
    title: cluster.metaTitle,
    description: cluster.description,
    alternates: { canonical: topicPath(tema) },
    robots: articles.some((article) => article.cluster === tema) ? undefined : { index: false, follow: true },
  };
}

/** Stranica teme: opis, sve teme kao pločice i svi objavljeni članci te teme. */
export default async function TopicPage({ params }: PageProps<"/vodic/tema/[tema]">) {
  const { tema } = await params;
  if (!isCluster(tema)) {
    notFound();
  }
  const articles = await listPublishedArticles();
  const inTopic = articles.filter((article) => article.cluster === tema);
  const clusters = CLUSTERS.filter((cluster) => articles.some((article) => article.cluster === cluster));
  const counts = Object.fromEntries(
    CLUSTERS.map((cluster) => [cluster, articles.filter((article) => article.cluster === cluster).length]),
  ) as Record<Cluster, number>;
  const cluster = t.clusters[tema];
  const { Icon, tile } = CLUSTER_ART[tema];
  const url = `${env.siteUrl}${topicPath(tema)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: common.brand, item: env.siteUrl },
      { "@type": "ListItem", position: 2, name: t.title, item: `${env.siteUrl}/vodic` },
      { "@type": "ListItem", position: 3, name: cluster.name, item: url },
    ],
  };

  return (
    <>
      <SiteHeader tone="butter" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="rounded-b-[40px] bg-butter">
        <header className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-5 pb-10 pt-6">
          <Link href="/vodic" className="flex min-h-11 items-center text-[15px] font-semibold">
            ← {t.topic.back}
          </Link>
          <span className={cn("flex size-14 items-center justify-center rounded-full", tile)}>
            <Icon size={28} />
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.05]">{cluster.name}</h1>
          <p className="max-w-2xl text-lg leading-relaxed">{cluster.description}</p>
          <p className="text-[15px] font-semibold text-plum-soft">{fill(t.topic.count, { count: inTopic.length })}</p>
        </header>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 pb-16 pt-8">
        {inTopic.length === 0 ? (
          <p className="text-plum-soft">{t.empty.body}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {inTopic.map((article) => (
              <li key={article.id}>
                <ArticleCard
                  article={{
                    id: article.id,
                    slug: article.slug,
                    title: article.title,
                    excerpt: article.excerpt,
                    cluster: article.cluster,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {tema === "zdravlje" || tema === "kraj-zivota" ? <HubTiles articles={articles} /> : null}
        <section aria-labelledby="ostale-teme" className="flex flex-col gap-4">
          <h2 id="ostale-teme" className="font-display text-2xl font-extrabold">
            {t.topic.otherTopics}
          </h2>
          <TopicTiles clusters={clusters} counts={counts} current={tema} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
