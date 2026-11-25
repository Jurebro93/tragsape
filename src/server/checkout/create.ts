import "server-only";
import type Stripe from "stripe";
import { z } from "zod";
import { priceCart, type CartItem, type PricedCart, type PricingProduct, type PricingPromo, type ProductKey } from "@/lib/pricing";
import { fill } from "@/lib/text";
import { checkout } from "@/messages/hr/checkout";
import type { Viewer } from "@/server/auth";
import { env } from "@/server/env";
import { getStripe } from "@/server/stripe/client";
import { createAdminClient } from "@/server/supabase/admin";
import type { Json } from "@/server/supabase/database.types";
import { afterOrderFulfilled, parseOrderEffects, revalidateOrderTags } from "./after-payment";
import type { CheckoutError, CheckoutFailure, CheckoutItem, CheckoutResult, QuoteResult } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

const MAX_LINES = 20;
/** Najmanji iznos koji Stripe naplaćuje u eurima. */
const STRIPE_MIN_CHARGE_CENTS = 50;
const SUCCESS_PATH = "/naplata/uspjeh";
const DEFAULT_CANCEL_PATH = "/naplata/odustanak";

// ---------------------------------------------------------------------------------------------
// Provjera ulaza. Zahtjev dolazi iz preglednika, pa se tipovima ne vjeruje; nepoznata polja
// (npr. podmetnut iznos) shema odbacuje.
// ---------------------------------------------------------------------------------------------

/** Jedan red teksta: kontrolni znakovi i prijelomi postaju razmak (ime završava u naslovu e-maila). */
const cleanLine = (value: string) => value.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ").trim();
/** Tekst u više redova: prijelomi ostaju, ostali kontrolni znakovi postaju razmak. */
const cleanText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\P{Cc}\n]+/gu, " ")
    .trim();

const optionalLine = (max: number) =>
  z
    .string()
    .transform(cleanLine)
    .pipe(z.string().max(max))
    .nullish()
    .transform((value) => value || undefined);

const optionalText = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max))
    .nullish()
    .transform((value) => value || undefined);

const itemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("memorial"),
    productKey: z.enum(["memorial", "memorial_portrait"]),
    memorialId: z.uuid(),
    publish: z.boolean(),
    visibility: z.enum(["public", "unlisted", "private"]).optional(),
  }),
  z.object({
    kind: z.literal("upgrade"),
    memorialId: z.uuid(),
  }),
  z.object({
    kind: z.literal("gift"),
    productKey: z.enum(["memorial", "memorial_portrait"]),
    recipientEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    recipientName: optionalLine(80),
    buyerName: optionalLine(80),
    message: optionalText(1000),
    sendAt: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString())
      .optional(),
  }),
  z.object({
    kind: z.literal("gesture"),
    productKey: z.enum(["gesture_7d", "gesture_30d", "gesture_365d"]),
    memorialId: z.uuid(),
    gestureKind: z.enum(["svijeca", "sapica", "cvijet", "poslastica", "loptica"]),
    // Prazno ime je dopušteno: baza tada upisuje „Netko tko pamti".
    displayName: z.string().transform(cleanLine).pipe(z.string().max(60)),
    message: optionalLine(200),
  }),
]);

const itemsSchema = z.array(itemSchema).min(1).max(MAX_LINES);

type ParsedItem = z.infer<typeof itemSchema>;

function fail(error: CheckoutError, message: string): CheckoutFailure {
  return { ok: false, error, message };
}

function normalizePromoCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return code === "" ? null : code;
}

/** Dopušta samo putanju unutar vlastite stranice; inače null. */
function sameSitePath(path: unknown): string | null {
  if (
    typeof path !== "string" ||
    path.length > 500 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\p{Cc}]/u.test(path)
  ) {
    return null;
  }
  try {
    const base = new URL(env.siteUrl);
    const url = new URL(path, base);
    return url.origin === base.origin ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

/** Atribucija je slobodan JSON iz poveznice; sprema se samo ako je malen i ispravan. */
function cleanAttribution(value: Record<string, unknown> | null | undefined): Json | null {
  if (!value) {
    return null;
  }
  try {
    const json = JSON.stringify(value);
    return json.length <= 2000 ? (JSON.parse(json) as Json) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Podaci iz baze. Čitaju se servisnim ključem jer kupac ne smije vidjeti kodove ni tuđe memorijale.
// ---------------------------------------------------------------------------------------------

type MemorialRow = { id: string; owner_id: string; tier: string; status: string; visibility: string; name: string };

async function loadMemorials(admin: Admin, ids: string[]): Promise<Map<string, MemorialRow>> {
  if (ids.length === 0) {
    return new Map();
  }
  const { data, error } = await admin
    .from("memorials")
    .select("id, owner_id, tier, status, visibility, name")
    .in("id", ids);
  if (error) {
    throw new Error(`memorials: ${error.message}`);
  }
  return new Map(data.map((row) => [row.id, row]));
}

/** Najviše dva plaćena memorijala kupca: dovoljno da se za svaku stavku zna postoji li „drugi". */
async function loadPaidMemorialIds(admin: Admin, ownerId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("memorials")
    .select("id")
    .eq("owner_id", ownerId)
    .in("tier", ["memorial", "portrait"])
    .limit(2);
  if (error) {
    throw new Error(`paid memorials: ${error.message}`);
  }
  return data.map((row) => row.id);
}

async function loadProducts(admin: Admin): Promise<Record<string, PricingProduct>> {
  const { data, error } = await admin.from("products").select("key, unit_amount_cents").eq("active", true);
  if (error) {
    throw new Error(`products: ${error.message}`);
  }
  return Object.fromEntries(data.map((row) => [row.key, { unitAmountCents: row.unit_amount_cents }]));
}

async function loadRepeatDiscountPct(admin: Admin): Promise<number> {
  const { data, error } = await admin.from("settings").select("repeat_discount_pct").maybeSingle();
  if (error || !data) {
    throw new Error(`settings: ${error?.message ?? "nema retka"}`);
  }
  return data.repeat_discount_pct;
}

/** Kod koji trenutačno vrijedi, ili null. Kupcu se ne otkriva zašto kod ne vrijedi. */
async function loadPromo(admin: Admin, code: string): Promise<PricingPromo | null> {
  if (code.length < 3 || code.length > 40) {
    return null;
  }
  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, kind, partner_id, discount_type, discount_value, applies_to, max_redemptions, redeemed_count, valid_from, valid_to, active",
    )
    .eq("code", code)
    .maybeSingle();
  if (error) {
    throw new Error(`promo_codes: ${error.message}`);
  }
  if (!data || !data.active) {
    return null;
  }
  const now = Date.now();
  if (data.valid_from && new Date(data.valid_from).getTime() > now) {
    return null;
  }
  if (data.valid_to && new Date(data.valid_to).getTime() < now) {
    return null;
  }
  if (data.max_redemptions !== null && data.redeemed_count >= data.max_redemptions) {
    return null;
  }
  if (data.partner_id) {
    const { data: partner, error: partnerError } = await admin
      .from("partners")
      .select("active")
      .eq("id", data.partner_id)
      .maybeSingle();
    if (partnerError) {
      throw new Error(`partners: ${partnerError.message}`);
    }
    if (!partner?.active) {
      return null;
    }
  }
  return {
    id: data.id,
    kind: data.kind === "partner" ? "partner" : "promo",
    discountType: data.discount_type === "fixed" ? "fixed" : "percent",
    discountValue: data.discount_value,
    appliesTo: data.applies_to,
  };
}

// ---------------------------------------------------------------------------------------------
// Košarica: dozvole, cijene, popusti
// ---------------------------------------------------------------------------------------------

function productKeyOf(item: ParsedItem): ProductKey {
  return item.kind === "upgrade" ? "upgrade_portrait" : item.productKey;
}

/** Podaci stavke koje `fulfill_order` čita iz `order_lines.meta`. */
function lineMeta(item: ParsedItem): { [key: string]: Json | undefined } {
  switch (item.kind) {
    case "memorial":
      return { publish: item.publish, visibility: item.visibility };
    case "upgrade":
      return {};
    case "gift":
      return {
        recipient_email: item.recipientEmail,
        recipient_name: item.recipientName,
        buyer_name: item.buyerName,
        message: item.message,
        send_at: item.sendAt,
      };
    case "gesture":
      return { kind: item.gestureKind, display_name: item.displayName, message: item.message };
  }
}

/** Naziv stavke na Stripeovoj stranici za plaćanje. */
function lineName(item: ParsedItem): string {
  const t = checkout.lines;
  switch (item.kind) {
    case "memorial":
      return t.products[item.productKey];
    case "upgrade":
      return t.products.upgrade_portrait;
    case "gift":
      return fill(t.gift, { product: t.products[item.productKey] });
    case "gesture":
      return fill(t.gesture, {
        gesture: t.gestureKinds[item.gestureKind],
        duration: t.gestureDurations[item.productKey],
      });
  }
}

type ResolvedCart = {
  quote: PricedCart;
  /** Kod se veže uz narudžbu samo ako je stvarno donio popust. */
  promoId: string | null;
  metas: Array<{ [key: string]: Json | undefined }>;
};

async function resolveCart(
  admin: Admin,
  viewer: Viewer | null,
  items: ParsedItem[],
  promoCode: string | null,
): Promise<{ ok: true; cart: ResolvedCart } | CheckoutFailure> {
  const t = checkout.errors;

  // Paket, nadogradnju i poklon kupuje samo korisnik s potvrđenim e-mailom; gestu može bilo tko.
  const member = viewer && !viewer.isAnonymous ? viewer : null;
  if (items.some((item) => item.kind !== "gesture") && !member) {
    return fail("not_allowed", t.signInRequired);
  }
  if (items.some((item) => item.kind === "gift") && !member?.email) {
    return fail("not_allowed", t.signInRequired);
  }

  // Dva paketa za isti memorijal ne bi se mogla ispuniti nakon plaćanja.
  const ownIds = items.flatMap((item) => (item.kind === "memorial" || item.kind === "upgrade" ? [item.memorialId] : []));
  if (new Set(ownIds).size !== ownIds.length) {
    return fail("invalid", t.duplicateMemorial);
  }

  const memorialIds = Array.from(new Set(items.flatMap((item) => (item.kind === "gift" ? [] : [item.memorialId]))));
  const [memorials, paidIds, products, repeatDiscountPct, promo] = await Promise.all([
    loadMemorials(admin, memorialIds),
    member && ownIds.length > 0 ? loadPaidMemorialIds(admin, member.id) : Promise.resolve([]),
    loadProducts(admin),
    loadRepeatDiscountPct(admin),
    promoCode ? loadPromo(admin, promoCode) : Promise.resolve(null),
  ]);

  for (const item of items) {
    if (item.kind === "gift") {
      continue;
    }
    const memorial = memorials.get(item.memorialId);
    if (item.kind === "gesture") {
      // Gesta ide samo na objavljen memorijal koji javnost može vidjeti.
      if (!memorial || memorial.status !== "published" || !["public", "unlisted"].includes(memorial.visibility)) {
        return fail("not_allowed", t.gestureUnavailable);
      }
      continue;
    }
    // Vlasništvo se čita iz baze; nepostojeći i tuđi memorijal daju isti odgovor.
    if (!memorial || !member || memorial.owner_id !== member.id) {
      return fail("not_allowed", t.notAllowed);
    }
    if (item.kind === "upgrade") {
      if (memorial.tier !== "memorial") {
        return fail("invalid", t.upgradeUnavailable);
      }
      continue;
    }
    if (memorial.tier !== "free") {
      return fail("invalid", t.memorialHasPackage);
    }
    if (item.publish) {
      // fulfill_order objavljuje bez dodatnih provjera, pa se ovdje hvata ono što bi nakon
      // plaćanja srušilo ispunjenje (prazno ime) ili zaobišlo adminovo skrivanje.
      if (memorial.status === "hidden") {
        return fail("not_allowed", t.notAllowed);
      }
      if (memorial.name.trim() === "") {
        return fail("invalid", t.publishNeedsName);
      }
    }
  }

  if (items.some((item) => !products[productKeyOf(item)])) {
    return fail("invalid", t.productUnavailable);
  }

  if (promoCode) {
    if (!promo) {
      return fail("promo_invalid", t.promoInvalid);
    }
    if (!items.some((item) => promo.appliesTo.includes(productKeyOf(item)))) {
      return fail("promo_invalid", t.promoNotApplicable);
    }
  }

  const metas = items.map(lineMeta);
  const cartItems = items.map((item, index): CartItem => {
    const base = { kind: item.kind, productKey: productKeyOf(item), meta: metas[index] };
    if (item.kind === "memorial" || item.kind === "upgrade") {
      // „Drugi" plaćeni memorijal: bilo koji osim onoga za koji se upravo kupuje.
      return { ...base, memorialId: item.memorialId, repeatEligible: paidIds.some((id) => id !== item.memorialId) };
    }
    return { ...base, memorialId: item.kind === "gesture" ? item.memorialId : null };
  });

  const quote = priceCart({
    items: cartItems,
    products,
    settings: { repeatDiscountPct },
    repeatEligible: paidIds.length > 0,
    promo,
  });

  return { ok: true, cart: { quote, promoId: promo && quote.promoApplied ? promo.id : null, metas } };
}

// ---------------------------------------------------------------------------------------------
// Javno sučelje
// ---------------------------------------------------------------------------------------------

/** Kupnja je uključena tek kad postoje i ključ za naplatu i tajna webhooka koji ispunjava narudžbe. */
export function isCheckoutConfigured(): boolean {
  return env.stripeSecretKey !== null && env.stripeWebhookSecret !== null;
}

/** Cijena košarice za prikaz prije plaćanja. Ne stvara narudžbu. */
export async function quoteCart(input: {
  viewer: Viewer | null;
  items: CheckoutItem[];
  promoCode?: string | null;
}): Promise<QuoteResult> {
  try {
    const items = itemsSchema.safeParse(input.items);
    if (!items.success) {
      return fail("invalid", checkout.errors.invalid);
    }
    const resolved = await resolveCart(
      createAdminClient(),
      input.viewer,
      items.data,
      normalizePromoCode(input.promoCode),
    );
    return resolved.ok ? { ok: true, quote: resolved.cart.quote } : resolved;
  } catch (error) {
    console.error("[checkout] izračun košarice nije uspio", error);
    return fail("failed", checkout.errors.quoteFailed);
  }
}

async function markOrderFailed(admin: Admin, orderId: string): Promise<void> {
  const { error } = await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
  if (error) {
    console.error(`[checkout] narudžba ${orderId} nije označena kao neuspjela`, error.message);
  }
}

/**
 * Stvara narudžbu sa snimkom cijena i otvara Stripe Checkout. Narudžbu nakon plaćanja ispunjava
 * webhook; iznimka je narudžba od 0 €, koja nema što platiti pa se ispunjava odmah.
 */
export async function createCheckout(input: {
  viewer: Viewer | null;
  items: CheckoutItem[];
  promoCode?: string | null;
  waiverAccepted: boolean;
  cancelPath: string;
  attribution?: Record<string, unknown> | null;
}): Promise<CheckoutResult> {
  const t = checkout.errors;
  try {
    const stripe = isCheckoutConfigured() ? getStripe() : null;
    if (!stripe) {
      return fail("not_configured", t.notConfigured);
    }
    if (input.waiverAccepted !== true) {
      return fail("waiver_required", t.waiverRequired);
    }
    const items = itemsSchema.safeParse(input.items);
    if (!items.success) {
      return fail("invalid", t.invalid);
    }

    const admin = createAdminClient();
    const resolved = await resolveCart(admin, input.viewer, items.data, normalizePromoCode(input.promoCode));
    if (!resolved.ok) {
      return resolved;
    }
    const { quote, promoId, metas } = resolved.cart;
    if (quote.totalCents > 0 && quote.totalCents < STRIPE_MIN_CHARGE_CENTS) {
      return fail("failed", t.amountTooSmall);
    }

    const email = input.viewer?.email ?? null;
    const { data: orderId, error: orderError } = await admin.rpc("create_order", {
      p_order: {
        user_id: input.viewer?.id ?? null,
        email,
        subtotal_cents: quote.subtotalCents,
        discount_cents: quote.discountCents,
        total_cents: quote.totalCents,
        promo_code_id: promoId,
        withdrawal_waiver_at: new Date().toISOString(),
        attribution: cleanAttribution(input.attribution),
      },
      p_lines: quote.lines.map((line, index) => ({
        kind: line.kind,
        product_key: line.productKey,
        memorial_id: line.memorialId,
        unit_amount_cents: line.unitAmountCents,
        discount_cents: line.discountCents,
        total_cents: line.totalCents,
        discount_reason: line.discountReason,
        meta: metas[index],
      })),
    });
    if (orderError || !orderId) {
      throw new Error(`create_order: ${orderError?.message ?? "bez rezultata"}`);
    }

    // Lijevak: početak naplate. Greška ovdje ne smije zaustaviti kupnju.
    await admin.rpc("track_checkout_started", { p_order_id: orderId }).then(
      () => undefined,
      () => undefined,
    );

    const successUrl = `${env.siteUrl}${SUCCESS_PATH}?n=${orderId}`;

    if (quote.totalCents === 0) {
      const { data, error } = await admin.rpc("fulfill_order", {
        p_order_id: orderId,
        // Nema plaćanja, pa nema ni Stripeove oznake; generirani tipovi ne poznaju prazan argument.
        p_payment_intent: null as unknown as string,
        p_email: email ?? "",
      });
      if (error) {
        await markOrderFailed(admin, orderId);
        throw new Error(`fulfill_order: ${error.message}`);
      }
      const effects = parseOrderEffects(data);
      revalidateOrderTags(effects);
      if (effects.status === "fulfilled") {
        await afterOrderFulfilled(effects, orderId);
      }
      return { ok: true, url: successUrl };
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      locale: "hr",
      // Kupac uvijek plaća u eurima; webhook zato smije tražiti točan iznos i valutu narudžbe.
      adaptive_pricing: { enabled: false },
      line_items: quote.lines.map((line, index) => ({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: line.totalCents,
          product_data: { name: lineName(items.data[index]) },
        },
      })),
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      payment_intent_data: { metadata: { order_id: orderId } },
      success_url: successUrl,
      cancel_url: `${env.siteUrl}${sameSitePath(input.cancelPath) ?? DEFAULT_CANCEL_PATH}`,
      ...(email ? { customer_email: email } : {}),
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(params, { idempotencyKey: `order-${orderId}` });
    } catch (error) {
      await markOrderFailed(admin, orderId);
      throw error;
    }
    if (!session.url) {
      await markOrderFailed(admin, orderId);
      throw new Error("Stripe nije vratio adresu za plaćanje");
    }

    const { error: sessionError } = await admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);
    if (sessionError) {
      // Bez spremljene sesije kupca se ne šalje na plaćanje: narudžba se ne bi mogla pouzdano upariti.
      await markOrderFailed(admin, orderId);
      throw new Error(`orders.stripe_checkout_session_id: ${sessionError.message}`);
    }

    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[checkout] narudžba nije stvorena", error);
    return fail("failed", t.failed);
  }
}
