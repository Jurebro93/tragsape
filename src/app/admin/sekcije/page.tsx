import type { Metadata } from "next";
import { Suspense } from "react";
import { DeleteCtaBlockForm, EditCtaBlockForm, NewCtaBlockForm } from "@/components/content/admin/cta-forms";
import { CtaBlock } from "@/components/content/cta-block";
import { Card, Chip } from "@/components/ui/card";
import { fill, plural } from "@/lib/text";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { listCtaBlocksForAdmin } from "@/server/content/admin";

const t = content.admin.sections;

export const metadata: Metadata = { title: t.title };

async function Blocks() {
  await requireAdmin("/admin/sekcije");
  const blocks = await listCtaBlocksForAdmin();
  if (blocks.length === 0) {
    return (
      <Card>
        <p className="text-plum-soft">{t.empty}</p>
      </Card>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {blocks.map((block) => (
        <li key={block.key}>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-mono text-lg font-bold [overflow-wrap:anywhere]">{block.key}</h2>
              {block.active ? null : (
                <Chip tone="butter" className="px-2.5 py-0.5 text-[13px]">
                  {t.inactive}
                </Chip>
              )}
            </div>
            <CtaBlock
              id={`sekcija-prikaz-${block.key}`}
              articleSlug={null}
              block={{
                key: block.key,
                heading: block.heading,
                body: block.body,
                buttonLabel: block.buttonLabel,
                target: block.target,
                variant: block.variant,
              }}
            />
            <p className="text-[15px] text-plum-soft">
              {block.articleCount === 0
                ? t.usage.none
                : fill(t.usage.assigned, { count: plural(block.articleCount, t.usage) })}
            </p>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer items-center font-bold text-teal">{t.edit}</summary>
              <div className="flex flex-col gap-4 pt-3">
                <EditCtaBlockForm
                  block={{
                    key: block.key,
                    heading: block.heading,
                    body: block.body ?? "",
                    buttonLabel: block.buttonLabel,
                    target: block.target,
                    variant: block.variant,
                    active: block.active,
                  }}
                />
                <DeleteCtaBlockForm blockKey={block.key} />
              </div>
            </details>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function AdminSectionsPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-extrabold">{t.title}</h1>
        <p className="text-plum-soft">{t.intro}</p>
        <p className="text-plum-soft">{t.rules}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <Suspense fallback={<Card className="min-h-60" />}>
          <Blocks />
        </Suspense>
        <Card className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">{t.newTitle}</h2>
          <NewCtaBlockForm />
        </Card>
      </div>
    </>
  );
}
