import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LetterForm } from "@/components/owner/letter-form";
import { OwnerHeader } from "@/components/owner/page-parts";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { zagrebDay } from "@/lib/time";
import { owner } from "@/messages/hr/owner";
import { isUuid, requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { saveLetterAction } from "../actions";

const t = owner.letters;

export const metadata: Metadata = { title: t.editTitle, robots: { index: false } };

async function EditLetter({ params }: Pick<PageProps<"/moji-ljubimci/[id]/pisma/[pismoId]">, "params">) {
  const { id, pismoId } = await params;
  const list = `/moji-ljubimci/${id}/pisma`;
  const { viewer, memorial, paid } = await requireOwnerPage(id, `${list}/${pismoId}`);
  if (!isUuid(pismoId)) {
    notFound();
  }
  if (!paid) {
    redirect(list);
  }
  const supabase = await createSessionClient();
  const { data: letter } = await supabase
    .from("letters")
    .select("id, written_on, title, body, visibility")
    .eq("id", pismoId)
    .eq("memorial_id", id)
    .eq("author_id", viewer.id)
    .maybeSingle();
  if (!letter) {
    notFound();
  }
  return (
    <div className="flex flex-col gap-5">
      <OwnerHeader
        memorialId={id}
        petName={memorial.name}
        title={t.editTitle}
        back={{ href: list, label: t.backToList }}
      />
      <LetterForm
        action={saveLetterAction.bind(null, id, letter.id)}
        initial={{
          writtenOn: letter.written_on,
          title: letter.title ?? "",
          body: letter.body,
          visibility: letter.visibility === "public" ? "public" : "private",
        }}
        maxDate={zagrebDay()}
        cancelHref={list}
      />
    </div>
  );
}

export default function EditLetterPage(props: PageProps<"/moji-ljubimci/[id]/pisma/[pismoId]">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <EditLetter params={props.params} />
      </Suspense>
    </PageShell>
  );
}
