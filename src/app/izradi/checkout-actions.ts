"use server";

import { redirect } from "next/navigation";
import { wizard } from "@/messages/hr/wizard";
import { getViewer } from "@/server/auth";
import { createCheckout } from "@/server/checkout/create";

export type CheckoutState = { error: string | null };

const VISIBILITIES = ["public", "unlisted", "private"] as const;

/** Kupnja paketa za vlastiti spomen. Cijenu računa poslužitelj; obrazac šalje samo izbor. */
export async function startMemorialCheckoutAction(
  memorialId: string,
  cancelPath: string,
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  if (formData.get("waiver") !== "on") {
    return { error: wizard.review.paid.waiverRequired };
  }
  const viewer = await getViewer();
  const productKey = formData.get("product") === "memorial_portrait" ? "memorial_portrait" : "memorial";
  const requested = String(formData.get("visibility") ?? "public");
  const visibility = VISIBILITIES.find((value) => value === requested) ?? "public";
  const promoCode = String(formData.get("promo") ?? "").trim() || null;
  const result = await createCheckout({
    viewer,
    items: [{ kind: "memorial", productKey, memorialId, publish: true, visibility }],
    promoCode,
    waiverAccepted: true,
    cancelPath,
  });
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(result.url);
}

/** Nadogradnja Memorijala na Memorijal + Portret. */
export async function startUpgradeCheckoutAction(
  memorialId: string,
  cancelPath: string,
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  if (formData.get("waiver") !== "on") {
    return { error: wizard.review.paid.waiverRequired };
  }
  const viewer = await getViewer();
  const result = await createCheckout({
    viewer,
    items: [{ kind: "upgrade", memorialId }],
    promoCode: String(formData.get("promo") ?? "").trim() || null,
    waiverAccepted: true,
    cancelPath,
  });
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(result.url);
}
