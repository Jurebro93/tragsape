import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon, PawTrail } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { ArticleCard, TopicTiles, topicPath } from "@/components/content/article-card";
import { HubTiles } from "@/components/content/hub-page";
import { TopicRequest } from "@/components/requests/topic-request";
import { buttonClass } from "@/components/ui/button";
import { fill } from "@/lib/text";
import { CLUSTERS, type Cluster } from "@/lib/content/types";
import { publicTools, toolPath } from "@/lib/tools/registry";
import { content } from "@/messages/hr/content";
import { listPublishedArticles } from "@/server/content/articles";

const t = content.guide;

/** Koliko članaka svake teme stane na naslovnu Vodiča; ostali su na stranici teme. */
const PER_TOPIC = 4;

export async function generateMetadata(): Promise<Metadata> {
  const articles = await listPublishedArticles();
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: "/vodic" },
    // Prazan popis nema što ponuditi tražilicama.
    robots: articles.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function GuidePage() {
  const articles = await listPublishedArticles();
  const clusters = CLUSTERS.filter((cluster) => articles.some((article) => article.cluster === cluster));
  const counts = Object.fromEntries(
    CLUSTERS.map((cluster) => [cluster, articles.filter((article) => article.cluster === cluster).length]),
  ) as Record<Cluster, number>;
  const cards = articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    cluster: article.cluster,
  }));
  const tools = publicTools();

  return (
    <>
      <SiteHeader tone="butter" />
      <div className="rounded-b-[40px] bg-butter">
        <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 pb-10 pt-6">
          <h1 className="text-5xl font-extrabold leading-[1.05]">{t.title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed">{t.intro}</p>
        </header>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-5 pb-16 pt-8">
        {articles.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 bg-butter">
            <PawTrail className="h-auto w-28 text-sun" />
            <h2 className="text-2xl font-extrabold">{t.empty.title}</h2>
            <p className="leading-relaxed">{t.empty.body}</p>
          </Card>
        ) : (
          <>
            <TopicTiles clusters={clusters} counts={counts} />
            <HubTiles articles={articles} />
            <TopicRequest />
            {clusters.map((cluster) => {
              const inCluster = cards.filter((article) => article.cluster === cluster);
              return (
                <section key={cluster} aria-labelledby={`tema-${cluster}`} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 id={`tema-${cluster}`} className="font-display text-3xl font-extrabold leading-tight">
                      <Link href={topicPath(cluster)} className="text-plum no-underline hover:underline">
                        {t.clusters[cluster].name}
                      </Link>
                    </h2>
                    <p className="max-w-2xl leading-relaxed text-plum-soft">{t.clusters[cluster].lead}</p>
                  </div>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {inCluster.slice(0, PER_TOPIC).map((article) => (
                      <li key={article.id}>
                        <ArticleCard article={article} />
                      </li>
                    ))}
                  </ul>
                  {inCluster.length > PER_TOPIC ? (
                    <Link href={topicPath(cluster)} className={buttonClass("secondary", "md", "self-start")}>
                      {fill(t.topic.seeAll, { name: t.clusters[cluster].name, count: inCluster.length })}
                      <ArrowRightIcon size={18} />
                    </Link>
                  ) : null}
                </section>
              );
            })}
          </>
        )}

        <section aria-labelledby="alati-title" className="flex flex-col gap-4 rounded-[40px] bg-mint p-6 sm:p-10">
          <div className="flex flex-col gap-1">
            <h2 id="alati-title" className="font-display text-3xl font-extrabold">
              {t.toolsTitle}
            </h2>
            <p>{t.toolsLead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={toolPath(tool.slug) as Route}
                  className="flex h-full flex-col gap-1.5 rounded-3xl bg-white p-5 text-plum no-underline hover:bg-butter"
                >
                  <span className="font-display text-lg font-extrabold leading-snug">{tool.title}</span>
                  <span className="text-[15px] leading-snug text-plum-soft">{tool.description}</span>
                  <ArrowRightIcon size={18} className="mt-auto text-teal" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
