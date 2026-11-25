import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { GiftForm } from "@/components/gift/gift-form";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { zagrebDay } from "@/lib/time";
import { gift } from "@/messages/hr/gift";
import { getViewer } from "@/server/auth";
import { isCheckoutConfigured } from "@/server/checkout/create";
import { createSessionClient } from "@/server/supabase/session";

export const metadata: Metadata = {
  title: gift.title,
  description: gift.metaDescription,
  alternates: { canonical: "/poklon" },
};

/** Obrazac ovisi o prijavi i cijenama, pa se učitava nakon statičnog dijela stranice. */
async function Purchase() {
  const viewer = await getViewer();
  if (!isCheckoutConfigured()) {
    return <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{gift.form.notConfigured}</p>;
  }
  if (!viewer || viewer.isAnonymous) {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold">{gift.signIn.title}</h2>
          <p className="text-plum-soft">{gift.signIn.body}</p>
        </div>
        <EmailCodeForm next="/poklon" />
      </Card>
    );
  }
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("products")
    .select("key, unit_amount_cents")
    .in("key", ["memorial", "memorial_portrait"]);
  const byKey = new Map((data ?? []).map((row) => [row.key, row.unit_amount_cents]));
  const memorial = byKey.get("memorial");
  const memorialPortrait = byKey.get("memorial_portrait");
  return (
    <GiftForm
      today={zagrebDay()}
      prices={memorial !== undefined ? { memorial, memorialPortrait: memorialPortrait ?? null } : null}
    />
  );
}

export default function GiftPage() {
  return (
    <PageShell headerTone="butter">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold">{gift.title}</h1>
          <p className="text-lg">{gift.intro}</p>
        </div>
        <Card className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">{gift.how.title}</h2>
          <ol className="flex flex-col gap-3">
            {gift.how.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sun font-bold">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Suspense fallback={<Card className="min-h-64" />}>
          <Purchase />
        </Suspense>
      </div>
    </PageShell>
  );
}
