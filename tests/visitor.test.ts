import { afterEach, describe, expect, it, vi } from "vitest";

// Modul uvozi i klijente baze; ovdje se ispituje samo čista logika adrese i sažetka.
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/server/supabase/session", () => ({ createSessionClient: vi.fn() }));

import { clientIp, dailyIpHash, dailyVisitorHash } from "@/server/public/visitor";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/poruke", { method: "POST", headers });
}

afterEach(() => {
  delete process.env.CLIENT_IP_HEADER;
});

describe("adresa posjetitelja", () => {
  it("bez postavke uzima prvu adresu iz x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("uz CLIENT_IP_HEADER vjeruje tom zaglavlju, a ne podmetnutom x-forwarded-for", () => {
    process.env.CLIENT_IP_HEADER = "CF-Connecting-IP";
    const spoofed = request({ "x-forwarded-for": "198.51.100.99, 203.0.113.7", "cf-connecting-ip": "203.0.113.7" });
    expect(clientIp(spoofed)).toBe("203.0.113.7");
  });

  it("pada natrag na x-forwarded-for kad postavljeno zaglavlje ne stigne", () => {
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("bez ijednog zaglavlja ne baca grešku", () => {
    expect(clientIp(request({}))).toBe("nepoznato");
  });
});

describe("sažetak posjetitelja", () => {
  process.env.HASH_SECRET ??= "testna-tajna-za-sazetke";
  const visitor = { "x-forwarded-for": "203.0.113.7", "user-agent": "Preglednik/1.0" };

  it("ne sadrži adresu i isti je unutar dana", () => {
    const noon = new Date("2026-11-25T11:00:00Z");
    const evening = new Date("2026-11-25T20:00:00Z");
    const hash = dailyIpHash(request(visitor), noon);
    expect(hash).not.toContain("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
    expect(dailyIpHash(request(visitor), evening)).toBe(hash);
  });

  it("mijenja se u ponoć po zagrebačkom vremenu", () => {
    // 22:30 UTC je 23:30 u Zagrebu (zimsko vrijeme), 23:30 UTC je već sutra.
    const before = dailyVisitorHash(request(visitor), new Date("2026-11-25T22:30:00Z"));
    const after = dailyVisitorHash(request(visitor), new Date("2026-11-25T23:30:00Z"));
    expect(after).not.toBe(before);
  });

  it("podmetnuti x-forwarded-for ne mijenja sažetak kad je postavljeno pouzdano zaglavlje", () => {
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    const now = new Date("2026-11-25T11:00:00Z");
    const honest = dailyIpHash(request({ "x-forwarded-for": "203.0.113.7", "cf-connecting-ip": "203.0.113.7" }), now);
    const spoofed = dailyIpHash(request({ "x-forwarded-for": "192.0.2.50, 203.0.113.7", "cf-connecting-ip": "203.0.113.7" }), now);
    expect(spoofed).toBe(honest);
  });
});
