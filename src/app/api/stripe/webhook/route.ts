import type Stripe from "stripe";
import { afterOrderFulfilled, parseOrderEffects, revalidateOrderTags } from "@/server/checkout/after-payment";
import { env } from "@/server/env";
import { getStripe } from "@/server/stripe/client";
import { createAdminClient } from "@/server/supabase/admin";

/**
 * Jedini ulaz za ispunjenje narudžbi. Stripe isti događaj može poslati više puta i izvan
 * redoslijeda, pa se svaki bilježi u `stripe_events`, a promjene stanja rade funkcije u bazi
 * koje su same idempotentne.
 *
 * Odgovor: 400 za neispravan potpis, 200 za sve što je obrađeno ili trajno odbijeno (razlog
 * ostaje u `stripe_events.error`), 5xx samo kad ponovni pokušaj ima smisla.
 */

type Admin = ReturnType<typeof createAdminClient>;

const HANDLED_TYPES: ReadonlySet<string> = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function received(): Response {
  return Response.json({ received: true });
}

function orderIdOf(source: { metadata?: Stripe.Metadata | null; client_reference_id?: string | null }): string | null {
  const candidate = source.metadata?.order_id ?? source.client_reference_id ?? null;
  return candidate && UUID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Obrađuje događaj. Vraća null kad je sve u redu ili razlog trajnog odbijanja (bez ponavljanja);
 * baca grešku kad Stripe treba pokušati ponovno.
 */
async function handleEvent(admin: Admin, event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return fulfillFromSession(admin, event.data.object);
    case "checkout.session.expired":
      return closeOrder(admin, event.data.object, "expired");
    case "checkout.session.async_payment_failed":
      return closeOrder(admin, event.data.object, "failed");
    case "charge.refunded":
      return refundFromCharge(admin, event.data.object);
    default:
      return null;
  }
}

async function fulfillFromSession(admin: Admin, session: Stripe.Checkout.Session): Promise<string | null> {
  // Odgođena plaćanja prvo jave „completed" bez novca; tada se čeka async_payment_succeeded.
  if (session.payment_status !== "paid") {
    return null;
  }
  const orderId = orderIdOf(session);
  if (!orderId) {
    return "session_without_order";
  }
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, total_cents, stripe_checkout_session_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    throw new Error(`orders: ${error.message}`);
  }
  if (!order) {
    return "order_not_found";
  }
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) {
    return "session_mismatch";
  }
  // Plaćeno mora biti točno ono što je narudžba izračunala, u eurima.
  if (session.amount_total !== order.total_cents || session.currency?.toLowerCase() !== "eur") {
    return `amount_mismatch: plaćeno ${session.amount_total} ${session.currency}, narudžba ${order.total_cents} eur`;
  }
  if (order.status !== "pending" && order.status !== "paid") {
    return `paid_but_order_${order.status}`;
  }

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const { data, error: fulfillError } = await admin.rpc("fulfill_order", {
    p_order_id: order.id,
    // Generirani tipovi ne poznaju prazan argument; baza ga prihvaća.
    p_payment_intent: paymentIntent as string,
    p_email: session.customer_details?.email ?? session.customer_email ?? "",
  });
  if (fulfillError) {
    throw new Error(`fulfill_order: ${fulfillError.message}`);
  }

  const effects = parseOrderEffects(data);
  if (effects.status === "fulfilled") {
    revalidateOrderTags(effects);
    await afterOrderFulfilled(effects, order.id);
  } else if (effects.status === "already_paid") {
    // Ponovljena isporuka nakon prekida: narudžba je ispunjena, ali predmemorija možda nije osvježena.
    revalidateOrderTags(effects);
  }
  // Plaćeno, a nije primijenjeno kako je naručeno (npr. spomen je u međuvremenu već nadograđen):
  // bilježi se uz događaj da admin može postupiti.
  return effects.issues.length > 0 ? `issues: ${effects.issues.join(", ")}` : null;
}

/** Sesija je istekla ili odgođeno plaćanje nije prošlo: narudžba koja još čeka se zatvara. */
async function closeOrder(
  admin: Admin,
  session: Stripe.Checkout.Session,
  status: "expired" | "failed",
): Promise<string | null> {
  const orderId = orderIdOf(session);
  if (!orderId) {
    return "session_without_order";
  }
  const { error } = await admin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("status", "pending")
    .eq("stripe_checkout_session_id", session.id);
  if (error) {
    throw new Error(`orders: ${error.message}`);
  }
  return null;
}

async function refundFromCharge(admin: Admin, charge: Stripe.Charge): Promise<string | null> {
  // Djelomičan povrat ne opoziva ništa; prava se vraćaju tek kad je vraćen cijeli iznos.
  if (!charge.refunded) {
    return null;
  }
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id ?? null);
  if (!paymentIntent) {
    return "charge_without_payment_intent";
  }
  const { data: order, error } = await admin
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntent)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`orders: ${error.message}`);
  }
  if (!order) {
    // Povrat može stići prije potvrde plaćanja (npr. nakon prekida rada). Ako naplata nosi našu
    // narudžbu koja još čeka, Stripe treba pokušati kasnije; inače bi kupac zadržao vraćeno.
    const pendingId = orderIdOf(charge);
    if (pendingId) {
      const { data: pending, error: pendingError } = await admin
        .from("orders")
        .select("id")
        .eq("id", pendingId)
        .eq("status", "pending")
        .maybeSingle();
      if (pendingError || pending) {
        throw new Error(pendingError ? `orders: ${pendingError.message}` : "refund_before_fulfilment");
      }
    }
    return "order_not_found";
  }

  const { data, error: refundError } = await admin.rpc("refund_order", { p_order_id: order.id });
  if (refundError) {
    throw new Error(`refund_order: ${refundError.message}`);
  }
  const effects = parseOrderEffects(data);
  if (effects.status === "refunded") {
    revalidateOrderTags(effects);
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = env.stripeWebhookSecret;
  if (!stripe || !secret) {
    return new Response("Stripe nije podešen", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  // Potpis se računa nad sirovim tijelom, pa se ono čita kao tekst i ne parsira prije provjere.
  const payload = await request.text();
  if (!signature) {
    return new Response("Nedostaje potpis", { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Neispravan potpis", { status: 400 });
  }

  if (!HANDLED_TYPES.has(event.type)) {
    return received();
  }

  const admin = createAdminClient();
  const { error: claimError } = await admin.from("stripe_events").insert({ event_id: event.id, type: event.type });
  if (claimError) {
    if (claimError.code !== "23505") {
      console.error("[stripe] događaj nije zabilježen", event.id, claimError.message);
      return new Response("Događaj nije zabilježen", { status: 500 });
    }
    const { data: seen, error: seenError } = await admin
      .from("stripe_events")
      .select("processed_at")
      .eq("event_id", event.id)
      .maybeSingle();
    if (seenError) {
      return new Response("Događaj nije provjeren", { status: 500 });
    }
    if (seen?.processed_at) {
      return received();
    }
    // Raniji pokušaj nije dovršen: obrada se ponavlja, a funkcije u bazi ne ispunjavaju dvaput.
  }

  let note: string | null;
  try {
    note = await handleEvent(admin, event);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe] obrada događaja nije uspjela", event.id, event.type, message);
    await admin.from("stripe_events").update({ error: message.slice(0, 500) }).eq("event_id", event.id);
    return new Response("Obrada nije uspjela", { status: 500 });
  }

  if (note) {
    // Trajno odbijeno: ponavljanje ne bi pomoglo, ali netko to treba pogledati.
    console.error("[stripe] događaj odbijen", event.id, event.type, note);
  }
  const { error: doneError } = await admin
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString(), error: note })
    .eq("event_id", event.id);
  if (doneError) {
    console.error("[stripe] događaj nije označen kao obrađen", event.id, doneError.message);
  }
  return received();
}
