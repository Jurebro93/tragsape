import "server-only";
import { revalidateTag } from "next/cache";
import { fill } from "@/lib/text";
import { checkout } from "@/messages/hr/checkout";
import { renderEmail, sendEmail, type EmailInput } from "@/server/email/send";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";
import type { FulfilledGift, OrderEffects } from "./types";

const KNOWN_STATUSES = ["fulfilled", "already_paid", "refunded", "already_refunded"] as const;
const SEND_NOW_TOLERANCE_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Čita JSON koji vraćaju `fulfill_order` i `refund_order`. Namjerno popustljivo: narudžba je
 * u tom trenutku već ispunjena u bazi, pa neočekivan oblik ne smije srušiti webhook.
 */
export function parseOrderEffects(value: unknown): OrderEffects {
  const root = isRecord(value) ? value : {};
  const status = KNOWN_STATUSES.find((known) => known === root.status) ?? "unknown";

  const memorialIds = new Set<string>();
  for (const entry of Array.isArray(root.memorials) ? root.memorials : []) {
    if (isRecord(entry) && typeof entry.memorial_id === "string") {
      memorialIds.add(entry.memorial_id);
    }
  }

  const gifts: FulfilledGift[] = [];
  for (const entry of Array.isArray(root.gifts) ? root.gifts : []) {
    if (!isRecord(entry)) {
      continue;
    }
    const code = textOrNull(entry.code);
    const recipientEmail = textOrNull(entry.recipient_email);
    if (!code || !recipientEmail) {
      continue;
    }
    gifts.push({
      code,
      tier: entry.tier === "portrait" ? "portrait" : "memorial",
      recipientEmail,
      recipientName: textOrNull(entry.recipient_name),
      buyerName: textOrNull(entry.buyer_name),
      message: textOrNull(entry.message),
    });
  }

  const issues: string[] = [];
  for (const entry of Array.isArray(root.issues) ? root.issues : []) {
    if (isRecord(entry) && typeof entry.issue === "string") {
      issues.push(typeof entry.line_id === "string" ? `${entry.issue}:${entry.line_id}` : entry.issue);
    }
  }

  return { status, memorialIds: Array.from(memorialIds), gifts, issues };
}

/**
 * Osvježava predmemoriju memorijala kojima se promijenio paket, objava ili geste, i zbroj
 * donacija. Greška se samo zapisuje: plaćanje je već provedeno, a predmemorija istječe sama.
 */
export function revalidateOrderTags(effects: OrderEffects): void {
  try {
    for (const memorialId of effects.memorialIds) {
      revalidateTag(`memorial:${memorialId}`, "max");
    }
    revalidateTag("donations", "max");
    // Objava ili povrat mijenjaju i popise javnih spomena.
    revalidateTag("livada", "max");
    revalidateTag("sitemap", "max");
  } catch (error) {
    console.error("[checkout] predmemorija nije osvježena", error);
  }
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function giftEmail(gift: FulfilledGift): EmailInput {
  const t = checkout.giftEmail;
  const buyer = gift.buyerName ? singleLine(gift.buyerName) : null;
  const recipient = gift.recipientName ? singleLine(gift.recipientName) : null;
  const message = (gift.message ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const { html, text } = renderEmail({
    heading: t.heading,
    paragraphs: [
      recipient ? fill(t.greetingWithName, { name: recipient }) : t.greeting,
      buyer ? fill(t.introWithBuyer, { buyer }) : t.intro,
      t.tiers[gift.tier],
      ...(message.length > 0 ? [t.messageLabel, ...message] : []),
    ],
    button: { label: t.cta, url: `${env.siteUrl}/poklon/${gift.code}` },
    footnote: t.noRush,
  });

  return {
    to: gift.recipientEmail,
    subject: buyer ? fill(t.subjectWithBuyer, { buyer }) : t.subject,
    html,
    text,
  };
}

/**
 * Radnje nakon što je narudžba ispunjena: zasad e-mail primatelju poklona.
 * Nikad ne baca grešku, jer neuspjela obavijest ne smije poništiti ispunjenu narudžbu.
 */
export async function afterOrderFulfilled(result: OrderEffects, orderId: string): Promise<void> {
  if (result.gifts.length === 0) {
    return;
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gifts")
      .select("code, send_at, sent_at")
      .in(
        "code",
        result.gifts.map((gift) => gift.code),
      );
    if (error) {
      throw new Error(error.message);
    }
    const schedule = new Map((data ?? []).map((row) => [row.code, row]));
    // „Odmah" u bazi znači trenutak ispunjenja po njezinu satu; minuta tolerancije pokriva
    // razliku između sata baze i sata poslužitelja.
    const dueBefore = Date.now() + SEND_NOW_TOLERANCE_MS;

    for (const gift of result.gifts) {
      const row = schedule.get(gift.code);
      // Poklon zakazan za kasniji datum ostaje neposlan (sent_at prazan) i čeka zakazani posao;
      // već poslan se ne šalje ponovno.
      if (!row || row.sent_at || new Date(row.send_at).getTime() > dueBefore) {
        continue;
      }
      await sendEmail(giftEmail(gift));
      const { error: markError } = await admin
        .from("gifts")
        .update({ sent_at: new Date().toISOString() })
        .eq("code", gift.code)
        .is("sent_at", null);
      if (markError) {
        console.error(`[checkout] poklon nije označen kao poslan (narudžba ${orderId})`, markError.message);
      }
    }
  } catch (error) {
    console.error(`[checkout] obavijesti nakon plaćanja nisu poslane (narudžba ${orderId})`, error);
  }
}
