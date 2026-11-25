import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import type { ArticleStatus } from "@/lib/content/types";
import { formatDateTime } from "@/lib/format";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { listArticlesForAdmin, type AdminArticleRow } from "@/server/content/admin";

const t = content.admin.articles;

export const metadata: Metadata = { title: t.title };

const statusTone: Record<ArticleStatus, "butter" | "mint" | "teal"> = {
  draft: "butter",
  in_review: "butter",
  approved: "mint",
  published: "teal",
  archived: "butter",
};

function VetFlag({ article }: { article: AdminArticleRow }) {
  if (!article.needsVetReview) {
    return <span className="text-plum-soft">{content.admin.vet.notNeeded}</span>;
  }
  return article.vetReviewedAt === null ? (
    <span className="font-bold text-terracotta-deep">{content.admin.vet.pending}</span>
  ) : (
    <span className="font-semibold text-teal-deep">{content.admin.vet.done}</span>
  );
}

async function ArticleList() {
  await requireAdmin("/admin/clanci");
  const articles = await listArticlesForAdmin();
  if (articles.length === 0) {
    return (
      <Card>
        <p className="text-plum-soft">{t.empty}</p>
      </Card>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {articles.map((article) => (
        <li key={article.id}>
          <Card className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={`/admin/clanci/${article.id}` as Route}
                className="font-display text-xl font-extrabold leading-snug text-plum no-underline [overflow-wrap:anywhere] hover:underline"
              >
                {article.title}
              </Link>
              <span className="font-mono text-sm text-plum-soft [overflow-wrap:anywhere]">/vodic/{article.slug}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[15px] md:flex md:shrink-0 md:items-center md:gap-5">
              <div className="flex flex-col gap-0.5 md:w-36">
                <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{t.columns.cluster}</dt>
                <dd>{article.cluster ? content.guide.clusters[article.cluster].name : "—"}</dd>
              </div>
              <div className="flex flex-col items-start gap-0.5 md:w-32">
                <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{t.columns.status}</dt>
                <dd>
                  <Chip tone={statusTone[article.status]} className="px-2.5 py-0.5 text-[13px]">
                    {content.admin.status[article.status]}
                  </Chip>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 md:w-44">
                <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{t.columns.vet}</dt>
                <dd>
                  <VetFlag article={article} />
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 md:w-40">
                <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{t.columns.updated}</dt>
                <dd>{formatDateTime(article.updatedAt)}</dd>
              </div>
            </dl>
            <Link
              href={`/admin/clanci/${article.id}` as Route}
              className="flex min-h-11 shrink-0 items-center self-start font-bold md:self-center"
            >
              {t.edit}
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function AdminArticlesPage() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-extrabold">{t.title}</h1>
          <p className="text-plum-soft">{t.intro}</p>
        </div>
        <ButtonLink href="/admin/clanci/novi" size="md" className="self-start sm:self-auto">
          {t.new}
        </ButtonLink>
      </div>
      <Suspense fallback={<Card className="min-h-40" />}>
        <ArticleList />
      </Suspense>
    </>
  );
}
