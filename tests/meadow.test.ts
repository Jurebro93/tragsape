import { describe, expect, it } from "vitest";
import {
  FLOWER_SPACING,
  MEADOW_ZONES,
  POND,
  ZONE_CAPACITY,
  checkDedication,
  checkFlowerName,
  dayPhase,
  flowerPlace,
  flowerPosition,
  meadowBounds,
  zoneOf,
  type MeadowZone,
} from "@/lib/meadow";

describe("Velika livada", () => {
  it("cvjetovi se ne preklapaju, ni unutar svijeta ni između svjetova, i ostaju unutar granica", () => {
    const counts: Record<MeadowZone, number> = { psi: 9000, macke: 9000, mali: 1500, ptice: 1500, ostali: 1500 };
    const points: Array<{ x: number; y: number; zone: MeadowZone }> = [];
    for (const zone of MEADOW_ZONES) {
      for (let i = 1; i <= counts[zone]; i++) points.push({ ...flowerPosition(zone, i), zone });
    }
    const bounds = meadowBounds(counts);
    const cells = new Map<string, number[]>();
    points.forEach((p, i) => {
      const key = `${Math.floor(p.x / 60)}:${Math.floor(p.y / 60)}`;
      cells.set(key, [...(cells.get(key) ?? []), i]);
    });
    let minDistance = Infinity;
    points.forEach((p, i) => {
      const gx = Math.floor(p.x / 60);
      const gy = Math.floor(p.y / 60);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const j of cells.get(`${gx + dx}:${gy + dy}`) ?? []) {
            if (j !== i) minDistance = Math.min(minDistance, Math.hypot(p.x - points[j].x, p.y - points[j].y));
          }
        }
      }
      expect(Math.hypot((p.x - POND.x) / POND.rx, (p.y - POND.y) / POND.ry)).toBeGreaterThan(1);
      expect(p.x).toBeGreaterThan(bounds.minX);
      expect(p.x).toBeLessThan(bounds.maxX);
      expect(p.y).toBeGreaterThan(bounds.minY);
      expect(p.y).toBeLessThan(bounds.maxY);
    });
    // Cvijet je promjera 26 jedinica: glave se ne smiju dodirivati.
    expect(minDistance).toBeGreaterThan(24);
    expect(FLOWER_SPACING).toBeGreaterThan(26);
  });

  it("prvih pet tragova svakog svijeta zauzme pet jastučića, pa se oblik otiska vidi odmah", () => {
    for (const zone of MEADOW_ZONES) {
      expect([1, 2, 3, 4, 5].map((n) => flowerPlace(zone, n).pad).sort()).toEqual([0, 1, 2, 3, 4]);
      expect(flowerPlace(zone, ZONE_CAPACITY[zone]).print).toBe(1);
      expect(flowerPlace(zone, ZONE_CAPACITY[zone] + 1).print).toBe(2);
    }
    expect(zoneOf("pas")).toBe("psi");
    expect(zoneOf("macka")).toBe("macke");
    expect(zoneOf("drugo")).toBe("ostali");
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
    expect(flowerPosition("psi", 1284)).toEqual(flowerPosition("psi", 1284));
    expect(flowerPosition("psi", 12)).not.toEqual(flowerPosition("macke", 12));
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
