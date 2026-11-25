import { describe, expect, it } from "vitest";
import {
  PricingError,
  percentOf,
  priceCart,
  type CartItem,
  type PriceCartInput,
  type PricingPromo,
} from "@/lib/pricing";

const products = {
  memorial: { unitAmountCents: 1900 },
  memorial_portrait: { unitAmountCents: 2900 },
  upgrade_portrait: { unitAmountCents: 1000 },
  gesture_7d: { unitAmountCents: 299 },
  gesture_30d: { unitAmountCents: 499 },
  gesture_365d: { unitAmountCents: 999 },
};

const MEMORIAL_A = "00000000-0000-4000-8000-00000000000a";
const MEMORIAL_B = "00000000-0000-4000-8000-00000000000b";

const memorial: CartItem = { kind: "memorial", productKey: "memorial", memorialId: MEMORIAL_A };
const memorialPortrait: CartItem = { kind: "memorial", productKey: "memorial_portrait", memorialId: MEMORIAL_A };
const upgrade: CartItem = { kind: "upgrade", productKey: "upgrade_portrait", memorialId: MEMORIAL_B };
const gift: CartItem = { kind: "gift", productKey: "memorial" };
const giftPortrait: CartItem = { kind: "gift", productKey: "memorial_portrait" };
const gesture: CartItem = { kind: "gesture", productKey: "gesture_30d", memorialId: MEMORIAL_B };

function price(items: CartItem[], options: Partial<Omit<PriceCartInput, "items">> = {}) {
  return priceCart({
    items,
    products,
    settings: { repeatDiscountPct: 30 },
    repeatEligible: false,
    ...options,
  });
}

function promo(overrides: Partial<PricingPromo> = {}): PricingPromo {
  return {
    id: "promo-1",
    kind: "promo",
    discountType: "percent",
    discountValue: 20,
    appliesTo: ["memorial", "memorial_portrait"],
    ...overrides,
  };
}

describe("priceCart: osnovno", () => {
  it("bez popusta naplaćuje cijenu iz cjenika", () => {
    const cart = price([memorial]);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({
      kind: "memorial",
      productKey: "memorial",
      memorialId: MEMORIAL_A,
      unitAmountCents: 1900,
      discountCents: 0,
      totalCents: 1900,
      discountReason: null,
    });
    expect(cart).toMatchObject({ subtotalCents: 1900, discountCents: 0, totalCents: 1900, promoApplied: false });
  });

  it("čuva redoslijed stavki, memorijal i meta podatke", () => {
    const cart = price([
      { ...gesture, meta: { kind: "svijeca", display_name: "Ana" } },
      { ...memorial, meta: { publish: true } },
      gift,
    ]);
    expect(cart.lines.map((line) => line.kind)).toEqual(["gesture", "memorial", "gift"]);
    expect(cart.lines[0].meta).toEqual({ kind: "svijeca", display_name: "Ana" });
    expect(cart.lines[1].meta).toEqual({ publish: true });
    expect(cart.lines[2]).toMatchObject({ memorialId: null, meta: {} });
    expect(cart.subtotalCents).toBe(499 + 1900 + 1900);
  });

  it("prazna košarica daje nule", () => {
    expect(price([])).toEqual({ lines: [], subtotalCents: 0, discountCents: 0, totalCents: 0, promoApplied: false });
  });

  it("nepoznat proizvod je greška, a ne besplatna stavka", () => {
    expect(() => priceCart({ items: [memorial], products: {}, settings: { repeatDiscountPct: 30 }, repeatEligible: false }))
      .toThrow(PricingError);
  });
});

describe("priceCart: popust za ponovnu kupnju", () => {
  it("vrijedi za Memorijal, Memorijal + Portret i nadogradnju", () => {
    const cart = price([memorial, memorialPortrait, upgrade], { repeatEligible: true });
    expect(cart.lines.map((line) => [line.discountCents, line.totalCents, line.discountReason])).toEqual([
      [570, 1330, "repeat"],
      [870, 2030, "repeat"],
      [300, 700, "repeat"],
    ]);
    expect(cart).toMatchObject({ subtotalCents: 5800, discountCents: 1740, totalCents: 4060, promoApplied: false });
  });

  it("ne vrijedi kad kupac nema drugi plaćeni memorijal", () => {
    const cart = price([memorial, upgrade], { repeatEligible: false });
    expect(cart.discountCents).toBe(0);
    expect(cart.lines.every((line) => line.discountReason === null)).toBe(true);
  });

  it("nikad ne vrijedi za poklon ni za gestu", () => {
    const cart = price([gift, giftPortrait, gesture], { repeatEligible: true });
    expect(cart.lines.map((line) => line.discountCents)).toEqual([0, 0, 0]);
    expect(cart.lines.every((line) => line.discountReason === null)).toBe(true);
    expect(cart.totalCents).toBe(1900 + 2900 + 499);
  });

  it("stavka može nadjačati pravo košarice (drugi memorijal računa se po stavci)", () => {
    const cart = price(
      [
        { ...memorial, repeatEligible: true },
        { ...upgrade, repeatEligible: false },
      ],
      { repeatEligible: false },
    );
    expect(cart.lines.map((line) => line.discountReason)).toEqual(["repeat", null]);
    expect(cart.discountCents).toBe(570);

    const reversed = price([{ ...memorial, repeatEligible: false }, upgrade], { repeatEligible: true });
    expect(reversed.lines.map((line) => line.discountReason)).toEqual([null, "repeat"]);
  });

  it("koristi postotak iz postavki", () => {
    const cart = price([memorial], { repeatEligible: true, settings: { repeatDiscountPct: 15 } });
    expect(cart.lines[0]).toMatchObject({ discountCents: 285, totalCents: 1615 });
    expect(price([memorial], { repeatEligible: true, settings: { repeatDiscountPct: 0 } }).lines[0]).toMatchObject({
      discountCents: 0,
      discountReason: null,
    });
  });
});

describe("priceCart: kodovi", () => {
  it("postotni kod vrijedi samo za proizvode iz applies_to", () => {
    const cart = price([memorial, upgrade, gesture], { promo: promo() });
    expect(cart.lines.map((line) => [line.discountCents, line.discountReason])).toEqual([
      [380, "promo"],
      [0, null],
      [0, null],
    ]);
    expect(cart).toMatchObject({ discountCents: 380, totalCents: 1520 + 1000 + 499, promoApplied: true });
  });

  it("postotni kod vrijedi za svaku stavku na koju se odnosi", () => {
    const cart = price([memorial, memorialPortrait], { promo: promo({ discountValue: 10 }) });
    expect(cart.lines.map((line) => line.discountCents)).toEqual([190, 290]);
  });

  it("partnerski kod bilježi razlog partner", () => {
    const cart = price([memorial], { promo: promo({ kind: "partner" }) });
    expect(cart.lines[0].discountReason).toBe("partner");
    expect(cart.promoApplied).toBe(true);
  });

  it("kod smije vrijediti za poklon i gestu ako ih applies_to navodi", () => {
    const cart = price([gift, gesture], {
      repeatEligible: true,
      promo: promo({ discountValue: 50, appliesTo: ["memorial", "gesture_30d"] }),
    });
    expect(cart.lines.map((line) => [line.discountCents, line.discountReason])).toEqual([
      [950, "promo"],
      [250, "promo"],
    ]);
  });

  it("kod koji se ne odnosi ni na jednu stavku nije primijenjen", () => {
    const cart = price([gesture], { promo: promo() });
    expect(cart.promoApplied).toBe(false);
    expect(cart.discountCents).toBe(0);
  });

  it("kod od 100 % daje besplatnu stavku", () => {
    const cart = price([memorial], { promo: promo({ discountValue: 100 }) });
    expect(cart.lines[0]).toMatchObject({ discountCents: 1900, totalCents: 0 });
    expect(cart.totalCents).toBe(0);
  });
});

describe("priceCart: popusti se ne zbrajaju", () => {
  it("veći popust za ponovnu kupnju pobjeđuje kod i kod se ne veže uz narudžbu", () => {
    const cart = price([memorial], { repeatEligible: true, promo: promo({ discountValue: 20 }) });
    expect(cart.lines[0]).toMatchObject({ discountCents: 570, totalCents: 1330, discountReason: "repeat" });
    expect(cart.promoApplied).toBe(false);
  });

  it("veći kod pobjeđuje popust za ponovnu kupnju, bez zbrajanja", () => {
    const cart = price([memorial], { repeatEligible: true, promo: promo({ discountValue: 50 }) });
    expect(cart.lines[0]).toMatchObject({ discountCents: 950, totalCents: 950, discountReason: "promo" });
    expect(cart.promoApplied).toBe(true);
  });

  it("pri jednakom popustu vrijedi ponovna kupnja, pa se kod ne troši", () => {
    const cart = price([memorial], { repeatEligible: true, promo: promo({ discountValue: 30, kind: "partner" }) });
    expect(cart.lines[0]).toMatchObject({ discountCents: 570, discountReason: "repeat" });
    expect(cart.promoApplied).toBe(false);
  });

  it("odlučuje se po stavci: kod na poklonu, ponovna kupnja na vlastitom memorijalu", () => {
    const cart = price([memorial, gift], { repeatEligible: true, promo: promo({ discountValue: 20 }) });
    expect(cart.lines.map((line) => [line.discountCents, line.discountReason])).toEqual([
      [570, "repeat"],
      [380, "promo"],
    ]);
    expect(cart.promoApplied).toBe(true);
    expect(cart.discountCents).toBe(950);
  });
});

describe("priceCart: kod s fiksnim iznosom", () => {
  const fixed = (value: number, overrides: Partial<PricingPromo> = {}) =>
    promo({ discountType: "fixed", discountValue: value, ...overrides });

  it("vrijedi jednom po narudžbi, na prvoj stavci na koju se odnosi", () => {
    const cart = price([gesture, memorial, memorialPortrait], { promo: fixed(500) });
    expect(cart.lines.map((line) => [line.discountCents, line.discountReason])).toEqual([
      [0, null],
      [500, "promo"],
      [0, null],
    ]);
    expect(cart).toMatchObject({ discountCents: 500, promoApplied: true });
  });

  it("stavka ne ide ispod nule i ostatak se ne prenosi", () => {
    const cart = price([memorial, memorialPortrait], { promo: fixed(5000) });
    expect(cart.lines.map((line) => [line.discountCents, line.totalCents])).toEqual([
      [1900, 0],
      [0, 2900],
    ]);
    expect(cart.totalCents).toBe(2900);
  });

  it("ne zbraja se s popustom za ponovnu kupnju: na stavci vrijedi veći", () => {
    const larger = price([memorial], { repeatEligible: true, promo: fixed(1000) });
    expect(larger.lines[0]).toMatchObject({ discountCents: 1000, discountReason: "promo" });
    expect(larger.promoApplied).toBe(true);

    const smaller = price([memorial], { repeatEligible: true, promo: fixed(500) });
    expect(smaller.lines[0]).toMatchObject({ discountCents: 570, discountReason: "repeat" });
    expect(smaller.promoApplied).toBe(false);
  });

  it("ako na prvoj stavci gubi od ponovne kupnje, ide na sljedeću na kojoj donosi popust", () => {
    const cart = price([memorial, gift, giftPortrait], { repeatEligible: true, promo: fixed(500) });
    expect(cart.lines.map((line) => [line.discountCents, line.discountReason])).toEqual([
      [570, "repeat"],
      [500, "promo"],
      [0, null],
    ]);
    expect(cart.promoApplied).toBe(true);
  });
});

describe("zaokruživanje", () => {
  it("postotak se zaokružuje na najbliži cent, pola centa nagore", () => {
    expect(percentOf(299, 15)).toBe(45); // 44,85
    expect(percentOf(333, 10)).toBe(33); // 33,3
    expect(percentOf(999, 25)).toBe(250); // 249,75
    expect(percentOf(499, 50)).toBe(250); // 249,5
    expect(percentOf(1, 50)).toBe(1); // 0,5
    expect(percentOf(1, 49)).toBe(0); // 0,49
    expect(percentOf(1900, 30)).toBe(570);
  });

  it("postotak izvan raspona ne daje negativan ni prevelik popust", () => {
    expect(percentOf(1900, 150)).toBe(1900);
    expect(percentOf(1900, -20)).toBe(0);
  });

  it("zaokružen popust ulazi u stavku i u zbroj", () => {
    const cart = price([gesture, { ...gesture, productKey: "gesture_7d" }], {
      promo: promo({ discountValue: 15, appliesTo: ["gesture_7d", "gesture_30d"] }),
    });
    // 499 × 15 % = 74,85 → 75; 299 × 15 % = 44,85 → 45
    expect(cart.lines.map((line) => [line.discountCents, line.totalCents])).toEqual([
      [75, 424],
      [45, 254],
    ]);
    expect(cart).toMatchObject({ subtotalCents: 798, discountCents: 120, totalCents: 678 });
  });

  it("zbrojevi uvijek odgovaraju stavkama i nijedna stavka nije negativna", () => {
    const items = [memorial, memorialPortrait, upgrade, gift, giftPortrait, gesture];
    const allKeys = Object.keys(products);
    for (const repeatEligible of [true, false]) {
      for (const discountType of ["percent", "fixed"] as const) {
        for (const discountValue of [1, 7, 33, 50, 99, 100, 2500, 100000]) {
          if (discountType === "percent" && discountValue > 100) {
            continue;
          }
          const cart = price(items, {
            repeatEligible,
            promo: promo({ discountType, discountValue, appliesTo: allKeys }),
          });
          for (const line of cart.lines) {
            expect(line.totalCents).toBeGreaterThanOrEqual(0);
            expect(line.discountCents).toBeGreaterThanOrEqual(0);
            expect(line.totalCents).toBe(line.unitAmountCents - line.discountCents);
            expect(Number.isInteger(line.totalCents)).toBe(true);
          }
          expect(cart.subtotalCents).toBe(cart.lines.reduce((sum, line) => sum + line.unitAmountCents, 0));
          expect(cart.discountCents).toBe(cart.lines.reduce((sum, line) => sum + line.discountCents, 0));
          expect(cart.totalCents).toBe(cart.subtotalCents - cart.discountCents);
          expect(cart.promoApplied).toBe(cart.lines.some((line) => line.discountReason === "promo"));
          if (discountType === "fixed") {
            expect(cart.lines.filter((line) => line.discountReason === "promo").length).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});
