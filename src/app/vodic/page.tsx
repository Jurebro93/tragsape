import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon, PawTrail } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { CLUSTERS } from "@/lib/content/types";
import { content } from "@/messages/hr/content";
import { listPublishedArticles } from "@/server/content/articles";

const t = content.guide;

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
  const groups = CLUSTERS.map((cluster) => ({
    cluster,
    articles: articles.filter((article) => article.cluster === cluster),
  })).filter((group) => group.articles.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-5 pb-16 pt-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl">{t.title}</h1>
          <p className="text-lg leading-relaxed text-plum-soft">{t.intro}</p>
        </header>

        {groups.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 bg-butter">
            <PawTrail className="h-auto w-28 text-sun" />
            <h2 className="text-2xl font-extrabold">{t.empty.title}</h2>
            <p className="leading-relaxed">{t.empty.body}</p>
          </Card>
        ) : (
          groups.map((group) => (
            <section key={group.cluster} aria-labelledby={`tema-${group.cluster}`} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id={`tema-${group.cluster}`} className="text-2xl font-extrabold sm:text-3xl">
                  {t.clusters[group.cluster].name}
                </h2>
                <p className="text-plum-soft">{t.clusters[group.cluster].lead}</p>
              </div>
              <ul className="flex flex-col gap-3">
                {group.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/vodic/${article.slug}` as Route}
                      className="group flex min-h-14 items-center justify-between gap-3 rounded-3xl bg-white p-5 text-plum no-underline"
                    >
                      <span className="flex min-w-0 flex-col gap-1.5">
                        <span className="font-display text-xl font-extrabold leading-snug [overflow-wrap:anywhere] group-hover:underline">
                          {article.title}
                        </span>
                        {article.excerpt ? (
                          <span className="line-clamp-3 text-[15px] leading-relaxed text-plum-soft">
                            {article.excerpt}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRightIcon size={20} className="shrink-0 text-teal" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
      <SiteFooter />
    </>
  );
}
