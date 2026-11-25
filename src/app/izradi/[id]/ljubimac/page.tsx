import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateBasicsAction } from "@/app/izradi/actions";
import { WizardFrame } from "@/components/wizard/frame";
import { PetBasicsForm } from "@/components/wizard/pet-basics-form";
import { toDateParts } from "@/lib/validation";
import { wizard } from "@/messages/hr/wizard";
import { getEditableMemorial } from "@/server/memorials/access";

export const metadata: Metadata = { title: wizard.steps[0], robots: { index: false } };

async function Content({ params }: Pick<PageProps<"/izradi/[id]/ljubimac">, "params">) {
  const { id } = await params;
  const editable = await getEditableMemorial(id);
  if (!editable) {
    notFound();
  }
  const { memorial } = editable;
  return (
    <WizardFrame step={1} memorialId={id} heading={wizard.pet.heading}>
      <PetBasicsForm
        action={updateBasicsAction.bind(null, id)}
        initial={{
          name: memorial.name,
          species: memorial.species ?? "",
          breed: memorial.breed ?? "",
          sex: memorial.sex ?? "",
          birth: toDateParts(memorial.birthDate, memorial.birthPrecision),
          death: toDateParts(memorial.deathDate, memorial.deathPrecision),
        }}
      />
    </WizardFrame>
  );
}

export default function EditBasicsPage(props: PageProps<"/izradi/[id]/ljubimac">) {
  return (
    <Suspense
      fallback={
        <WizardFrame step={1} heading={wizard.pet.heading}>
          <div className="min-h-96 rounded-3xl bg-white" />
        </WizardFrame>
      }
    >
      <Content params={props.params} />
    </Suspense>
  );
}
