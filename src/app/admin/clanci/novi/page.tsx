import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleEditor, type EditorArticle } from "@/components/content/admin/article-editor";
import { Card } from "@/components/ui/card";
import { zagrebDay } from "@/lib/time";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { listCtaOptions } from "@/server/content/admin";

const t = content.admin.editor;

export const metadata: Metadata = { title: t.newTitle };

const blank: EditorArticle = {
  id: null,
  slug: "",
  cluster: "",
  title: "",
  excerpt: "",
  bodyMd: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  needsVetReview: false,
  vetReviewedBy: null,
  vetReviewedAt: null,
  ownerApprovedAt: null,
  publishedAt: null,
  updatedAt: null,
  sources: [],
  cta: { after_intro: null, middle: null, end: null },
};

async function NewArticle() {
  await requireAdmin("/admin/clanci/novi");
  const ctaOptions = await listCtaOptions();
  return (
    <ArticleEditor
      article={blank}
      ctaOptions={ctaOptions}
      today={zagrebDay()}
      dates={{ vetReviewedAt: null, ownerApprovedAt: null, publishedAt: null }}
    />
  );
}

export default function NewArticlePage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/admin/clanci" className="flex min-h-11 items-center self-start text-[15px] font-semibold">
          ← {t.back}
        </Link>
        <h1 className="text-4xl font-extrabold">{t.newTitle}</h1>
      </div>
      <Suspense fallback={<Card className="min-h-96" />}>
        <NewArticle />
      </Suspense>
    </>
  );
}
