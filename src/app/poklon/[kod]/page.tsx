import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { ApplyEntitlementButton, RedeemButton } from "@/components/gift/redeem-forms";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/text";
import { account } from "@/messages/hr/account";
import { gift } from "@/messages/hr/gift";
import { getViewer } from "@/server/auth";
import { listMyMemorials } from "@/server/memorials/access";
import { createSessionClient } from "@/server/supabase/session";

// Poveznica na poklon je osobna: ne indeksira se i ne šalje adresu dalje.
export const metadata: Metadata = {
  title: gift.redeem.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const text = gift.redeem;

async function Redeem({ params }: Pick<PageProps<"/poklon/[kod]">, "params">) {
  const { kod } = await params;
  const valid = /^[a-f0-9]{24}$/.test(kod);
  const supabase = await createSessionClient();
  const { data } = valid ? await supabase.rpc("gift_preview", { p_code: kod }) : { data: null };
  const preview = data?.[0];
  if (!preview) {
    return <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{text.notFound}</p>;
  }
  const viewer = await getViewer();
  const signedIn = Boolean(viewer && !viewer.isAnonymous);
  const tier = preview.tier === "portrait" ? "portrait" : "memorial";

  const summary = (
    <Card className="flex flex-col gap-3">
      <p className="text-lg font-medium">
        {preview.buyer_name ? fill(text.fromBuyer, { buyer: preview.buyer_name }) : text.fromSomeone}
      </p>
      <p>{text.tiers[tier]}</p>
      {preview.message ? (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-butter p-4">
          <span className="text-sm font-bold">{text.messageLabel}</span>
          <p className="whitespace-pre-line [overflow-wrap:anywhere]">{preview.message}</p>
        </div>
      ) : null}
      <p className="text-sm text-plum-soft">{text.noRush}</p>
    </Card>
  );

  if (preview.redeemed && !preview.redeemed_by_me) {
    return (
      <>
        {summary}
        <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{text.takenByOther}</p>
      </>
    );
  }

  if (!preview.redeemed) {
    return (
      <>
        {summary}
        {signedIn ? (
          <RedeemButton code={kod} />
        ) : (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-extrabold">{text.signIn.title}</h2>
              <p className="text-plum-soft">{text.signIn.body}</p>
            </div>
            <EmailCodeForm next={`/poklon/${kod}`} />
          </Card>
        )}
      </>
    );
  }

  // Poklon je na ovom računu: primjena na postojeći besplatni spomen ili izrada novog.
  if (preview.entitlement_status !== "available" || !preview.entitlement_id) {
    return (
      <>
        {summary}
        <Card className="flex flex-col gap-3">
          <p className="font-medium">{text.applied}</p>
          <ButtonLink href="/moji-ljubimci" variant="secondary">
            {text.openMemorials}
          </ButtonLink>
        </Card>
      </>
    );
  }
  const freeMemorials = (await listMyMemorials()).filter((memorial) => memorial.tier === "free");
  return (
    <>
      {summary}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-teal" role="status">
            {text.accepted}
          </p>
          <h2 className="text-2xl font-extrabold">{text.chooseTitle}</h2>
        </div>
        {freeMemorials.map((memorial) => (
          <div key={memorial.id} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-4">
            <span className="font-display text-xl font-extrabold">{memorial.name || account.untitled}</span>
            <span className="text-sm text-plum-soft">{account.status[memorial.status]}</span>
            <ApplyEntitlementButton entitlementId={preview.entitlement_id as string} memorialId={memorial.id} />
          </div>
        ))}
        <ButtonLink href="/izradi">{text.createNew}</ButtonLink>
      </Card>
    </>
  );
}

export default function RedeemGiftPage(props: PageProps<"/poklon/[kod]">) {
  return (
    <PageShell headerTone="butter">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">{text.title}</h1>
        <Suspense fallback={<Card className="min-h-64" />}>
          <Redeem params={props.params} />
        </Suspense>
      </div>
    </PageShell>
  );
}
