import { describe, expect, it } from "vitest";
import { attentionItems, percent, readDashboard } from "@/lib/admin-dashboard";
import { suggestPromoCode } from "@/lib/promo-code";
import { parsePromoForm } from "@/server/admin/schemas";

/** Nadzorna ploča i prijedlog koda: čista logika, bez baze. */

describe("brojke na ploči", () => {
  it("odgovor baze pretvara u brojke, a sve neispravno u nulu", () => {
    const numbers = readDashboard({
      memorials: { created: 4, published: "2", publishedTotal: 7, onMeadow: -1, paidTotal: null, openDrafts: 2.7 },
      species: { pas: 5, macka: 2, zec: 0, kunic: "x" },
      trails: { new: 1, total: 3 },
      attention: { reports: 2, questions: 1, articlesInReview: 0, stripeErrors: 0 },
    });
    expect(numbers.memorials).toEqual({ created: 4, published: 2, publishedTotal: 7, onMeadow: 0, paidTotal: 0, openDrafts: 2 });
    expect(numbers.species).toEqual([
      { key: "pas", count: 5 },
      { key: "macka", count: 2 },
    ]);
    expect(numbers.trails).toEqual({ new: 1, total: 3, waitingEmail: 0, dedicationsPending: 0 });
    expect(numbers.newsletter).toEqual({ confirmed: 0, newConfirmed: 0, pending: 0, unsubscribed: 0 });
  });

  it("prazan ili pogrešan odgovor daje ploču s nulama", () => {
    for (const data of [null, undefined, "x", [], 5]) {
      const numbers = readDashboard(data as never);
      expect(numbers.memorials.created).toBe(0);
      expect(numbers.species).toEqual([]);
      expect(attentionItems(numbers)).toEqual([]);
    }
  });

  it("„čeka tebe” pokazuje samo ono što stvarno čeka, Stripe greške prve", () => {
    const numbers = readDashboard({
      attention: { reports: 2, questions: 0, articlesInReview: 3, stripeErrors: 1 },
      trails: { dedicationsPending: 1 },
    });
    expect(attentionItems(numbers).map((item) => [item.key, item.count])).toEqual([
      ["stripe", 1],
      ["reports", 2],
      ["dedications", 1],
      ["articles", 3],
    ]);
  });

  it("udio u postocima, bez dijeljenja s nulom", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(3, 2)).toBe(150);
    expect(percent(1, 0)).toBeNull();
  });
});

describe("prijedlog koda za popust", () => {
  it("ima stalan oblik bez znakova koji se lako zamijene", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(suggestPromoCode()).toMatch(/^TRAG-[A-HJKMNP-Z2-9]{6}$/);
    }
    expect(suggestPromoCode(() => new Uint8Array([0, 1, 30, 31, 255, 62]))).toBe("TRAG-AB9AHA");
  });

  it("predloženi kod prolazi provjeru obrasca", () => {
    const form = new FormData();
    const values: Record<string, string> = {
      code: suggestPromoCode(),
      kind: "promo",
      discount_type: "percent",
      discount_value: "10",
      max_redemptions: "",
      valid_from: "",
      valid_to: "",
      active: "on",
    };
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    form.append("applies_to", "memorial");
    expect(parsePromoForm(form).ok).toBe(true);
  });
});
