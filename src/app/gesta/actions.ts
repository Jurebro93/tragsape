"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readAttribution } from "@/lib/attribution";
import { zagrebDay } from "@/lib/time";
import { gesture as messages } from "@/messages/hr/gesture";
import { getViewer } from "@/server/auth";
import { createCheckout } from "@/server/checkout/create";
import type { CheckoutItem } from "@/server/checkout/types";
import { env } from "@/server/env";
import { withinRateLimit } from "@/server/public/visitor";

export type GestureState = { error: string | null };

const KINDS = ["svijeca", "sapica", "cvijet", "poslastica", "loptica"] as const;
const DURATIONS = ["gesture_7d", "gesture_30d", "gesture_365d"] as const;
const MAX_GESTURES = 5;

/**
 * Kupnja jedne ili više gesta. Može je pokrenuti i posjetitelj bez računa, pa se učestalost
 * ograničava po dnevnom sažetku adrese. Cijenu računa poslužitelj.
 */
export async function startGestureCheckoutAction(
  memorialId: string,
  cancelPath: string,
  _previous: GestureState,
  formData: FormData,
): Promise<GestureState> {
  if (formData.get("waiver") !== "on") {
    return { error: messages.waiverRequired };
  }
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "nepoznato";
  const ipHash = createHmac("sha256", env.hashSecret).update(`ip|${zagrebDay()}|${ip}`).digest("hex").slice(0, 40);
  if (!(await withinRateLimit(`geste:${ipHash}`, 3600, 12))) {
    return { error: messages.tooMany };
  }

  const kinds = formData.getAll("kind").map(String);
  const durations = formData.getAll("duration").map(String);
  const names = formData.getAll("display_name").map(String);
  const texts = formData.getAll("message").map(String);
  if (kinds.length === 0 || kinds.length > MAX_GESTURES || durations.length !== kinds.length) {
    return { error: messages.invalid };
  }
  const items: CheckoutItem[] = [];
  for (let index = 0; index < kinds.length; index += 1) {
    const gestureKind = KINDS.find((value) => value === kinds[index]);
    const productKey = DURATIONS.find((value) => value === durations[index]);
    if (!gestureKind || !productKey) {
      return { error: messages.invalid };
    }
    items.push({
      kind: "gesture",
      productKey,
      memorialId,
      gestureKind,
      displayName: names[index] ?? "",
      message: texts[index] ?? "",
    });
  }

  const result = await createCheckout({
    viewer: await getViewer(),
    items,
    waiverAccepted: true,
    cancelPath,
    attribution: readAttribution(formData),
  });
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(result.url);
}
