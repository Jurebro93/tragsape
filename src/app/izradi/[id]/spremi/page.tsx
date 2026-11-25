import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { wizard } from "@/messages/hr/wizard";
import { getViewer } from "@/server/auth";
import { getEditableMemorial } from "@/server/memorials/access";

export const metadata: Metadata = { title: wizard.saveLater, robots: { index: false } };

/** Nacrt se veže uz e-mail, pa mu se vlasnik može vratiti s bilo kojeg uređaja. */
async function Save({ params }: Pick<PageProps<"/izradi/[id]/spremi">, "params">) {
  const { id } = await params;
  const [editable, viewer] = await Promise.all([getEditableMemorial(id), getViewer()]);
  if (!editable) {
    notFound();
  }
  const back = `/izradi/${id}/prica`;
  if (viewer && !viewer.isAnonymous) {
    redirect("/moji-ljubimci");
  }
  return (
    <>
      <Card className="flex flex-col gap-4">
        <p>{wizard.save.body}</p>
        <EmailCodeForm next={back} sendLabel={wizard.save.send} />
      </Card>
      <ButtonLink href={back as Route} variant="quiet" className="self-start">
        {wizard.save.back}
      </ButtonLink>
    </>
  );
}

export default function SaveDraftPage(props: PageProps<"/izradi/[id]/spremi">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">{wizard.saveLater}</h1>
        <Suspense fallback={<Card className="min-h-48" />}>
          <Save params={props.params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
