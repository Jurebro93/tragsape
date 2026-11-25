import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StoryHelperForm } from "@/components/wizard/story-helper-form";
import { isPaid } from "@/lib/memorial";
import { storyHelper } from "@/messages/hr/story-helper";
import { isStoryHelperConfigured } from "@/server/ai/story";
import { getEditableMemorial } from "@/server/memorials/access";

export const metadata: Metadata = { title: storyHelper.title, robots: { index: false } };

async function Helper({ params }: Pick<PageProps<"/izradi/[id]/pomocnik">, "params">) {
  const { id } = await params;
  const editable = await getEditableMemorial(id);
  if (!editable) {
    notFound();
  }
  const back = (
    <ButtonLink href={`/izradi/${id}/prica` as Route} variant="quiet" className="self-start">
      {storyHelper.back}
    </ButtonLink>
  );
  if (!isPaid(editable.memorial.tier)) {
    return (
      <>
        <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{storyHelper.errors.paid}</p>
        {back}
      </>
    );
  }
  if (!isStoryHelperConfigured()) {
    return (
      <>
        <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{storyHelper.errors.notConfigured}</p>
        {back}
      </>
    );
  }
  return (
    <>
      <StoryHelperForm memorialId={id} hasStory={Boolean(editable.memorial.storyMd)} />
      {back}
    </>
  );
}

export default function StoryHelperPage(props: PageProps<"/izradi/[id]/pomocnik">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold">{storyHelper.title}</h1>
          <p className="text-plum-soft">{storyHelper.intro}</p>
        </div>
        <Suspense fallback={<Card className="min-h-96" />}>
          <Helper params={props.params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
