import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WizardFrame } from "@/components/wizard/frame";
import { StoryForm } from "@/components/wizard/story-form";
import { FREE_PHOTO_LIMIT, PAID_PHOTO_LIMIT, isPaid } from "@/lib/memorial";
import { wizard } from "@/messages/hr/wizard";
import { getEditableMemorial } from "@/server/memorials/access";

export const metadata: Metadata = { title: wizard.steps[1], robots: { index: false } };

async function Content({ params }: Pick<PageProps<"/izradi/[id]/prica">, "params">) {
  const { id } = await params;
  const editable = await getEditableMemorial(id);
  if (!editable) {
    notFound();
  }
  const { memorial, photos } = editable;
  const paid = isPaid(memorial.tier);
  return (
    <WizardFrame step={2} memorialId={id} heading={wizard.story.heading}>
      <StoryForm
        memorialId={id}
        isPaid={paid}
        photoLimit={paid ? PAID_PHOTO_LIMIT : FREE_PHOTO_LIMIT}
        photos={photos}
        coverPhotoId={memorial.coverPhotoId}
        initial={{
          dedication: memorial.dedication ?? "",
          story: memorial.storyMd ?? "",
          nicknames: memorial.nicknames.join(", "),
          traits: memorial.traits.join(", "),
          toy: memorial.favoriteToy ?? "",
          treat: memorial.favoriteTreat ?? "",
          place: memorial.favoritePlace ?? "",
          habits: memorial.funnyHabits ?? "",
          video: memorial.videoUrl ?? "",
        }}
      />
    </WizardFrame>
  );
}

export default function StoryPage(props: PageProps<"/izradi/[id]/prica">) {
  return (
    <Suspense
      fallback={
        <WizardFrame step={2} heading={wizard.story.heading}>
          <div className="min-h-96 rounded-3xl bg-white" />
        </WizardFrame>
      }
    >
      <Content params={props.params} />
    </Suspense>
  );
}
