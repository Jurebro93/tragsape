import { describe, expect, it } from "vitest";
import { FLOWER_SPACING, checkFlowerName, flowerPosition, meadowBounds } from "@/lib/meadow";

describe("Velika livada", () => {
  it("cvjetovi se ne preklapaju i ostaju unutar granica", () => {
    const count = 3000;
    const points = Array.from({ length: count }, (_, i) => flowerPosition(i + 1));
    const bounds = meadowBounds(count);
    let minDistance = Infinity;
    // Provjera susjeda na uzorku: dovoljno za otkrivanje preklapanja u spirali.
    for (let i = 0; i < count; i += 7) {
      for (let j = 0; j < count; j++) {
        if (i !== j) minDistance = Math.min(minDistance, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
    }
    expect(minDistance).toBeGreaterThan(FLOWER_SPACING * 0.3);
    for (const p of points) {
      expect(p.x).toBeGreaterThan(bounds.minX);
      expect(p.x).toBeLessThan(bounds.maxX);
      expect(p.y).toBeGreaterThan(bounds.minY);
      expect(p.y).toBeLessThan(bounds.maxY);
    }
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
