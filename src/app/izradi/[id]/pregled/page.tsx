import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import { WizardFrame } from "@/components/wizard/frame";
import { PreviewSwitcher } from "@/components/wizard/preview-switcher";
import { PublishPanel } from "@/components/wizard/publish-panel";
import { ButtonLink } from "@/components/ui/button";
import { isPaid, type MemorialView } from "@/lib/memorial";
import { wizard } from "@/messages/hr/wizard";
import { getViewer } from "@/server/auth";
import { isCheckoutConfigured } from "@/server/checkout/create";
import { getPreviewView } from "@/server/memorials/access";
import { createSessionClient } from "@/server/supabase/session";

export const metadata: Metadata = { title: wizard.steps[2], robots: { index: false } };

async function loadPrices() {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("products")
    .select("key, unit_amount_cents, base_amount_cents")
    .in("key", ["memorial", "memorial_portrait"]);
  const byKey = new Map((data ?? []).map((row) => [row.key, row]));
  const memorial = byKey.get("memorial");
  const memorialPortrait = byKey.get("memorial_portrait");
  // Portret se nudi samo dok je uključen u cjeniku.
  return memorial !== undefined
    ? {
        memorial: memorial.unit_amount_cents,
        memorialPortrait: memorialPortrait?.unit_amount_cents ?? null,
        base: { memorial: memorial.base_amount_cents, memorialPortrait: memorialPortrait?.base_amount_cents ?? null },
      }
    : null;
}

/** Ima li nacrt sadržaj koji se vidi tek uz Memorijal. */
function hasPaidContent(view: MemorialView): boolean {
  const m = view.memorial;
  return (
    view.photos.length > 1 ||
    Boolean(m.storyMd || m.favoriteToy || m.favoriteTreat || m.favoritePlace || m.funnyHabits) ||
    m.traits.length > 0 ||
    m.nicknames.length > 0
  );
}

async function Content({ params }: Pick<PageProps<"/izradi/[id]/pregled">, "params">) {
  const { id } = await params;
  const [view, viewer, prices] = await Promise.all([getPreviewView(id), getViewer(), loadPrices()]);
  let available: { id: string; tier: "memorial" | "portrait" } | null = null;
  if (viewer && !viewer.isAnonymous && view && view.memorial.tier === "free") {
    const supabase = await createSessionClient();
    const { data } = await supabase
      .from("entitlements")
      .select("id, tier")
      .eq("owner_id", viewer.id)
      .eq("status", "available")
      .order("created_at", { ascending: true })
      .limit(1);
    if (data && data.length > 0) {
      available = { id: data[0].id, tier: data[0].tier === "portrait" ? "portrait" : "memorial" };
    }
  }
  if (!view) {
    notFound();
  }
  if (isPaid(view.memorial.tier) && view.memorial.status === "published") {
    redirect(`/moji-ljubimci/${id}`);
  }
  const alreadyPublished = view.memorial.status === "published";
  const paidView: MemorialView = { ...view, memorial: { ...view.memorial, tier: "memorial" } };
  return (
    <WizardFrame step={3} memorialId={id} heading={wizard.review.heading}>
      <div className="-mt-2 flex items-center justify-between gap-3">
        <p className="text-plum-soft">{wizard.review.intro}</p>
        <ButtonLink href={`/izradi/${id}/prica`} variant="quiet" className="shrink-0">
          {wizard.review.edit}
        </ButtonLink>
      </div>
      <PreviewSwitcher
        freeLabel={wizard.review.free.name}
        paidLabel={wizard.review.paid.memorial}
        free={<MemorialScreen view={view} mode="preview" />}
        paid={
          isPaid(view.memorial.tier) || !hasPaidContent(view) ? null : <MemorialScreen view={paidView} mode="preview" />
        }
      />
      <PublishPanel
        memorialId={id}
        canPublish={Boolean(viewer && !viewer.isAnonymous)}
        prices={prices}
        checkoutReady={isCheckoutConfigured()}
        allowFree={!alreadyPublished}
        available={available}
      />
    </WizardFrame>
  );
}

export default function ReviewPage(props: PageProps<"/izradi/[id]/pregled">) {
  return (
    <Suspense
      fallback={
        <WizardFrame step={3} heading={wizard.review.heading}>
          <div className="min-h-96 rounded-3xl bg-white" />
        </WizardFrame>
      }
    >
      <Content params={props.params} />
    </Suspense>
  );
}
