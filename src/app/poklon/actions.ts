"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { emailSchema } from "@/lib/validation";
import { zagrebDay } from "@/lib/time";
import { gift as messages } from "@/messages/hr/gift";
import { getViewer } from "@/server/auth";
import { createCheckout } from "@/server/checkout/create";
import { createSessionClient } from "@/server/supabase/session";

export type GiftState = { error: string | null };

/** Kupnja poklona. Cijenu računa poslužitelj; obrazac šalje samo izbor i poruku. */
export async function startGiftCheckoutAction(_previous: GiftState, formData: FormData): Promise<GiftState> {
  if (formData.get("waiver") !== "on") {
    return { error: messages.form.waiverRequired };
  }
  const recipient = emailSchema.safeParse(String(formData.get("recipient_email") ?? "").trim().toLowerCase());
  if (!recipient.success) {
    return { error: messages.form.invalidEmail };
  }
  let sendAt: string | undefined;
  if (formData.get("send") === "later") {
    const date = String(formData.get("send_date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < zagrebDay()) {
      return { error: messages.form.invalidDate };
    }
    // Jutro odabranog dana po hrvatskom vremenu (7:00 UTC je 8:00 zimi, 9:00 ljeti).
    sendAt = date === zagrebDay() ? undefined : `${date}T07:00:00+00:00`;
  }
  const viewer = await getViewer();
  const result = await createCheckout({
    viewer,
    items: [
      {
        kind: "gift",
        productKey: formData.get("product") === "memorial_portrait" ? "memorial_portrait" : "memorial",
        recipientEmail: recipient.data,
        recipientName: String(formData.get("recipient_name") ?? ""),
        buyerName: String(formData.get("buyer_name") ?? ""),
        message: String(formData.get("message") ?? ""),
        sendAt,
      },
    ],
    promoCode: String(formData.get("promo") ?? "").trim() || null,
    waiverAccepted: true,
    cancelPath: "/poklon",
  });
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(result.url);
}

/** Primatelj preuzima poklon na svoj račun. Traži klik na gumb, pa ga skeneri pošte ne mogu potrošiti. */
export async function redeemGiftAction(code: string, _previous: GiftState): Promise<GiftState> {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    redirect(`/prijava?dalje=${encodeURIComponent(`/poklon/${code}`)}`);
  }
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("redeem_gift", { p_code: code });
  if (error) {
    if (error.message.includes("already_redeemed")) {
      return { error: messages.redeem.takenByOther };
    }
    if (error.message.includes("not_found")) {
      return { error: messages.redeem.notFound };
    }
    return { error: messages.redeem.error };
  }
  redirect(`/poklon/${code}`);
}

/** Primjena preuzetog poklona (ili ranije plaćenog paketa) na vlastiti besplatni spomen. */
export async function applyEntitlementAction(
  entitlementId: string,
  memorialId: string,
  _previous: GiftState,
): Promise<GiftState> {
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("apply_entitlement", {
    p_entitlement_id: entitlementId,
    p_memorial_id: memorialId,
  });
  if (error) {
    return { error: messages.redeem.error };
  }
  const { data: memorial } = await supabase.from("memorials").select("id, slug").eq("id", memorialId).maybeSingle();
  updateTag(`memorial:${memorialId}`);
  if (memorial) {
    updateTag(`memorial-slug:${memorial.slug}`);
  }
  redirect(`/moji-ljubimci/${memorialId}`);
}
