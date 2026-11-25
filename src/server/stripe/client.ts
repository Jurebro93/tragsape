import "server-only";
import Stripe from "stripe";
import { env } from "@/server/env";

let cached: { key: string; client: Stripe } | null = null;

/**
 * Stripe klijent, stvoren tek kad zatreba. Bez ključa vraća null, pa build i uvoz modula
 * ne traže tajne. Verzija API-ja se ne zadaje: koristi se ona s kojom je paket izdan,
 * jer njoj odgovaraju i njegovi tipovi.
 */
export function getStripe(): Stripe | null {
  const key = env.stripeSecretKey;
  if (!key) {
    return null;
  }
  if (!cached || cached.key !== key) {
    cached = { key, client: new Stripe(key) };
  }
  return cached.client;
}
