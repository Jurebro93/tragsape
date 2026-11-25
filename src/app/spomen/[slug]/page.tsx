import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import { OwnerBar } from "@/components/memorial/owner-bar";
import { PublishedNotice } from "@/components/memorial/published-notice";
import { formatLifespan } from "@/lib/format";
import { isIndexable } from "@/lib/indexing";
import type { MemorialView } from "@/lib/memorial";
import { speciesLabel } from "@/lib/species";
import { common } from "@/messages/hr/common";
import { getMemberMemorialBySlug, getPublicMemorialBySlug } from "@/server/memorials/access";

function describe(view: MemorialView): string {
  const { memorial } = view;
  const parts = [
    memorial.breed ?? speciesLabel(memorial.species),
    formatLifespan(
      { date: memorial.birthDate, precision: memorial.birthPrecision },
      { date: memorial.deathDate, precision: memorial.deathPrecision },
    ),
  ].filter(Boolean);
  const lead = parts.join(", ");
  return [lead, memorial.dedication].filter(Boolean).join(". ").slice(0, 200);
}

export async function generateMetadata({ params }: PageProps<"/spomen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const view = await getPublicMemorialBySlug(slug);
  if (!view) {
    // Privatni, „samo s linkom" i nepostojeći spomen izvana izgledaju jednako.
    return { title: common.brand, robots: { index: false, follow: false } };
  }
  const { memorial } = view;
  return {
    title: memorial.name,
    description: describe(view),
    alternates: { canonical: `/spomen/${memorial.slug}` },
    robots: isIndexable({
      status: memorial.status,
      visibility: memorial.visibility,
      cover_photo_id: memorial.coverPhotoId,
      dedication: memorial.dedication,
      story_md: memorial.tier === "free" ? null : memorial.storyMd,
    })
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: { title: memorial.name, description: describe(view), type: "article", url: `/spomen/${memorial.slug}` },
  };
}

async function Content({ params }: Pick<PageProps<"/spomen/[slug]">, "params">) {
  const { slug } = await params;
  const publicView = await getPublicMemorialBySlug(slug);
  const view = publicView ?? (await getMemberMemorialBySlug(slug));
  if (!view) {
    notFound();
  }
  return (
    <MemorialScreen
      view={view}
      mode={view.memorial.status === "published" ? "public" : "preview"}
      notice={<PublishedNotice />}
      ownerBar={
        <Suspense fallback={null}>
          <OwnerBar memorial={view.memorial} />
        </Suspense>
      }
    />
  );
}

export default function MemorialPage(props: PageProps<"/spomen/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen rounded-b-[40px] bg-butter" />}>
      <Content params={props.params} />
    </Suspense>
  );
}
