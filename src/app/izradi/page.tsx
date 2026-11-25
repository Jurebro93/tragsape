import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { startDraftAction } from "@/app/izradi/actions";
import { ArrowRightIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { WizardFrame } from "@/components/wizard/frame";
import { PetBasicsForm } from "@/components/wizard/pet-basics-form";
import { wizard } from "@/messages/hr/wizard";
import { listMyMemorials } from "@/server/memorials/access";

export const metadata: Metadata = {
  title: wizard.title,
  description: wizard.intro,
};

const stepPaths = ["ljubimac", "prica", "pregled"];

/** Započeti nacrti ovog posjetitelja. Čita sesiju, pa se učitava nakon statičnog dijela stranice. */
async function ExistingDrafts() {
  const drafts = (await listMyMemorials()).filter((memorial) => memorial.status === "draft");
  if (drafts.length === 0) {
    return null;
  }
  return (
    <Card className="flex flex-col gap-2 bg-butter">
      <h2 className="text-xl font-extrabold">{wizard.drafts.title}</h2>
      <ul className="flex flex-col">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link
              href={`/izradi/${draft.id}/${stepPaths[Math.min(draft.draftStep, 3) - 1]}` as Route}
              className="flex min-h-12 items-center justify-between gap-3 font-semibold text-plum no-underline hover:underline"
            >
              <span>{draft.name || wizard.drafts.untitled}</span>
              <span className="inline-flex items-center gap-1 text-teal">
                {wizard.drafts.continue}
                <ArrowRightIcon size={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function CreatePage() {
  return (
    <WizardFrame step={1} heading={wizard.pet.heading}>
      <p className="-mt-2 text-plum-soft">{wizard.intro}</p>
      <Suspense fallback={null}>
        <ExistingDrafts />
      </Suspense>
      <PetBasicsForm action={startDraftAction} withAttribution />
    </WizardFrame>
  );
}
