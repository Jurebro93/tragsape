import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleView } from "@/components/content/article-view";
import { pickRelated } from "@/lib/content/related";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { getArticlePreview } from "@/server/content/admin";
import { listPublishedArticles } from "@/server/content/articles";

const t = content.preview;

export const metadata: Metadata = { title: t.draft };

/**
 * Pregled članka u bilo kojem stanju, istom komponentom kao javna stranica. Samo za admina i bez
 * predmemorije: čita se klijentom sa sesijom pri svakom otvaranju.
 */
async function Preview({ params }: Pick<PageProps<"/admin/clanci/[id]/pregled">, "params">) {
  const { id } = await params;
  await requireAdmin(`/admin/clanci/${id}/pregled`);
  const article = await getArticlePreview(id);
  if (!article) {
    notFound();
  }
  const related = pickRelated(await listPublishedArticles(), article);
  const published = article.status === "published";
  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-10 -mx-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-plum px-5 py-3 text-white"
      >
        <div className="flex flex-col">
          <span className="font-bold">{published ? t.published : t.draft}</span>
          <span className="text-sm text-white/85">{t.savedOnly}</span>
        </div>
        <span className="flex flex-wrap items-center gap-x-4">
          {published ? (
            <Link href={`/vodic/${article.slug}` as Route} className="flex min-h-11 items-center font-bold text-white">
              {t.openPublic}
            </Link>
          ) : null}
          <Link href={`/admin/clanci/${article.id}` as Route} className="flex min-h-11 items-center font-bold text-white">
            {t.backToEditor}
          </Link>
        </span>
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <ArticleView article={article} related={related} />
      </div>
    </>
  );
}

export default function ArticlePreviewPage(props: PageProps<"/admin/clanci/[id]/pregled">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Preview params={props.params} />
    </Suspense>
  );
}
