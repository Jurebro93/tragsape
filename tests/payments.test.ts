import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Next u testovima ne radi, pa se osvježavanje predmemorije samo bilježi.
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
// E-mail se ne šalje; provjerava se samo što bi bilo poslano.
vi.mock("@/server/email/send", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/email/send")>()),
  sendEmail: vi.fn(async () => {}),
}));

import { revalidateTag } from "next/cache";
import { POST } from "@/app/api/stripe/webhook/route";
import { percentOf } from "@/lib/pricing";
import type { Viewer } from "@/server/auth";
import { createCheckout, isCheckoutConfigured, quoteCart } from "@/server/checkout/create";
import type { CheckoutItem } from "@/server/checkout/types";
import { sendEmail } from "@/server/email/send";
import { getStripe } from "@/server/stripe/client";
import { createAdminClient } from "@/server/supabase/admin";

// Lokalni Supabase iz .env.local; Stripe ključevi su izmišljeni jer se mreža prema Stripeu ne koristi.
process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
const WEBHOOK_SECRET = "whsec_test_dummy";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
delete process.env.RESEND_API_KEY;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const DAY_MS = 24 * 60 * 60 * 1000;

const admin = createAdminClient();
const stripe = getStripe() as Stripe;
const sessionCreate = vi.spyOn(stripe.checkout.sessions, "create");

const run = randomUUID().slice(0, 8);
const userIds: string[] = [];
const orderIds = new Set<string>();
const eventIds: string[] = [];
const promoIds: string[] = [];
const partnerIds: string[] = [];

let prices: Record<string, number> = {};
let repeatPct = 0;
let donationCents = 0;

let owner: Viewer;
let stranger: Viewer;

// ---------------------------------------------------------------------------------------------
// Pomoćne funkcije
// ---------------------------------------------------------------------------------------------

function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(result.error?.message ?? "nema podataka");
  }
  return result.data;
}

async function createUser(label: string): Promise<Viewer> {
  const email = `placanje-${label}-${run}-${randomUUID().slice(0, 6)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
  if (error || !data.user) {
    throw new Error(`korisnik nije stvoren: ${error?.message}`);
  }
  userIds.push(data.user.id);
  return { id: data.user.id, email, isAnonymous: false };
}

async function createMemorial(
  ownerId: string,
  overrides: { tier?: string; status?: string; visibility?: string; name?: string } = {},
): Promise<string> {
  const row = must(
    await admin
      .from("memorials")
      .insert({
        owner_id: ownerId,
        slug: `test-${run}-${randomUUID().slice(0, 8)}`,
        name: "Testni Reks",
        ...(overrides.status === "published" ? { published_at: new Date().toISOString() } : {}),
        ...overrides,
      })
      .select("id")
      .single(),
  );
  return row.id;
}

async function getMemorial(id: string) {
  return must(
    await admin.from("memorials").select("id, tier, status, visibility, slug, published_at").eq("id", id).single(),
  );
}

async function getOrder(id: string) {
  const order = must(
    await admin
      .from("orders")
      .select(
        "id, user_id, email, status, currency, subtotal_cents, discount_cents, total_cents, promo_code_id, stripe_checkout_session_id, stripe_payment_intent_id, withdrawal_waiver_at, attribution, paid_at, refunded_at",
      )
      .eq("id", id)
      .single(),
  );
  const lines = must(
    await admin
      .from("order_lines")
      .select("id, position, kind, product_key, memorial_id, unit_amount_cents, discount_cents, total_cents, discount_reason, meta")
      .eq("order_id", id)
      .order("position"),
  );
  return { ...order, lines };
}

async function entitlementsOf(orderId: string) {
  const { lines } = await getOrder(orderId);
  return must(
    await admin
      .from("entitlements")
      .select("id, order_line_id, tier, owner_id, memorial_id, status")
      .in(
        "order_line_id",
        lines.map((line) => line.id),
      ),
  );
}

async function donationsOf(orderId: string) {
  const { lines } = await getOrder(orderId);
  return must(
    await admin
      .from("donation_entries")
      .select("order_line_id, amount_cents, status")
      .in(
        "order_line_id",
        lines.map((line) => line.id),
      ),
  );
}

async function ordersOfUser(userId: string): Promise<number> {
  const { count, error } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

type CheckoutExtra = { promoCode?: string | null; waiverAccepted?: boolean; cancelPath?: string };

function startCheckout(viewer: Viewer | null, items: CheckoutItem[], extra: CheckoutExtra = {}) {
  return createCheckout({
    viewer,
    items,
    promoCode: extra.promoCode ?? null,
    waiverAccepted: extra.waiverAccepted ?? true,
    cancelPath: extra.cancelPath ?? "/cjenik",
  });
}

/** Stvara narudžbu koja ide na Stripe i vraća je zajedno s onim što je Stripeu poslano. */
async function placeOrder(viewer: Viewer | null, items: CheckoutItem[], extra: CheckoutExtra = {}) {
  const callsBefore = sessionCreate.mock.calls.length;
  const result = await startCheckout(viewer, items, extra);
  if (!result.ok) {
    throw new Error(`narudžba nije stvorena: ${result.error} (${result.message})`);
  }
  expect(sessionCreate.mock.calls.length).toBe(callsBefore + 1);
  const params = sessionCreate.mock.calls[callsBefore][0] as Stripe.Checkout.SessionCreateParams;
  const orderId = String(params.metadata?.order_id);
  orderIds.add(orderId);
  return { url: result.url, params, order: await getOrder(orderId) };
}

function paymentIntentId(): string {
  return `pi_test_${randomUUID().replaceAll("-", "")}`;
}

function paidSession(
  order: { id: string; total_cents: number; stripe_checkout_session_id: string | null },
  overrides: Record<string, unknown> = {},
) {
  return {
    id: order.stripe_checkout_session_id,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: order.total_cents,
    currency: "eur",
    payment_intent: paymentIntentId(),
    client_reference_id: order.id,
    metadata: { order_id: order.id },
    customer_email: null,
    customer_details: { email: "kupac-sa-stripea@example.com" },
    ...overrides,
  };
}

type Delivery = { id?: string; type: string; object: Record<string, unknown>; signature?: string | null };

/** Šalje webhooku događaj potpisan kao da ga je poslao Stripe. */
async function deliver(event: Delivery): Promise<{ id: string; response: Response }> {
  const id = event.id ?? `evt_test_${randomUUID().replaceAll("-", "")}`;
  eventIds.push(id);
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2026-11-18.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: event.type,
    data: { object: event.object },
  });
  const signature =
    event.signature === undefined
      ? stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })
      : event.signature;
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) {
    headers.set("stripe-signature", signature);
  }
  const response = await POST(
    new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body: payload }),
  );
  return { id, response };
}

async function pay(order: { id: string; total_cents: number; stripe_checkout_session_id: string | null }) {
  const session = paidSession(order);
  const { id, response } = await deliver({ type: "checkout.session.completed", object: session });
  expect(response.status).toBe(200);
  return { eventId: id, paymentIntent: session.payment_intent };
}

async function storedEvent(id: string) {
  const { data, error } = await admin
    .from("stripe_events")
    .select("event_id, type, processed_at, error")
    .eq("event_id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function createPromo(values: {
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to?: string[];
  max_redemptions?: number | null;
  redeemed_count?: number;
  valid_to?: string | null;
  active?: boolean;
  partner_id?: string;
}): Promise<{ id: string; code: string }> {
  const code = `TEST${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const row = must(
    await admin
      .from("promo_codes")
      .insert({ code, kind: values.partner_id ? "partner" : "promo", ...values })
      .select("id")
      .single(),
  );
  promoIds.push(row.id);
  return { id: row.id, code };
}

async function redeemedCount(promoId: string): Promise<number> {
  return must(await admin.from("promo_codes").select("redeemed_count").eq("id", promoId).single()).redeemed_count;
}

const memorialItem = (memorialId: string, overrides: Partial<Extract<CheckoutItem, { kind: "memorial" }>> = {}) =>
  ({ kind: "memorial", productKey: "memorial", memorialId, publish: true, ...overrides }) satisfies CheckoutItem;

// ---------------------------------------------------------------------------------------------

beforeAll(async () => {
  expect(isCheckoutConfigured()).toBe(true);
  const products = must(await admin.from("products").select("key, unit_amount_cents"));
  prices = Object.fromEntries(products.map((product) => [product.key, product.unit_amount_cents]));
  const settings = must(
    await admin.from("settings").select("repeat_discount_pct, donation_per_memorial_cents").single(),
  );
  repeatPct = settings.repeat_discount_pct;
  donationCents = settings.donation_per_memorial_cents;
  owner = await createUser("vlasnik");
  stranger = await createUser("stranac");
});

beforeEach(() => {
  sessionCreate.mockReset();
  sessionCreate.mockImplementation((() =>
    Promise.resolve({
      id: `cs_test_${randomUUID().replaceAll("-", "")}`,
      url: `https://checkout.stripe.test/c/pay/${randomUUID()}`,
    })) as never);
  vi.mocked(revalidateTag).mockClear();
  vi.mocked(sendEmail).mockClear();
});

afterAll(async () => {
  // Narudžbe preživljavaju brisanje korisnika (user_id postaje prazan), pa se čiste izričito,
  // redom koji poštuje strane ključeve. Inače bi testne donacije ostale u javnom zbroju.
  if (userIds.length > 0) {
    const { data } = await admin.from("orders").select("id").in("user_id", userIds);
    for (const row of data ?? []) {
      orderIds.add(row.id);
    }
  }
  const ids = Array.from(orderIds);
  if (ids.length > 0) {
    const { data: lines } = await admin.from("order_lines").select("id").in("order_id", ids);
    const lineIds = (lines ?? []).map((line) => line.id);
    if (lineIds.length > 0) {
      await admin.from("gifts").delete().in("order_line_id", lineIds);
      await admin.from("donation_entries").delete().in("order_line_id", lineIds);
      await admin.from("gestures").delete().in("order_line_id", lineIds);
      await admin.from("entitlements").delete().in("order_line_id", lineIds);
    }
    await admin.from("partner_commissions").delete().in("order_id", ids);
    await admin.from("orders").delete().in("id", ids);
  }
  if (promoIds.length > 0) {
    await admin.from("promo_codes").delete().in("id", promoIds);
  }
  if (partnerIds.length > 0) {
    await admin.from("partners").delete().in("id", partnerIds);
  }
  if (eventIds.length > 0) {
    await admin.from("stripe_events").delete().in("event_id", eventIds);
  }
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id);
  }
});

// ---------------------------------------------------------------------------------------------

describe("stvaranje narudžbe", () => {
  it("sprema cijene koje je izračunao poslužitelj i s istim iznosom otvara Stripe Checkout", async () => {
    const buyer = await createUser("prvi");
    const memorialId = await createMemorial(buyer.id);
    const { url, params, order } = await placeOrder(
      buyer,
      [memorialItem(memorialId, { productKey: "memorial_portrait", visibility: "unlisted" })],
      { cancelPath: "/izradi/nesto/pregled?korak=3" },
    );
    const price = prices.memorial_portrait;

    expect(url).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    expect(order).toMatchObject({
      user_id: buyer.id,
      email: buyer.email,
      status: "pending",
      currency: "eur",
      subtotal_cents: price,
      discount_cents: 0,
      total_cents: price,
      promo_code_id: null,
      paid_at: null,
    });
    expect(order.stripe_checkout_session_id).toMatch(/^cs_test_/);
    expect(Math.abs(Date.now() - new Date(String(order.withdrawal_waiver_at)).getTime())).toBeLessThan(60_000);
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]).toMatchObject({
      position: 0,
      kind: "memorial",
      product_key: "memorial_portrait",
      memorial_id: memorialId,
      unit_amount_cents: price,
      discount_cents: 0,
      total_cents: price,
      discount_reason: null,
      meta: { publish: true, visibility: "unlisted" },
    });

    expect(params).toMatchObject({
      mode: "payment",
      locale: "hr",
      client_reference_id: order.id,
      customer_email: buyer.email,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      success_url: `${SITE_URL}/naplata/uspjeh?n=${order.id}`,
      cancel_url: `${SITE_URL}/izradi/nesto/pregled?korak=3`,
    });
    expect(params.line_items).toEqual([
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: price, product_data: { name: "Memorijal + Portret" } },
      },
    ]);

    // Prije webhooka se ništa ne ispunjava.
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "free", status: "draft" });
    expect(await entitlementsOf(order.id)).toHaveLength(0);
  });

  it("iznos koji pošalje klijent tipom nije moguć, a podmetnut se zanemaruje", async () => {
    const buyer = await createUser("podmetanje");
    const memorialId = await createMemorial(buyer.id);
    const typed: CheckoutItem[] = [
      {
        kind: "memorial",
        productKey: "memorial",
        memorialId,
        publish: false,
        // @ts-expect-error Iznos nije dio tipa: klijent ga ne može poslati.
        unitAmountCents: 1,
      },
    ];
    const forged = [
      { ...typed[0], totalCents: 1, discountCents: 1899, amount: 1, price: 0, meta: { publish: true, total_cents: 1 } },
    ] as unknown as CheckoutItem[];

    const { params, order } = await placeOrder(buyer, forged);

    expect(order).toMatchObject({ subtotal_cents: prices.memorial, discount_cents: 0, total_cents: prices.memorial });
    expect(order.lines[0]).toMatchObject({
      unit_amount_cents: prices.memorial,
      discount_cents: 0,
      total_cents: prices.memorial,
    });
    expect(order.lines[0].meta).toEqual({ publish: false });
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(prices.memorial);
  });

  it("odbija kupnju bez pristanka na početak isporuke", async () => {
    const memorialId = await createMemorial(owner.id);
    const before = await ordersOfUser(owner.id);
    const result = await startCheckout(owner, [memorialItem(memorialId)], { waiverAccepted: false });
    expect(result).toMatchObject({ ok: false, error: "waiver_required" });
    expect(sessionCreate).not.toHaveBeenCalled();
    expect(await ordersOfUser(owner.id)).toBe(before);
  });

  it("anonimni posjetitelj i posjetitelj bez sesije ne mogu kupiti memorijal", async () => {
    const memorialId = await createMemorial(owner.id);
    const anonymous: Viewer = { id: owner.id, email: null, isAnonymous: true };
    const before = await ordersOfUser(owner.id);

    expect(await startCheckout(anonymous, [memorialItem(memorialId)])).toMatchObject({ ok: false, error: "not_allowed" });
    expect(await startCheckout(null, [memorialItem(memorialId)])).toMatchObject({ ok: false, error: "not_allowed" });
    expect(await startCheckout(anonymous, [{ kind: "upgrade", memorialId }])).toMatchObject({
      ok: false,
      error: "not_allowed",
    });
    expect(
      await startCheckout(anonymous, [{ kind: "gift", productKey: "memorial", recipientEmail: "netko@example.com" }]),
    ).toMatchObject({ ok: false, error: "not_allowed" });
    expect(sessionCreate).not.toHaveBeenCalled();
    expect(await ordersOfUser(owner.id)).toBe(before);
  });

  it("odbija kupnju za tuđi memorijal", async () => {
    const foreignFree = await createMemorial(stranger.id);
    const foreignPaid = await createMemorial(stranger.id, { tier: "memorial" });
    const before = await ordersOfUser(owner.id);

    expect(await startCheckout(owner, [memorialItem(foreignFree)])).toMatchObject({ ok: false, error: "not_allowed" });
    expect(await startCheckout(owner, [{ kind: "upgrade", memorialId: foreignPaid }])).toMatchObject({
      ok: false,
      error: "not_allowed",
    });
    expect(await startCheckout(owner, [memorialItem(randomUUID())])).toMatchObject({ ok: false, error: "not_allowed" });
    expect(sessionCreate).not.toHaveBeenCalled();
    expect(await ordersOfUser(owner.id)).toBe(before);
    expect(await getMemorial(foreignFree)).toMatchObject({ tier: "free", status: "draft" });
  });

  it("paket traži besplatan memorijal, nadogradnja Memorijal, a isti memorijal ne ide dvaput", async () => {
    const free = await createMemorial(owner.id);
    const paid = await createMemorial(owner.id, { tier: "memorial" });
    const unnamed = await createMemorial(owner.id, { name: "" });

    expect(await startCheckout(owner, [memorialItem(paid)])).toMatchObject({ ok: false, error: "invalid" });
    expect(await startCheckout(owner, [{ kind: "upgrade", memorialId: free }])).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(
      await startCheckout(owner, [memorialItem(free), memorialItem(free, { productKey: "memorial_portrait" })]),
    ).toMatchObject({ ok: false, error: "invalid" });
    // Objava bez imena srušila bi ispunjenje nakon plaćanja.
    expect(await startCheckout(owner, [memorialItem(unnamed)])).toMatchObject({ ok: false, error: "invalid" });
    expect(await startCheckout(owner, [])).toMatchObject({ ok: false, error: "invalid" });
    expect(
      await startCheckout(owner, [{ kind: "memorial", productKey: "gesture_7d", memorialId: free, publish: true }] as never),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("popust za ponovnu kupnju vrijedi za vlastiti memorijal, ne za poklon, i ne zbraja se s kodom", async () => {
    const buyer = await createUser("ponovni");
    const first = await createMemorial(buyer.id, { tier: "memorial" });
    const second = await createMemorial(buyer.id);
    const weaker = await createPromo({ discount_type: "percent", discount_value: 10 });

    const { order } = await placeOrder(
      buyer,
      [
        memorialItem(second),
        { kind: "upgrade", memorialId: first },
        { kind: "gift", productKey: "memorial", recipientEmail: "prijatelj@example.com" },
      ],
      { promoCode: weaker.code },
    );

    const memorialDiscount = percentOf(prices.memorial, repeatPct);
    const giftDiscount = percentOf(prices.memorial, 10);
    expect(order.lines.map((line) => [line.kind, line.discount_cents, line.discount_reason])).toEqual([
      // Drugi plaćeni memorijal postoji (prvi), pa vrijedi veći popust: ponovna kupnja.
      ["memorial", memorialDiscount, "repeat"],
      // Za nadogradnju prvoga „drugi" plaćeni memorijal ne postoji.
      ["upgrade", 0, null],
      // Poklon nikad ne dobiva popust za ponovnu kupnju, ali kod za njega vrijedi.
      ["gift", giftDiscount, "promo"],
    ]);
    expect(order.discount_cents).toBe(memorialDiscount + giftDiscount);
    expect(order.total_cents).toBe(order.subtotal_cents - order.discount_cents);
    expect(order.promo_code_id).toBe(weaker.id);

    // Kad kod ne pobijedi ni na jednoj stavci, ne veže se uz narudžbu.
    const third = await createMemorial(buyer.id);
    const alone = await placeOrder(buyer, [memorialItem(third)], { promoCode: weaker.code });
    expect(alone.order.lines[0]).toMatchObject({ discount_cents: memorialDiscount, discount_reason: "repeat" });
    expect(alone.order.promo_code_id).toBeNull();
  });

  it("odbija kod koji ne vrijedi, a putanju izvan stranice zamjenjuje zadanom", async () => {
    const memorialId = await createMemorial(owner.id);
    const expired = await createPromo({
      discount_type: "percent",
      discount_value: 20,
      valid_to: new Date(Date.now() - DAY_MS).toISOString(),
    });
    const spent = await createPromo({ discount_type: "percent", discount_value: 20, max_redemptions: 1, redeemed_count: 1 });
    const inactive = await createPromo({ discount_type: "percent", discount_value: 20, active: false });
    const gesturesOnly = await createPromo({ discount_type: "percent", discount_value: 20, applies_to: ["gesture_7d"] });

    for (const promoCode of ["NEPOSTOJI-123", expired.code, spent.code, inactive.code, gesturesOnly.code]) {
      expect(await startCheckout(owner, [memorialItem(memorialId)], { promoCode })).toMatchObject({
        ok: false,
        error: "promo_invalid",
      });
    }
    expect(sessionCreate).not.toHaveBeenCalled();

    for (const cancelPath of ["https://zlo.example/x", "//zlo.example/x", "/\\zlo.example"]) {
      const { params } = await placeOrder(owner, [memorialItem(memorialId)], { cancelPath });
      expect(params.cancel_url).toBe(`${SITE_URL}/naplata/odustanak`);
    }
  });

  it("quoteCart računa cijenu bez stvaranja narudžbe", async () => {
    const buyer = await createUser("ponuda");
    const memorialId = await createMemorial(buyer.id);
    const code = await createPromo({ discount_type: "fixed", discount_value: 400 });

    const result = await quoteCart({ viewer: buyer, items: [memorialItem(memorialId)], promoCode: code.code.toLowerCase() });

    expect(result).toMatchObject({
      ok: true,
      quote: {
        subtotalCents: prices.memorial,
        discountCents: 400,
        totalCents: prices.memorial - 400,
        promoApplied: true,
      },
    });
    expect(await ordersOfUser(buyer.id)).toBe(0);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("bez Stripe ključeva vraća jasan odgovor i ništa ne stvara", async () => {
    const memorialId = await createMemorial(owner.id);
    const before = await ordersOfUser(owner.id);
    process.env.STRIPE_SECRET_KEY = "";
    try {
      expect(isCheckoutConfigured()).toBe(false);
      expect(await startCheckout(owner, [memorialItem(memorialId)])).toMatchObject({ ok: false, error: "not_configured" });
      const { response } = await deliver({ type: "checkout.session.completed", object: {}, signature: "t=1,v1=x" });
      expect(response.status).toBe(503);
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    }
    process.env.STRIPE_WEBHOOK_SECRET = "";
    try {
      expect(await startCheckout(owner, [memorialItem(memorialId)])).toMatchObject({ ok: false, error: "not_configured" });
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    }
    expect(await ordersOfUser(owner.id)).toBe(before);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("ako Stripe ne otvori sesiju, narudžba se zatvara i kupac dobiva mirnu poruku", async () => {
    const memorialId = await createMemorial(owner.id);
    sessionCreate.mockImplementation((() => Promise.reject(new Error("Stripe ne radi"))) as never);
    const silenced = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await startCheckout(owner, [memorialItem(memorialId)]);
      expect(result).toMatchObject({ ok: false, error: "failed" });
    } finally {
      silenced.mockRestore();
    }
    const orderId = String((sessionCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams).metadata?.order_id);
    orderIds.add(orderId);
    expect(await getOrder(orderId)).toMatchObject({ status: "failed", stripe_checkout_session_id: null });
  });
});

// ---------------------------------------------------------------------------------------------

describe("webhook: potpis i idempotentnost", () => {
  it("odbija neispravan ili izostavljen potpis s 400 i ništa ne mijenja", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [memorialItem(memorialId)]);
    const session = paidSession(order);
    const forgedPayloadSignature = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify({ sasvim: "drugo tijelo" }),
      secret: WEBHOOK_SECRET,
    });

    const attempts = [
      await deliver({ type: "checkout.session.completed", object: session, signature: null }),
      await deliver({ type: "checkout.session.completed", object: session, signature: "t=1,v1=nije-potpis" }),
      await deliver({ type: "checkout.session.completed", object: session, signature: forgedPayloadSignature }),
    ];

    for (const attempt of attempts) {
      expect(attempt.response.status).toBe(400);
      expect(await storedEvent(attempt.id)).toBeNull();
    }
    expect(await getOrder(order.id)).toMatchObject({ status: "pending", paid_at: null, stripe_payment_intent_id: null });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "free", status: "draft" });
    expect(await entitlementsOf(order.id)).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("potpisan checkout.session.completed ispunjava narudžbu: paket, objava, pravo i donacija", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [
      memorialItem(memorialId, { productKey: "memorial_portrait", publish: true, visibility: "unlisted" }),
    ]);

    const { eventId, paymentIntent } = await pay(order);

    const paid = await getOrder(order.id);
    expect(paid).toMatchObject({
      status: "paid",
      stripe_payment_intent_id: paymentIntent,
      email: "kupac-sa-stripea@example.com",
    });
    expect(paid.paid_at).not.toBeNull();

    const memorial = await getMemorial(memorialId);
    expect(memorial).toMatchObject({ tier: "portrait", status: "published", visibility: "unlisted" });
    expect(memorial.published_at).not.toBeNull();
    expect(memorial.slug).toMatch(/^testni-reks-[0-9a-f]{6}$/);

    expect(await entitlementsOf(order.id)).toEqual([
      expect.objectContaining({ tier: "portrait", owner_id: owner.id, memorial_id: memorialId, status: "applied" }),
    ]);
    expect(donationCents).toBe(100);
    expect(await donationsOf(order.id)).toEqual([
      { order_line_id: paid.lines[0].id, amount_cents: 100, status: "accrued" },
    ]);

    const event = await storedEvent(eventId);
    expect(event).toMatchObject({ type: "checkout.session.completed", error: null });
    expect(event?.processed_at).not.toBeNull();
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${memorialId}`, "max");
    expect(revalidateTag).toHaveBeenCalledWith("donations", "max");
  });

  it("isti događaj isporučen dvaput ispunjava jednom, kao i drugi događaj za istu sesiju", async () => {
    const buyer = await createUser("dvaput");
    const memorialId = await createMemorial(buyer.id);
    const code = await createPromo({ discount_type: "percent", discount_value: 10 });
    const { order } = await placeOrder(buyer, [memorialItem(memorialId, { publish: false })], { promoCode: code.code });
    const session = paidSession(order);
    const eventId = `evt_test_${randomUUID().replaceAll("-", "")}`;

    const first = await deliver({ id: eventId, type: "checkout.session.completed", object: session });
    const slug = (await getMemorial(memorialId)).slug;
    vi.mocked(revalidateTag).mockClear();
    const second = await deliver({ id: eventId, type: "checkout.session.completed", object: session });
    const other = await deliver({ type: "checkout.session.async_payment_succeeded", object: session });

    expect([first.response.status, second.response.status, other.response.status]).toEqual([200, 200, 200]);
    expect(await getOrder(order.id)).toMatchObject({ status: "paid", stripe_payment_intent_id: session.payment_intent });
    expect(await entitlementsOf(order.id)).toHaveLength(1);
    expect(await donationsOf(order.id)).toHaveLength(1);
    expect(await redeemedCount(code.id)).toBe(1);
    // publish je bio false: paket je primijenjen, a nacrt je ostao nacrt.
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "memorial", status: "draft", slug });
    // Ponovljena isporuka smije samo osvježiti predmemoriju (ako je prvi pokušaj prekinut prije toga).
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${memorialId}`, "max");
  });

  it("dvije plaćene narudžbe za isti spomen: druga ne puca, kupac dobiva pravo za drugi spomen", async () => {
    const buyer = await createUser("dvije-narudzbe");
    const memorialId = await createMemorial(buyer.id);
    const first = await placeOrder(buyer, [memorialItem(memorialId, { publish: false })]);
    const second = await placeOrder(buyer, [memorialItem(memorialId, { publish: false })]);

    const a = await deliver({ type: "checkout.session.completed", object: paidSession(first.order) });
    const b = await deliver({ type: "checkout.session.completed", object: paidSession(second.order) });

    expect([a.response.status, b.response.status]).toEqual([200, 200]);
    expect(await getOrder(second.order.id)).toMatchObject({ status: "paid" });
    expect(await entitlementsOf(first.order.id)).toEqual([
      expect.objectContaining({ memorial_id: memorialId, status: "applied" }),
    ]);
    expect(await entitlementsOf(second.order.id)).toEqual([
      expect.objectContaining({ memorial_id: null, owner_id: buyer.id, status: "available" }),
    ]);
    // Slučaj je zabilježen uz događaj, da ga admin vidi.
    const event = await storedEvent(b.id);
    expect(event?.error).toContain("memorial_not_free");
    expect(event?.processed_at).not.toBeNull();
  });

  it("plaćanje ne vraća na objavu spomen koji je admin u međuvremenu sakrio", async () => {
    const buyer = await createUser("skriven");
    const memorialId = await createMemorial(buyer.id);
    const { order } = await placeOrder(buyer, [memorialItem(memorialId, { publish: true })]);
    must(await admin.from("memorials").update({ status: "hidden" }).eq("id", memorialId).select("id"));

    const delivered = await deliver({ type: "checkout.session.completed", object: paidSession(order) });

    expect(delivered.response.status).toBe(200);
    expect(await getOrder(order.id)).toMatchObject({ status: "paid" });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "memorial", status: "hidden" });
  });

  it("odbija ispunjenje kad plaćeni iznos ili valuta ne odgovaraju narudžbi", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [memorialItem(memorialId)]);
    const silenced = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const cheaper = await deliver({
        type: "checkout.session.completed",
        object: paidSession(order, { amount_total: order.total_cents - 1 }),
      });
      const otherCurrency = await deliver({
        type: "checkout.session.completed",
        object: paidSession(order, { currency: "usd" }),
      });
      const otherSession = await deliver({
        type: "checkout.session.completed",
        object: paidSession(order, { id: "cs_test_neka_druga_sesija" }),
      });

      // Ponavljanje ne bi pomoglo, pa Stripe dobiva 200, a razlog ostaje zapisan uz događaj.
      expect([cheaper.response.status, otherCurrency.response.status, otherSession.response.status]).toEqual([
        200, 200, 200,
      ]);
      expect((await storedEvent(cheaper.id))?.error).toMatch(/^amount_mismatch/);
      expect((await storedEvent(otherCurrency.id))?.error).toMatch(/^amount_mismatch/);
      expect((await storedEvent(otherSession.id))?.error).toBe("session_mismatch");
    } finally {
      silenced.mockRestore();
    }
    expect(await getOrder(order.id)).toMatchObject({ status: "pending", paid_at: null });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "free", status: "draft" });
    expect(await entitlementsOf(order.id)).toHaveLength(0);
    expect(await donationsOf(order.id)).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();

    // Ispravan iznos nakon toga i dalje prolazi.
    await pay(order);
    expect(await getOrder(order.id)).toMatchObject({ status: "paid" });
  });

  it("neplaćena sesija čeka potvrdu odgođenog plaćanja", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [memorialItem(memorialId)]);
    const session = paidSession(order);

    const unpaid = await deliver({
      type: "checkout.session.completed",
      object: { ...session, payment_status: "unpaid" },
    });
    expect(unpaid.response.status).toBe(200);
    expect(await getOrder(order.id)).toMatchObject({ status: "pending" });
    expect(await entitlementsOf(order.id)).toHaveLength(0);

    const succeeded = await deliver({ type: "checkout.session.async_payment_succeeded", object: session });
    expect(succeeded.response.status).toBe(200);
    expect(await getOrder(order.id)).toMatchObject({ status: "paid" });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "memorial", status: "published" });
  });

  it("istekla sesija zatvara narudžbu koja čeka; nepoznati događaji se samo potvrđuju", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [memorialItem(memorialId)]);
    const session = paidSession(order, { status: "expired", payment_status: "unpaid" });

    const expired = await deliver({ type: "checkout.session.expired", object: session });
    expect(expired.response.status).toBe(200);
    expect(await getOrder(order.id)).toMatchObject({ status: "expired", paid_at: null });

    const paidOrder = await placeOrder(owner, [memorialItem(memorialId)]);
    await pay(paidOrder.order);
    const late = await deliver({
      type: "checkout.session.expired",
      object: paidSession(paidOrder.order, { status: "expired" }),
    });
    expect(late.response.status).toBe(200);
    expect(await getOrder(paidOrder.order.id)).toMatchObject({ status: "paid" });

    const ignored = await deliver({ type: "customer.created", object: { id: "cus_test", object: "customer" } });
    expect(ignored.response.status).toBe(200);
    expect(await storedEvent(ignored.id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------

describe("webhook: geste, pokloni, kodovi", () => {
  it("posjetitelj bez računa kupuje više gesta; svaka dobiva svoj rok", async () => {
    const memorialId = await createMemorial(stranger.id, { status: "published" });
    const { params, order } = await placeOrder(null, [
      {
        kind: "gesture",
        productKey: "gesture_30d",
        memorialId,
        gestureKind: "svijeca",
        displayName: "  Ana i Marko ",
        message: "Mislimo na vas.",
      },
      { kind: "gesture", productKey: "gesture_7d", memorialId, gestureKind: "cvijet", displayName: "" },
      { kind: "gesture", productKey: "gesture_365d", memorialId, gestureKind: "loptica", displayName: "Susjedi" },
    ]);

    expect(order).toMatchObject({
      user_id: null,
      email: null,
      discount_cents: 0,
      total_cents: prices.gesture_30d + prices.gesture_7d + prices.gesture_365d,
    });
    expect(order.lines.map((line) => [line.kind, line.product_key, line.memorial_id, line.total_cents])).toEqual([
      ["gesture", "gesture_30d", memorialId, prices.gesture_30d],
      ["gesture", "gesture_7d", memorialId, prices.gesture_7d],
      ["gesture", "gesture_365d", memorialId, prices.gesture_365d],
    ]);
    // E-mail prikuplja Stripe, pa se unaprijed ne šalje.
    expect(params.customer_email).toBeUndefined();
    expect(params.line_items?.map((item) => item.price_data?.product_data?.name)).toEqual([
      "Svijeća, 30 dana",
      "Cvijet, 7 dana",
      "Loptica, godinu dana",
    ]);

    await pay(order);

    expect(await getOrder(order.id)).toMatchObject({ status: "paid", email: "kupac-sa-stripea@example.com" });
    const gestures = must(
      await admin
        .from("gestures")
        .select("order_line_id, memorial_id, kind, display_name, message, starts_at, expires_at, status")
        .eq("memorial_id", memorialId),
    );
    const byLine = new Map(gestures.map((gesture) => [gesture.order_line_id, gesture]));
    const expected = [
      { kind: "svijeca", display_name: "Ana i Marko", message: "Mislimo na vas.", days: 30 },
      { kind: "cvijet", display_name: "Netko tko pamti", message: null, days: 7 },
      { kind: "loptica", display_name: "Susjedi", message: null, days: 365 },
    ];
    expect(gestures).toHaveLength(3);
    order.lines.forEach((line, index) => {
      const gesture = byLine.get(line.id);
      expect(gesture).toMatchObject({
        memorial_id: memorialId,
        kind: expected[index].kind,
        display_name: expected[index].display_name,
        message: expected[index].message,
        status: "active",
      });
      const expires = new Date(String(gesture?.expires_at)).getTime();
      expect(Math.abs(expires - (Date.now() + expected[index].days * DAY_MS))).toBeLessThan(2 * 60_000);
    });
    expect(await entitlementsOf(order.id)).toHaveLength(0);
    expect(await donationsOf(order.id)).toHaveLength(0);
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${memorialId}`, "max");
  });

  it("gesta ide samo na objavljen memorijal koji javnost može vidjeti", async () => {
    const draft = await createMemorial(stranger.id);
    const hidden = await createMemorial(stranger.id, { status: "hidden" });
    const privateOne = await createMemorial(stranger.id, { status: "published", tier: "memorial", visibility: "private" });
    const unlisted = await createMemorial(stranger.id, { status: "published", tier: "memorial", visibility: "unlisted" });
    const gestureFor = (memorialId: string): CheckoutItem => ({
      kind: "gesture",
      productKey: "gesture_7d",
      memorialId,
      gestureKind: "sapica",
      displayName: "Iva",
    });

    for (const memorialId of [draft, hidden, privateOne, randomUUID()]) {
      expect(await startCheckout(null, [gestureFor(memorialId)])).toMatchObject({ ok: false, error: "not_allowed" });
    }
    expect(sessionCreate).not.toHaveBeenCalled();

    const { order } = await placeOrder(null, [gestureFor(unlisted)]);
    expect(order.lines[0]).toMatchObject({ memorial_id: unlisted, meta: { kind: "sapica", display_name: "Iva" } });
  });

  it("poklon stvara kod i slobodno pravo, a primatelj dobiva e-mail s poveznicom", async () => {
    const future = new Date(Date.now() + 30 * DAY_MS).toISOString();
    const { order } = await placeOrder(owner, [
      {
        kind: "gift",
        productKey: "memorial_portrait",
        recipientEmail: "  Primateljica@Example.com ",
        recipientName: "Maja",
        buyerName: "Teta Ljubica",
        message: "Mislim na tebe i na Bobija.\nJavi se kad budeš mogla.",
      },
      { kind: "gift", productKey: "memorial", recipientEmail: "kasnije@example.com", sendAt: future },
    ]);
    expect(order.lines[0].meta).toEqual({
      recipient_email: "primateljica@example.com",
      recipient_name: "Maja",
      buyer_name: "Teta Ljubica",
      message: "Mislim na tebe i na Bobija.\nJavi se kad budeš mogla.",
    });

    await pay(order);

    const gifts = must(
      await admin
        .from("gifts")
        .select("order_line_id, entitlement_id, code, buyer_name, recipient_name, recipient_email, message, send_at, sent_at, redeemed_by")
        .in(
          "order_line_id",
          order.lines.map((line) => line.id),
        ),
    );
    const now = gifts.find((gift) => gift.order_line_id === order.lines[0].id);
    const later = gifts.find((gift) => gift.order_line_id === order.lines[1].id);
    expect(now).toMatchObject({
      recipient_email: "primateljica@example.com",
      recipient_name: "Maja",
      buyer_name: "Teta Ljubica",
      redeemed_by: null,
    });
    expect(now?.code).toMatch(/^[0-9a-f]{24}$/);
    expect(later?.code).toMatch(/^[0-9a-f]{24}$/);
    expect(later?.code).not.toBe(now?.code);

    const entitlements = await entitlementsOf(order.id);
    expect(entitlements).toHaveLength(2);
    expect(entitlements.find((item) => item.id === now?.entitlement_id)).toMatchObject({
      tier: "portrait",
      status: "available",
      owner_id: null,
      memorial_id: null,
    });
    expect(entitlements.find((item) => item.id === later?.entitlement_id)).toMatchObject({
      tier: "memorial",
      status: "available",
      owner_id: null,
    });
    // Donacija se bilježi i za poklonjene memorijale.
    expect((await donationsOf(order.id)).map((entry) => entry.amount_cents)).toEqual([donationCents, donationCents]);

    // Odmah se šalje samo poklon bez zakazanog datuma; zakazani ostaje neposlan.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe("primateljica@example.com");
    expect(email.subject).toContain("Teta Ljubica");
    for (const body of [email.text, email.html]) {
      expect(body).toContain(`${SITE_URL}/poklon/${now?.code}`);
      expect(body).toContain("Teta Ljubica");
      expect(body).toContain("Mislim na tebe i na Bobija.");
      expect(body).toContain("Memorijal + Portret");
    }
    expect(now?.sent_at).not.toBeNull();
    expect(later?.sent_at).toBeNull();
    expect(new Date(String(later?.send_at)).toISOString()).toBe(future);
  });

  it("kod za popust povećava broj iskorištenja, a partnerski kod stvara proviziju", async () => {
    const buyer = await createUser("kodovi");
    const promoMemorial = await createMemorial(buyer.id);
    const promo = await createPromo({ discount_type: "percent", discount_value: 15, max_redemptions: 5 });
    const first = await placeOrder(buyer, [memorialItem(promoMemorial)], { promoCode: ` ${promo.code.toLowerCase()} ` });
    const promoDiscount = percentOf(prices.memorial, 15);
    expect(first.order).toMatchObject({
      promo_code_id: promo.id,
      discount_cents: promoDiscount,
      total_cents: prices.memorial - promoDiscount,
    });
    expect(first.order.lines[0]).toMatchObject({ discount_cents: promoDiscount, discount_reason: "promo" });
    expect(first.params.line_items?.[0].price_data?.unit_amount).toBe(prices.memorial - promoDiscount);
    // Kod se troši tek kad je narudžba plaćena.
    expect(await redeemedCount(promo.id)).toBe(0);
    await pay(first.order);
    expect(await redeemedCount(promo.id)).toBe(1);

    const partner = must(
      await admin
        .from("partners")
        .insert({ name: `Testna ambulanta ${run}`, type: "vet", commission_type: "percent", commission_value: 10 })
        .select("id")
        .single(),
    );
    partnerIds.push(partner.id);
    const partnerCode = await createPromo({ discount_type: "fixed", discount_value: 500, partner_id: partner.id });
    const partnerMemorial = await createMemorial(buyer.id);
    // Kupac sada ima plaćeni memorijal, pa je i popust za ponovnu kupnju u igri; fiksni kod
    // mora biti veći da bi pobijedio.
    const repeatDiscount = percentOf(prices.memorial_portrait, repeatPct);
    expect(repeatDiscount).toBeGreaterThan(500);
    const larger = await createPromo({ discount_type: "fixed", discount_value: repeatDiscount + 100, partner_id: partner.id });

    const loses = await placeOrder(buyer, [memorialItem(partnerMemorial, { productKey: "memorial_portrait" })], {
      promoCode: partnerCode.code,
    });
    expect(loses.order.lines[0]).toMatchObject({ discount_cents: repeatDiscount, discount_reason: "repeat" });
    expect(loses.order.promo_code_id).toBeNull();

    const wins = await placeOrder(buyer, [memorialItem(partnerMemorial, { productKey: "memorial_portrait" })], {
      promoCode: larger.code,
    });
    expect(wins.order.lines[0]).toMatchObject({ discount_cents: repeatDiscount + 100, discount_reason: "partner" });
    expect(wins.order.promo_code_id).toBe(larger.id);
    await pay(wins.order);

    const total = prices.memorial_portrait - repeatDiscount - 100;
    const commissions = must(
      await admin
        .from("partner_commissions")
        .select("partner_id, order_id, base_cents, commission_cents, status")
        .eq("partner_id", partner.id),
    );
    expect(commissions).toEqual([
      {
        partner_id: partner.id,
        order_id: wins.order.id,
        base_cents: total,
        commission_cents: Math.round(total * 0.1),
        status: "accrued",
      },
    ]);
    expect(await redeemedCount(larger.id)).toBe(1);
    expect(await redeemedCount(partnerCode.id)).toBe(0);
  });

  it("narudžba od 0 € preskače Stripe i ispunjava se odmah", async () => {
    const buyer = await createUser("besplatno");
    const memorialId = await createMemorial(buyer.id);
    const full = await createPromo({ discount_type: "percent", discount_value: 100 });

    const result = await startCheckout(buyer, [memorialItem(memorialId)], { promoCode: full.code });

    expect(sessionCreate).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    const url = new URL(result.ok ? result.url : "http://x");
    expect(`${url.origin}${url.pathname}`).toBe(`${SITE_URL}/naplata/uspjeh`);
    const orderId = String(url.searchParams.get("n"));
    orderIds.add(orderId);

    const order = await getOrder(orderId);
    expect(order).toMatchObject({
      status: "paid",
      total_cents: 0,
      discount_cents: prices.memorial,
      promo_code_id: full.id,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
    });
    expect(order.withdrawal_waiver_at).not.toBeNull();
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "memorial", status: "published" });
    expect(await entitlementsOf(orderId)).toEqual([
      expect.objectContaining({ status: "applied", memorial_id: memorialId, owner_id: buyer.id }),
    ]);
    expect(await redeemedCount(full.id)).toBe(1);
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${memorialId}`, "max");
  });
});

// ---------------------------------------------------------------------------------------------

describe("webhook: povrat novca", () => {
  it("charge.refunded opoziva pravo, vraća memorijal u nacrt i stornira donaciju", async () => {
    const buyer = await createUser("povrat");
    const memorialId = await createMemorial(buyer.id);
    const target = await createMemorial(stranger.id, { status: "published" });
    const { order } = await placeOrder(buyer, [
      memorialItem(memorialId, { productKey: "memorial_portrait", visibility: "private" }),
      { kind: "gesture", productKey: "gesture_7d", memorialId: target, gestureKind: "poslastica", displayName: "Povrat" },
    ]);
    const { paymentIntent } = await pay(order);
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "portrait", status: "published", visibility: "private" });
    vi.mocked(revalidateTag).mockClear();

    const charge = { id: "ch_test_povrat", object: "charge", payment_intent: paymentIntent, metadata: {} };

    // Djelomičan povrat ništa ne opoziva.
    const partial = await deliver({
      type: "charge.refunded",
      object: { ...charge, refunded: false, amount: order.total_cents, amount_refunded: 100 },
    });
    expect(partial.response.status).toBe(200);
    expect(await getOrder(order.id)).toMatchObject({ status: "paid", refunded_at: null });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "portrait", status: "published" });

    const full = { ...charge, refunded: true, amount: order.total_cents, amount_refunded: order.total_cents };
    const refunded = await deliver({ type: "charge.refunded", object: full });
    const again = await deliver({ type: "charge.refunded", object: full });
    expect([refunded.response.status, again.response.status]).toEqual([200, 200]);

    const after = await getOrder(order.id);
    expect(after.status).toBe("refunded");
    expect(after.refunded_at).not.toBeNull();
    expect(await entitlementsOf(order.id)).toEqual([
      expect.objectContaining({ status: "revoked", memorial_id: memorialId }),
    ]);
    // Privatan sadržaj ne smije povratom postati javan: memorijal se vraća u nacrt.
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "free", status: "draft", visibility: "public" });
    expect(await donationsOf(order.id)).toEqual([
      expect.objectContaining({ amount_cents: donationCents, status: "reversed" }),
    ]);
    const gesture = must(
      await admin.from("gestures").select("status").eq("order_line_id", after.lines[1].id).single(),
    );
    expect(gesture.status).toBe("refunded");
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${memorialId}`, "max");
    // I memorijal na kojem je bila vraćena gesta mora dobiti svjež prikaz.
    expect(revalidateTag).toHaveBeenCalledWith(`memorial:${target}`, "max");
    expect(revalidateTag).toHaveBeenCalledWith("donations", "max");
    expect((await storedEvent(refunded.id))?.processed_at).not.toBeNull();
  });

  it("povrat za nepoznato plaćanje se potvrđuje, a povrat prije ispunjenja traži ponovni pokušaj", async () => {
    const memorialId = await createMemorial(owner.id);
    const { order } = await placeOrder(owner, [memorialItem(memorialId)]);
    const silenced = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const unknown = await deliver({
        type: "charge.refunded",
        object: { id: "ch_test_tudje", object: "charge", refunded: true, payment_intent: paymentIntentId(), metadata: {} },
      });
      expect(unknown.response.status).toBe(200);
      expect((await storedEvent(unknown.id))?.error).toBe("order_not_found");

      // Stripe je povrat isporučio prije potvrde plaćanja: mora ga ponoviti kasnije.
      const session = paidSession(order);
      const early = {
        id: "ch_test_rano",
        object: "charge",
        refunded: true,
        payment_intent: session.payment_intent,
        metadata: { order_id: order.id },
      };
      const tooEarly = await deliver({ type: "charge.refunded", object: early });
      expect(tooEarly.response.status).toBe(500);
      const stored = await storedEvent(tooEarly.id);
      expect(stored?.processed_at).toBeNull();
      expect(stored?.error).toBe("refund_before_fulfilment");
      expect(await getOrder(order.id)).toMatchObject({ status: "pending" });

      await deliver({ type: "checkout.session.completed", object: session });
      const retried = await deliver({ id: tooEarly.id, type: "charge.refunded", object: early });
      expect(retried.response.status).toBe(200);
    } finally {
      silenced.mockRestore();
    }
    expect(await getOrder(order.id)).toMatchObject({ status: "refunded" });
    expect(await getMemorial(memorialId)).toMatchObject({ tier: "free", status: "draft" });
  });
});
