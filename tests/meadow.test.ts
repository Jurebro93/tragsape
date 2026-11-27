import { describe, expect, it } from "vitest";
import { FLOWER_SPACING, PRINT_CAPACITY, checkDedication, checkFlowerName, dayPhase, flowerPlace, flowerPosition, meadowBounds } from "@/lib/meadow";

describe("Velika livada", () => {
  it("cvjetovi se ne preklapaju i ostaju unutar granica", () => {
    const count = 3000;
    const points = Array.from({ length: count }, (_, i) => flowerPosition(i + 1));
    const bounds = meadowBounds(count);
    let minDistance = Infinity;
    // Provjera susjeda na uzorku: dovoljno za otkrivanje preklapanja unutar i između otisaka.
    for (let i = 0; i < count; i += 3) {
      for (let j = 0; j < count; j++) {
        if (i !== j) minDistance = Math.min(minDistance, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
    }
    // Cvijet je promjera 26 jedinica: glave se ne smiju dodirivati.
    expect(minDistance).toBeGreaterThan(26);
    expect(FLOWER_SPACING).toBeGreaterThan(26);
    for (const p of points) {
      expect(p.x).toBeGreaterThan(bounds.minX);
      expect(p.x).toBeLessThan(bounds.maxX);
      expect(p.y).toBeGreaterThan(bounds.minY);
      expect(p.y).toBeLessThan(bounds.maxY);
    }
  });

  it("prvih pet tragova zauzme pet jastučića, pa se oblik šape vidi odmah", () => {
    expect([1, 2, 3, 4, 5].map((n) => flowerPlace(n).pad).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(flowerPlace(1).print).toBe(1);
    expect(flowerPlace(PRINT_CAPACITY).print).toBe(1);
    expect(flowerPlace(PRINT_CAPACITY + 1).print).toBe(2);
  });

  it("doba dana računa se po zagrebačkom vremenu i godišnjem dobu", () => {
    // 27. 11. u 17:30 u Zagrebu (16:30 UTC) sunce je već zašlo; 21. 6. u isto vrijeme je dan.
    expect(dayPhase(new Date("2026-11-27T16:30:00Z"))).toBe("night");
    expect(dayPhase(new Date("2026-06-21T15:30:00Z"))).toBe("day");
    expect(dayPhase(new Date("2026-11-27T11:00:00Z"))).toBe("day");
    expect(dayPhase(new Date("2026-11-27T15:15:00Z"))).toBe("dusk");
  });

  it("posveta: neobavezna, do 80 znakova, bez poveznica i oznaka", () => {
    expect(checkDedication("  ")).toEqual({ ok: true, text: null });
    expect(checkDedication("Hvala za  svaku šetnju uz Savu.")).toEqual({ ok: true, text: "Hvala za svaku šetnju uz Savu." });
    expect(checkDedication("a".repeat(81))).toEqual({ ok: false, reason: "dedicationLong" });
    expect(checkDedication("<b>Medo</b>")).toEqual({ ok: false, reason: "dedicationChars" });
    expect(checkDedication("Posjeti reklama.hr").ok).toBe(false);
    expect(checkDedication("www.nesto").ok).toBe(false);
  });

  it("isti broj uvijek daje isto mjesto", () => {
    expect(flowerPosition(1284)).toEqual(flowerPosition(1284));
  });

  it("ime: prihvaća hrvatska slova, odbija prazno, predugo, znakove i psovke", () => {
    expect(checkFlowerName("  Žućko  ")).toEqual({ ok: true, name: "Žućko" });
    expect(checkFlowerName("Gospodin Đuro")).toEqual({ ok: true, name: "Gospodin Đuro" });
    expect(checkFlowerName("")).toEqual({ ok: false, reason: "empty" });
    expect(checkFlowerName("a".repeat(31))).toEqual({ ok: false, reason: "long" });
    expect(checkFlowerName("Rex <script>")).toEqual({ ok: false, reason: "chars" });
    expect(checkFlowerName("www.reklama.hr").ok).toBe(false);
    expect(checkFlowerName("Kurac")).toEqual({ ok: false, reason: "blocked" });
  });
});
