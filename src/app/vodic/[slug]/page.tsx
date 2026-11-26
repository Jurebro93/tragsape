import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/content/article-view";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pickRelated } from "@/lib/content/related";
import { isValidSlug } from "@/lib/content/slug";
import type { ArticleView as ArticleViewData } from "@/lib/content/types";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { getPublishedArticle, listPublishedArticleSlugs, listPublishedArticles } from "@/server/content/articles";
import { env } from "@/server/env";

/** Objavljeni članak po adresi. Adresa koja ne može biti valjana ne ide ni do baze ni u predmemoriju. */
async function findArticle(slug: string): Promise<ArticleViewData | null> {
  return isValidSlug(slug) ? getPublishedArticle(slug) : null;
}

/**
 * Objavljeni članci se pri buildu iscrtavaju u gotov HTML, pa tražilica cijeli tekst dobiva u prvom
 * odgovoru, bez JavaScripta. Članak objavljen nakon builda radi odmah, a statičan postaje pri
 * sljedećoj objavi stranice.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const articles = await listPublishedArticleSlugs();
  // Prazan popis nije dopušten; adresa koja ne postoji daje stranicu „nema je".
  return articles.length > 0 ? articles.map((article) => ({ slug: article.slug })) : [{ slug: "jos-nema-clanaka" }];
}

export async function generateMetadata({ params }: PageProps<"/vodic/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article) {
    // Nepostojeći članak i članak koji nije objavljen izvana izgledaju jednako.
    return { title: content.guide.title, robots: { index: false, follow: false } };
  }
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt ?? undefined;
  const path = `/vodic/${article.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path,
      siteName: common.brand,
      locale: "hr_HR",
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
    },
  };
}

/** Strukturirani podaci za tražilice. Znak < se zamjenjuje da tekst ne može zatvoriti oznaku script. */
function ArticleJsonLd({ article }: { article: ArticleViewData }) {
  const url = `${env.siteUrl}/vodic/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    inLanguage: "hr",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    publisher: { "@type": "Organization", name: common.brand, url: env.siteUrl },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

/**
 * `params` se čita izvan `<Suspense>`: cijeli članak je tada u prvom HTML odgovoru (tražilici ne
 * treba JavaScript), a adresa bez objavljenog članka vraća pravi status 404.
 */
export default async function ArticlePage({ params }: PageProps<"/vodic/[slug]">) {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article) {
    notFound();
  }
  const related = pickRelated(await listPublishedArticles(), article);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-6">
        <ArticleJsonLd article={article} />
        <ArticleView article={article} related={related} />
      </main>
      <SiteFooter />
    </>
  );
}
