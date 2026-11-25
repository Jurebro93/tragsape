import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemorialGrid } from "@/components/livada/memorial-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Eyebrow } from "@/components/ui/card";
import { common } from "@/messages/hr/common";
import { livada } from "@/messages/hr/livada";
import { getFamilyBySlug } from "@/server/memorials/livada";

export async function generateMetadata({ params }: PageProps<"/obitelj/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const family = await getFamilyBySlug(slug);
  if (!family) {
    return { title: common.brand, robots: { index: false, follow: false } };
  }
  return {
    title: family.title,
    description: family.intro ?? livada.family.metaDescription,
    alternates: { canonical: `/obitelj/${family.slug}` },
    robots: family.memorials.length > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

async function Family({ params }: Pick<PageProps<"/obitelj/[slug]">, "params">) {
  const { slug } = await params;
  const family = await getFamilyBySlug(slug);
  if (!family) {
    notFound();
  }
  return (
    <>
      <div className="rounded-b-[40px] bg-butter">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 pb-9 pt-4">
          <Eyebrow>{livada.family.eyebrow}</Eyebrow>
          <h1 className="text-5xl font-extrabold [overflow-wrap:anywhere]">{family.title}</h1>
          {family.intro ? <p className="max-w-xl whitespace-pre-line text-lg">{family.intro}</p> : null}
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-16 pt-7">
        {family.memorials.length === 0 ? (
          <p className="text-plum-soft">{livada.family.empty}</p>
        ) : (
          <MemorialGrid memorials={family.memorials} />
        )}
      </main>
    </>
  );
}

export default function FamilyPage(props: PageProps<"/obitelj/[slug]">) {
  return (
    <>
      <SiteHeader tone="butter" />
      <Suspense fallback={<div className="min-h-96 flex-1 rounded-b-[40px] bg-butter" />}>
        <Family params={props.params} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
