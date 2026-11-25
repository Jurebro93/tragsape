import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/owner/accept-invite-form";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/text";
import { owner } from "@/messages/hr/owner";
import { getViewer } from "@/server/auth";
import { acceptInviteAction } from "./actions";

const t = owner.invite;

export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };

/**
 * Pozivnica suradniku. Otvaranje stranice ne mijenja ništa: token se troši tek kad prijavljeni
 * korisnik pritisne gumb.
 */
async function Invite({ params }: Pick<PageProps<"/pozivnica/[token]">, "params">) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return (
      <Card>
        <p role="alert">{t.errors.invalid}</p>
      </Card>
    );
  }
  const viewer = await getViewer();
  const signedIn = viewer !== null && !viewer.isAnonymous;
  return (
    <>
      <Card className="flex flex-col gap-2">
        <p>{t.body}</p>
        <p className="text-[15px] text-plum-soft">{t.can}</p>
        <p className="text-[15px] text-plum-soft">{t.cannot}</p>
      </Card>
      <Card className="flex flex-col gap-4">
        {signedIn ? (
          <>
            <p className="[overflow-wrap:anywhere]">{fill(t.acceptingAs, { email: viewer.email ?? "" })}</p>
            <AcceptInviteForm action={acceptInviteAction.bind(null, token)} />
          </>
        ) : (
          <>
            <p>{t.signIn}</p>
            <ButtonLink href={`/prijava?dalje=${encodeURIComponent(`/pozivnica/${token}`)}` as Route}>
              {t.signInAction}
            </ButtonLink>
          </>
        )}
        <p className="text-sm text-plum-soft">{t.once}</p>
      </Card>
    </>
  );
}

export default function InvitePage(props: PageProps<"/pozivnica/[token]">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">{t.title}</h1>
        <Suspense fallback={<Card className="min-h-48" />}>
          <Invite params={props.params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
