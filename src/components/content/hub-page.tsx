import type { Route } from "next";
import Link from "next/link";
import { CLUSTER_ART } from "@/components/content/article-card";
import { ArrowRightIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { cn } from "@/lib/cn";
import { HUBS, hubGroups, hubPath, type Hub } from "@/lib/content/hubs";
import type { ArticleSummary } from "@/lib/content/types";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { env } from "@/server/env";

const t = content.guide.hubs;

/**
 * Stranica zdravlja jedne životinje: kratko uputstvo, znakovi kada ne čekati (svaki vodi na članak
 * s izvorima), članci po područjima i pouzdani vanjski izvori. Bez prodajnih sekcija: čitatelj ovdje
 * još ima ljubimca.
 */
export function HubPage({ hub, articles }: { hub: Hub; articles: ArticleSummary[] }) {
  const page = t.pages[hub];
  const groups = hubGroups(hub, articles);
  const total = groups.reduce((sum, group) => sum + group.articles.length, 0);
  const published = new Set(articles.map((article) => article.slug));
  const url = `${env.siteUrl}${hubPath(hub)}`;
  const { Icon, tile } = CLUSTER_ART.zdravlje;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.title,
      description: page.description,
      url,
      inLanguage: "hr",
      hasPart: {
        "@type": "ItemList",
        itemListElement: groups
          .flatMap((group) => group.articles)
          .map((article, index) => ({ "@type": "ListItem", position: index + 1, url: `${env.siteUrl}/vodic/${article.slug}`, name: article.title })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: common.brand, item: env.siteUrl },
        { "@type": "ListItem", position: 2, name: content.guide.title, item: `${env.siteUrl}/vodic` },
        { "@type": "ListItem", position: 3, name: page.title, item: url },
      ],
    },
  ];

  return (
    <>
      <SiteHeader tone="butter" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="rounded-b-[40px] bg-butter">
        <header className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-5 pb-10 pt-6">
          <Link href="/vodic" className="flex min-h-11 items-center text-[15px] font-semibold">
            ← {content.guide.topic.back}
          </Link>
          <span className={cn("flex size-14 items-center justify-center rounded-full", tile)}>
            <Icon size={28} />
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">{page.title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed">{page.lead}</p>
          <p className="text-[15px] font-semibold text-plum-soft">{fill(t.countLabel, { count: total })}</p>
        </header>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 pb-16 pt-8">
        <p role="note" className="rounded-3xl bg-mint px-5 py-4 text-[15px] leading-relaxed">
          {content.article.notReviewed}
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="hitno" className="flex flex-col gap-3 rounded-3xl bg-white p-5">
            <h2 id="hitno" className="font-display text-2xl font-extrabold">
              {t.urgentTitle}
            </h2>
            <p className="text-[15px] text-plum-soft">{t.urgentLead}</p>
            <ul className="flex flex-col">
              {page.urgent
                .filter((item) => published.has(item.slug))
                .map((item) => (
                  <li key={item.slug} className="border-t border-line first:border-t-0">
                    <Link href={`/vodic/${item.slug}` as Route} className="flex min-h-12 items-center justify-between gap-3 py-2 font-semibold text-plum no-underline hover:underline">
                      {item.text}
                      <ArrowRightIcon size={18} className="shrink-0 text-terracotta" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
          <section aria-labelledby="kako" className="flex flex-col gap-3 rounded-3xl bg-white p-5">
            <h2 id="kako" className="font-display text-2xl font-extrabold">
              {t.howTitle}
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold">
              {page.how.map((step) => (
                <li key={step} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
            <Link href={"/vodic/hitna-veterinarska-pomoc-nocu-i-vikendom-doplate" as Route} className="inline-flex min-h-11 items-center gap-1.5 font-bold text-teal">
              {t.emergencyLink}
              <ArrowRightIcon size={18} />
            </Link>
          </section>

        </div>

        {groups.map(({ group, articles: list }) => (
          <section key={group} aria-labelledby={`podrucje-${group}`} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id={`podrucje-${group}`} className="font-display text-3xl font-extrabold">
                {t.groups[group].title}
              </h2>
              <p className="text-plum-soft">{t.groups[group].lead}</p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {list.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/vodic/${article.slug}` as Route}
                    className="group flex h-full flex-col gap-1 rounded-3xl bg-white p-4 text-plum no-underline hover:bg-butter"
                  >
                    <span className="font-display text-lg font-extrabold leading-snug group-hover:underline">{article.title}</span>
                    {article.excerpt ? <span className="line-clamp-2 text-[15px] leading-relaxed text-plum-soft">{article.excerpt}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="izvori" className="flex flex-col gap-3 rounded-3xl bg-white p-5">
          <h2 id="izvori" className="font-display text-2xl font-extrabold">
            {t.sourcesTitle}
          </h2>
          <p className="text-[15px] text-plum-soft">{t.sourcesLead}</p>
          <ul className="flex flex-col gap-2">
            {page.sources.map((source) => (
              <li key={source.url} className="flex flex-col">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-teal">
                  {source.name}
                </a>
                <span className="text-[15px] text-plum-soft">{source.note}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-plum-soft">{t.sourcesChecked}</p>
        </section>

        <HubTiles current={hub} articles={articles} />
      </main>
      <SiteFooter />
    </>
  );
}

/** Pločice „Zdravlje pasa” i „Zdravlje mačaka” za Vodič, temu zdravlja i stranice zdravlja. */
export function HubTiles({ articles, current }: { articles: ArticleSummary[]; current?: Hub }) {
  const tiles = HUBS.filter((hub) => hub !== current).map((hub) => ({
    hub,
    count: hubGroups(hub, articles).reduce((sum, group) => sum + group.articles.length, 0),
  }));
  if (tiles.every((tile) => tile.count === 0)) return null;
  return (
    <section aria-labelledby="zdravlje-po-zivotinjama" className="flex flex-col gap-3">
      <h2 id="zdravlje-po-zivotinjama" className="font-display text-2xl font-extrabold">
        {t.tileTitle}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tiles.map(({ hub, count }) => (
          <li key={hub}>
            <Link href={hubPath(hub) as Route} className="flex min-h-16 items-center justify-between gap-3 rounded-3xl bg-mint px-5 py-4 text-teal-deep no-underline hover:bg-butter">
              <span className="flex flex-col">
                <span className="font-display text-xl font-extrabold">{t.pages[hub].title}</span>
                <span className="text-[14px] font-semibold">{fill(t.countLabel, { count })}</span>
              </span>
              <ArrowRightIcon size={22} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
