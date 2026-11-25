import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { auth } from "@/messages/hr/auth";
import { getViewer, safeNextPath } from "@/server/auth";

export const metadata: Metadata = { title: auth.signIn.title, robots: { index: false } };

async function SignIn({ searchParams }: Pick<PageProps<"/prijava">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.dalje === "string" ? params.dalje : null);
  const viewer = await getViewer();
  if (viewer && !viewer.isAnonymous) {
    redirect(next);
  }
  return (
    <Card className="flex flex-col gap-4">
      {params.greska === "poveznica" ? (
        <p className="rounded-2xl bg-butter px-4 py-3 text-[15px] font-medium" role="alert">
          {auth.link.invalid}
        </p>
      ) : null}
      <EmailCodeForm next={next} />
    </Card>
  );
}

export default function SignInPage(props: PageProps<"/prijava">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold">{auth.signIn.title}</h1>
          <p className="text-plum-soft">{auth.signIn.intro}</p>
        </div>
        <Suspense fallback={<Card className="min-h-48" />}>
          <SignIn searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
