/**
 * Izračun košarice. Čista logika bez I/O: ista pravila vrijede za prikaz cijene kupcu,
 * za narudžbu i za testove. Svi iznosi su u centima (EUR) i dolaze iz tablice `products`,
 * nikad od klijenta.
 */

export type ProductKey =
  | "memorial"
  | "memorial_portrait"
  | "upgrade_portrait"
  | "gesture_7d"
  | "gesture_30d"
  | "gesture_365d";

export type LineKind = "memorial" | "upgrade" | "gift" | "gesture";

export type DiscountReason = "repeat" | "promo" | "partner";

export type CartItem = {
  kind: LineKind;
  productKey: ProductKey;
  memorialId?: string | null;
  meta?: Record<string, unknown>;
  /**
   * Nadjačava `repeatEligible` košarice za ovu stavku. Treba kad se u istoj narudžbi kupuje
   * za više memorijala: „drugi plaćeni memorijal" računa se u odnosu na memorijal stavke.
   */
  repeatEligible?: boolean;
};

export type PricingProduct = { unitAmountCents: number };

export type PricingPromo = {
  id: string;
  kind: "promo" | "partner";
  discountType: "percent" | "fixed";
  /** Postotak (0–100) ili iznos u centima, ovisno o `discountType`. */
  discountValue: number;
  /** Ključevi proizvoda na koje kod vrijedi. */
  appliesTo: readonly string[];
};

export type PriceCartInput = {
  items: readonly CartItem[];
  products: Readonly<Partial<Record<string, PricingProduct>>>;
  settings: { repeatDiscountPct: number };
  /** Kupac već ima barem jedan drugi plaćeni memorijal. Računa pozivatelj. */
  repeatEligible: boolean;
  promo?: PricingPromo | null;
};

export type PricedLine = {
  kind: LineKind;
  productKey: ProductKey;
  memorialId: string | null;
  meta: Record<string, unknown>;
  unitAmountCents: number;
  discountCents: number;
  totalCents: number;
  discountReason: DiscountReason | null;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  /** Kod je donio popust na barem jednoj stavci. Samo tada se veže uz narudžbu. */
  promoApplied: boolean;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

/** Popust za ponovnu kupnju vrijedi samo za vlastiti memorijal, nikad za poklon ili gestu. */
const REPEAT_KINDS: readonly LineKind[] = ["memorial", "upgrade"];
const REPEAT_PRODUCTS: readonly ProductKey[] = ["memorial", "memorial_portrait", "upgrade_portrait"];

/** Postotak od iznosa, zaokružen na najbliži cent (pola centa ide nagore). Bez decimalnog računa. */
export function percentOf(amountCents: number, pct: number): number {
  const bounded = Math.min(100, Math.max(0, Math.trunc(pct)));
  return Math.floor((amountCents * bounded + 50) / 100);
}

function repeatApplies(item: CartItem, cartEligible: boolean): boolean {
  return (
    (item.repeatEligible ?? cartEligible) &&
    REPEAT_KINDS.includes(item.kind) &&
    REPEAT_PRODUCTS.includes(item.productKey)
  );
}

export function priceCart(input: PriceCartInput): PricedCart {
  const promo = input.promo ?? null;
  // Kod s fiksnim iznosom vrijedi jednom po narudžbi.
  let fixedAvailable = promo?.discountType === "fixed";
  let promoApplied = false;

  const lines = input.items.map((item): PricedLine => {
    const product = input.products[item.productKey];
    if (!product || !Number.isInteger(product.unitAmountCents) || product.unitAmountCents < 0) {
      throw new PricingError(`unknown_product:${item.productKey}`);
    }
    const unit = product.unitAmountCents;

    const repeatDiscount = repeatApplies(item, input.repeatEligible)
      ? percentOf(unit, input.settings.repeatDiscountPct)
      : 0;

    let promoDiscount = 0;
    if (promo && promo.appliesTo.includes(item.productKey)) {
      if (promo.discountType === "percent") {
        promoDiscount = percentOf(unit, promo.discountValue);
      } else if (fixedAvailable) {
        // Stavka nikad ne ide ispod nule; ostatak fiksnog iznosa se ne prenosi dalje.
        promoDiscount = Math.min(unit, Math.max(0, Math.trunc(promo.discountValue)));
      }
    }

    // Popusti se ne zbrajaju: vrijedi veći. Kod pobjeđuje samo ako je strogo povoljniji,
    // pa se pri jednakom popustu ne troši i partneru se ne obračunava provizija.
    let discountCents = 0;
    let discountReason: DiscountReason | null = null;
    if (promo && promoDiscount > repeatDiscount) {
      discountCents = promoDiscount;
      discountReason = promo.kind;
      promoApplied = true;
      if (promo.discountType === "fixed") {
        fixedAvailable = false;
      }
    } else if (repeatDiscount > 0) {
      discountCents = repeatDiscount;
      discountReason = "repeat";
    }

    return {
      kind: item.kind,
      productKey: item.productKey,
      memorialId: item.memorialId ?? null,
      meta: item.meta ?? {},
      unitAmountCents: unit,
      discountCents,
      totalCents: unit - discountCents,
      discountReason,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitAmountCents, 0);
  const discountCents = lines.reduce((sum, line) => sum + line.discountCents, 0);

  return {
    lines,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    promoApplied,
  };
}
