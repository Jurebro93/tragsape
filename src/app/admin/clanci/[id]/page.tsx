import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleEditor } from "@/components/content/admin/article-editor";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { zagrebDay } from "@/lib/time";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { getArticleForEdit, listCtaOptions } from "@/server/content/admin";

const t = content.admin.editor;

export const metadata: Metadata = { title: t.editTitle };

async function EditArticle({ params }: Pick<PageProps<"/admin/clanci/[id]">, "params">) {
  const { id } = await params;
  await requireAdmin(`/admin/clanci/${id}`);
  const [article, ctaOptions] = await Promise.all([getArticleForEdit(id), listCtaOptions()]);
  if (!article) {
    notFound();
  }
  const date = (value: string | null) => (value === null ? null : formatDateTime(value));
  return (
    <ArticleEditor
      article={article}
      ctaOptions={ctaOptions}
      today={zagrebDay()}
      dates={{
        vetReviewedAt: date(article.vetReviewedAt),
        ownerApprovedAt: date(article.ownerApprovedAt),
        publishedAt: date(article.publishedAt),
      }}
    />
  );
}

export default function EditArticlePage(props: PageProps<"/admin/clanci/[id]">) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/admin/clanci" className="flex min-h-11 items-center self-start text-[15px] font-semibold">
          ← {t.back}
        </Link>
        <h1 className="text-4xl font-extrabold">{t.editTitle}</h1>
      </div>
      <Suspense fallback={<Card className="min-h-96" />}>
        <EditArticle params={props.params} />
      </Suspense>
    </>
  );
}
