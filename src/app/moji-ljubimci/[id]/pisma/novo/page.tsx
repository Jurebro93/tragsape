import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LetterForm } from "@/components/owner/letter-form";
import { OwnerHeader } from "@/components/owner/page-parts";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { zagrebDay } from "@/lib/time";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { saveLetterAction } from "../actions";

const t = owner.letters;

export const metadata: Metadata = { title: t.newTitle, robots: { index: false } };

async function NewLetter({ params }: Pick<PageProps<"/moji-ljubimci/[id]/pisma/novo">, "params">) {
  const { id } = await params;
  const list = `/moji-ljubimci/${id}/pisma`;
  const { memorial, paid } = await requireOwnerPage(id, `${list}/novo`);
  if (!paid) {
    redirect(list);
  }
  const today = zagrebDay();
  return (
    <div className="flex flex-col gap-5">
      <OwnerHeader
        memorialId={id}
        petName={memorial.name}
        title={t.newTitle}
        back={{ href: list, label: t.backToList }}
      />
      <LetterForm
        action={saveLetterAction.bind(null, id, null)}
        initial={{ writtenOn: today, title: "", body: "", visibility: "private" }}
        maxDate={today}
        cancelHref={list}
      />
    </div>
  );
}

export default function NewLetterPage(props: PageProps<"/moji-ljubimci/[id]/pisma/novo">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <NewLetter params={props.params} />
      </Suspense>
    </PageShell>
  );
}
