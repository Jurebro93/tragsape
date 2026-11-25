import type { Route } from "next";
import Link from "next/link";
import { ArticleBody } from "@/components/content/article-body";
import { CtaBlock } from "@/components/content/cta-block";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/card";
import type { ArticleSummary, ArticleView as ArticleViewData } from "@/lib/content/types";
import { formatDateTime, formatPetDate } from "@/lib/format";
import { fill } from "@/lib/text";
import { content } from "@/messages/hr/content";

/**
 * Članak onako kako ga vidi čitatelj: naslov, uvod, tekst s prodajnim sekcijama, izvori i povezani
 * članci. Javna stranica i pregled nacrta u adminu koriste istu komponentu, pa izgledaju jednako.
 */

const t = content.article;

/** Poveznica izvora samo ako je adresa http(s); sve ostalo ostaje običan tekst. */
function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function Sources({ sources }: { sources: ArticleViewData["sources"] }) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="izvori" className="flex flex-col gap-4 border-t-2 border-line pt-8">
      <h2 id="izvori" className="font-display text-2xl font-extrabold">
        {t.sources}
      </h2>
      <ol className="flex list-decimal flex-col gap-4 pl-6 text-[15px] leading-relaxed marker:text-plum-soft">
        {sources.map((source) => {
          const url = safeSourceUrl(source.url);
          const accessed = formatPetDate(source.accessedOn, "day");
          return (
            <li key={source.id} className="pl-1 [overflow-wrap:anywhere]">
              {source.publisher ? <span className="font-bold">{source.publisher}: </span> : null}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal underline underline-offset-4 hover:text-teal-deep"
                >
                  {source.title}
                  <span className="sr-only"> ({t.newTab})</span>
                </a>
              ) : (
                <span>{source.title}</span>
              )}
              {accessed ? <span className="text-plum-soft">, {fill(t.accessed, { date: accessed })}</span> : null}
              {source.claim ? (
                <span className="mt-0.5 block text-sm text-plum-soft">{fill(t.sourceClaim, { claim: source.claim })}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Related({ articles }: { articles: readonly ArticleSummary[] }) {
  if (articles.length === 0) {
    return null;
  }
  return (
    <nav aria-labelledby="povezano" className="flex flex-col gap-3 border-t-2 border-line pt-8">
      <h2 id="povezano" className="font-display text-2xl font-extrabold">
        {t.related}
      </h2>
      <ul className="flex flex-col gap-3">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/vodic/${article.slug}` as Route}
              className="group flex min-h-14 items-center justify-between gap-3 rounded-3xl bg-white p-5 text-plum no-underline"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-lg font-extrabold leading-snug group-hover:underline">
                  {article.title}
                </span>
                {article.excerpt ? (
                  <span className="line-clamp-2 text-[15px] leading-snug text-plum-soft">{article.excerpt}</span>
                ) : null}
              </span>
              <ArrowRightIcon size={20} className="shrink-0 text-teal" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ArticleView({
  article,
  related,
}: {
  article: ArticleViewData;
  related: readonly ArticleSummary[];
}) {
  const hasBody = article.bodyMd.trim() !== "";
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link href="/vodic" className="flex min-h-11 items-center self-start text-[15px] font-semibold">
          ← {t.back}
        </Link>
        <Eyebrow>{content.guide.clusters[article.cluster].name}</Eyebrow>
        <h1 className="text-4xl font-extrabold leading-[1.1] [overflow-wrap:anywhere] sm:text-5xl">{article.title}</h1>
        {article.excerpt ? <p className="text-xl leading-relaxed text-plum-soft">{article.excerpt}</p> : null}
        <div className="flex flex-col gap-1.5 text-[15px] text-plum-soft">
          <p>{fill(t.updated, { date: formatDateTime(article.updatedAt) })}</p>
          {article.vetReviewedBy && article.vetReviewedAt ? (
            <p className="flex items-start gap-2 font-semibold text-teal-deep">
              <CheckIcon size={20} className="mt-0.5 shrink-0" />
              <span>
                {fill(t.reviewed, { name: article.vetReviewedBy, date: formatDateTime(article.vetReviewedAt) })}
              </span>
            </p>
          ) : null}
        </div>
      </header>

      {hasBody ? <ArticleBody markdown={article.bodyMd} slug={article.slug} cta={article.cta} /> : null}

      {hasBody && article.cta.end ? (
        <CtaBlock block={article.cta.end} articleSlug={article.slug} id="sekcija-end" />
      ) : null}

      <Sources sources={article.sources} />
      <Related articles={related} />
    </article>
  );
}
