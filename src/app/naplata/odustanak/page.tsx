import type { Metadata } from "next";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { checkout } from "@/messages/hr/checkout";

export const metadata: Metadata = {
  title: checkout.cancel.metaTitle,
  robots: { index: false, follow: false },
};

/** Zadano odredište kad kupac odustane na Stripeovoj stranici. Ništa ne čita, pa je statična. */
export default function CheckoutCancelPage() {
  const t = checkout.cancel;
  return (
    <PageShell>
      <Card className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">{t.title}</h1>
        <p>{t.body}</p>
        <div className="flex flex-col gap-3">
          <ButtonLink href="/">{t.home}</ButtonLink>
          <ButtonLink href="/moji-ljubimci" variant="secondary">
            {t.myPets}
          </ButtonLink>
        </div>
      </Card>
    </PageShell>
  );
}
