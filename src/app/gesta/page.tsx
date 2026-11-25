import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";
import { GestureForm } from "@/components/gesture/gesture-form";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/text";
import { gesture } from "@/messages/hr/gesture";
import { isCheckoutConfigured } from "@/server/checkout/create";
import { createSessionClient } from "@/server/supabase/session";

export const metadata: Metadata = { title: gesture.title, robots: { index: false, follow: false } };

function first(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single && single !== "" ? single : null;
}

async function Purchase({ searchParams }: Pick<PageProps<"/gesta">, "searchParams">) {
  const params = await searchParams;
  const memorialId = first(params.m);
  const shareKey = first(params.k);
  const validKey = shareKey && /^[a-f0-9]{32}$/.test(shareKey) ? shareKey : null;
  if (!memorialId || !/^[0-9a-f-]{36}$/i.test(memorialId)) {
    return <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{gesture.unavailable}</p>;
  }
  // Spomen se čita kao posjetitelj (uz ključ za „samo s poveznicom"), pa RLS odlučuje smije li ga vidjeti.
  const supabase = await createSessionClient({ shareKey: validKey });
  const [{ data: memorial }, { data: products }] = await Promise.all([
    supabase
      .from("memorials")
      .select("id, slug, name, status, visibility")
      .eq("id", memorialId)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("products")
      .select("key, unit_amount_cents")
      .in("key", ["gesture_7d", "gesture_30d", "gesture_365d"]),
  ]);
  const byKey = new Map((products ?? []).map((row) => [row.key, row.unit_amount_cents]));
  const prices = {
    gesture_7d: byKey.get("gesture_7d"),
    gesture_30d: byKey.get("gesture_30d"),
    gesture_365d: byKey.get("gesture_365d"),
  };
  if (
    !memorial ||
    memorial.visibility === "private" ||
    prices.gesture_7d === undefined ||
    prices.gesture_30d === undefined ||
    prices.gesture_365d === undefined
  ) {
    return <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{gesture.unavailable}</p>;
  }
  const backPath = memorial.visibility === "unlisted" && validKey ? `/s/${validKey}` : `/spomen/${memorial.slug}`;
  return (
    <>
      <p className="font-medium">{fill(gesture.forMemorial, { name: memorial.name })}</p>
      {isCheckoutConfigured() ? (
        <GestureForm
          memorialId={memorial.id}
          cancelPath={backPath}
          prices={{
            gesture_7d: prices.gesture_7d,
            gesture_30d: prices.gesture_30d,
            gesture_365d: prices.gesture_365d,
          }}
        />
      ) : (
        <p className="rounded-3xl bg-butter px-5 py-4 font-medium">{gesture.notConfigured}</p>
      )}
      <ButtonLink href={backPath as Route} variant="quiet" className="self-start">
        {gesture.back}
      </ButtonLink>
    </>
  );
}

export default function GesturePage(props: PageProps<"/gesta">) {
  return (
    <PageShell headerTone="butter">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold">{gesture.title}</h1>
          <p className="text-plum-soft">{gesture.intro}</p>
        </div>
        <Suspense fallback={<Card className="min-h-64" />}>
          <Purchase searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
