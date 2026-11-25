import "server-only";
import type { PricedCart } from "@/lib/pricing";

/**
 * Što kupac kupuje. Namjerno nema polja za iznos: cijene i popuste računa poslužitelj
 * iz tablice `products`.
 */
export type CheckoutItem =
  | {
      kind: "memorial";
      productKey: "memorial" | "memorial_portrait";
      memorialId: string;
      publish: boolean;
      visibility?: "public" | "unlisted" | "private";
    }
  | { kind: "upgrade"; memorialId: string }
  | {
      kind: "gift";
      productKey: "memorial" | "memorial_portrait";
      recipientEmail: string;
      recipientName?: string;
      buyerName?: string;
      message?: string;
      sendAt?: string;
    }
  | {
      kind: "gesture";
      productKey: "gesture_7d" | "gesture_30d" | "gesture_365d";
      memorialId: string;
      gestureKind: "svijeca" | "sapica" | "cvijet" | "poslastica" | "loptica";
      displayName: string;
      message?: string;
    };

export type CheckoutError =
  | "not_configured"
  | "invalid"
  | "promo_invalid"
  | "waiver_required"
  | "not_allowed"
  | "failed";

export type CheckoutFailure = { ok: false; error: CheckoutError; message: string };

export type CheckoutResult = { ok: true; url: string } | CheckoutFailure;

export type QuoteResult = { ok: true; quote: PricedCart } | CheckoutFailure;

export type FulfilledGift = {
  code: string;
  tier: "memorial" | "portrait";
  recipientEmail: string;
  recipientName: string | null;
  buyerName: string | null;
  message: string | null;
};

/** Ono što su `fulfill_order` i `refund_order` vratili, u obliku koji koristi ostatak koda. */
export type OrderEffects = {
  status: "fulfilled" | "already_paid" | "refunded" | "already_refunded" | "unknown";
  /** Memorijali kojima se promijenio prikaz, bez ponavljanja. */
  memorialIds: string[];
  gifts: FulfilledGift[];
  /** Plaćene stavke koje baza nije mogla primijeniti kako je naručeno; treba ih vidjeti admin. */
  issues: string[];
};
