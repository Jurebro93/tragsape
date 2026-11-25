import { afterAll, describe, expect, it } from "vitest";
import { priceListFilename } from "@/lib/price-list";
import { adminClient, anonClient } from "./helpers/supabase";

/**
 * Bazna cijena i cjenik za strojno čitanje (ZZP čl. 7.; pravilnici u NN 132/2026).
 * Radi se na privremenom proizvodu, da se stvarni cjenik lokalne baze ne mijenja.
 */

const service = adminClient();
const anonymous = anonClient();
const key = `test_cjenik_${crypto.randomUUID().slice(0, 8)}`;
const name = `Probna usluga; s "navodnicima" ${key}`;

async function product() {
  const { data, error } = await service
    .from("products")
    .select("unit_amount_cents, base_amount_cents, offered_on")
    .eq("key", key)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function currentVersion() {
  const { data, error } = await anonymous
    .from("price_list_versions")
    .select("id, csv, replaced_at")
    .is("replaced_at", null)
    .order("id", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

afterAll(async () => {
  await service.from("products").delete().eq("key", key);
});

describe("bazna cijena", () => {
  it("dok usluga nije u ponudi, bazna cijena prati cijenu", async () => {
    // Upisana bazna cijena se prije datuma ponude zanemaruje: baza je izjednačava s cijenom.
    const inserted = await service.from("products").insert({ key, name, unit_amount_cents: 1234, base_amount_cents: 1 });
    expect(inserted.error).toBeNull();
    expect(await product()).toEqual({ unit_amount_cents: 1234, base_amount_cents: 1234, offered_on: null });

    await service.from("products").update({ unit_amount_cents: 1500 }).eq("key", key);
    expect(await product()).toMatchObject({ unit_amount_cents: 1500, base_amount_cents: 1500 });
    // Ni izričito upisana drugačija bazna cijena ne vrijedi prije datuma ponude.
    await service.from("products").update({ base_amount_cents: 900 }).eq("key", key);
    expect((await product()).base_amount_cents).toBe(1500);
  });

  it("nakon upisa datuma ponude bazna cijena ostaje i kad se cijena promijeni", async () => {
    await service.from("products").update({ offered_on: "2026-12-01" }).eq("key", key);
    await service.from("products").update({ unit_amount_cents: 1700 }).eq("key", key);
    expect(await product()).toEqual({ unit_amount_cents: 1700, base_amount_cents: 1500, offered_on: "2026-12-01" });
  });

  it("posjetitelj baznu cijenu vidi, ali je ne može mijenjati", async () => {
    const seen = await anonymous.from("products").select("unit_amount_cents, base_amount_cents").eq("key", key);
    expect(seen.data).toEqual([{ unit_amount_cents: 1700, base_amount_cents: 1500 }]);
    const changed = await anonymous.from("products").update({ base_amount_cents: 1 }).eq("key", key).select("key");
    expect(changed.data ?? []).toHaveLength(0);
    expect((await product()).base_amount_cents).toBe(1500);
  });
});

describe("cjenik za strojno čitanje", () => {
  it("važeći cjenik je jedan, s propisanim stupcima i točkom sa zarezom", async () => {
    const versions = await currentVersion();
    expect(versions).toHaveLength(1);
    const lines = versions[0].csv.trimEnd().split("\n");
    expect(lines[0]).toBe("Naziv usluge;Maloprodajna cijena (EUR);Poseban oblik prodaje;Bazna cijena (EUR)");
    // Naziv s točkom sa zarezom i navodnicima ide u navodnike, pa ne lomi stupce.
    expect(lines).toContain(`"Probna usluga; s ""navodnicima"" ${key}";17,00;ne;15,00`);
    expect(lines).toContain("Memorijal;19,00;ne;19,00");
  });

  it("izmjena cijene objavljuje novu inačicu, a stara ostaje dostupna", async () => {
    const before = (await currentVersion())[0];
    await service.from("products").update({ unit_amount_cents: 1800 }).eq("key", key);
    const after = (await currentVersion())[0];
    expect(after.id).toBeGreaterThan(before.id);
    expect(after.csv).toContain(";18,00;ne;15,00");

    const old = await anonymous.from("price_list_versions").select("csv, replaced_at").eq("id", before.id).single();
    expect(old.data?.replaced_at).not.toBeNull();
    expect(old.data?.csv).toContain(";17,00;ne;15,00");
  });

  it("izmjena koja ne mijenja cjenik ne stvara novu inačicu", async () => {
    const before = (await currentVersion())[0];
    await service.from("products").update({ updated_at: new Date().toISOString() }).eq("key", key);
    expect((await currentVersion())[0].id).toBe(before.id);
  });

  it("isključen proizvod izlazi iz cjenika", async () => {
    await service.from("products").update({ active: false }).eq("key", key);
    expect((await currentVersion())[0].csv).not.toContain(key);
    await service.from("products").update({ active: true }).eq("key", key);
    expect((await currentVersion())[0].csv).toContain(key);
  });

  it("zamijenjeni cjenik javno je dostupan 15 dana, nakon toga više nije", async () => {
    const { data: replaced } = await service
      .from("price_list_versions")
      .select("id, replaced_at")
      .not("replaced_at", "is", null)
      .like("csv", `%${key}%`)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    expect(replaced).not.toBeNull();
    const id = replaced!.id;
    expect((await anonymous.from("price_list_versions").select("id").eq("id", id)).data).toHaveLength(1);

    const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString();
    await service.from("price_list_versions").update({ replaced_at: sixteenDaysAgo }).eq("id", id);
    expect((await anonymous.from("price_list_versions").select("id").eq("id", id)).data).toEqual([]);
    await service.from("price_list_versions").update({ replaced_at: replaced!.replaced_at }).eq("id", id);
  });

  it("posjetitelj inačice ne može dodavati, mijenjati ni brisati", async () => {
    const current = (await currentVersion())[0];
    expect((await anonymous.from("price_list_versions").insert({ csv: "lažni cjenik" })).error).not.toBeNull();
    const changed = await anonymous.from("price_list_versions").update({ csv: "izmijenjen" }).eq("id", current.id).select("id");
    expect(changed.data ?? []).toHaveLength(0);
    const removed = await anonymous.from("price_list_versions").delete().eq("id", current.id).select("id");
    expect(removed.data ?? []).toHaveLength(0);
    expect((await currentVersion())[0].csv).toBe(current.csv);
  });
});

describe("naziv datoteke cjenika", () => {
  it("nosi broj trgovca, oznaku zajedničkog cjenika usluga, broj pohrane i vrijeme objave u Zagrebu", () => {
    // 16:05 UTC je 17:05 u Zagrebu zimi.
    expect(priceListFilename({ sellerTaxId: "12345678901", version: 7, publishedAt: "2026-12-01T16:05:00Z" })).toBe(
      "12345678901_ZA_SVA_PRODAJNA_MJESTA_USLUGE_7_20261201_1705.csv",
    );
    // Ljeti je razlika dva sata, a ponoć prelazi u sljedeći dan.
    expect(priceListFilename({ sellerTaxId: "12345678901", version: 8, publishedAt: "2027-06-30T22:30:00Z" })).toBe(
      "12345678901_ZA_SVA_PRODAJNA_MJESTA_USLUGE_8_20270701_0030.csv",
    );
  });

  it("bez upisanog broja to se vidi u nazivu", () => {
    expect(priceListFilename({ sellerTaxId: null, version: 1, publishedAt: "2026-12-01T16:05:00Z" })).toMatch(/^BEZ_BROJA_/);
  });
});
