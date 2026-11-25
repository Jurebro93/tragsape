import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  parseEuroToCents,
  sanitizeFilename,
  slugFromInput,
  sniffProofType,
  zagrebDayEndIso,
  zagrebDayStartIso,
} from "@/server/admin/forms";
import { parsePartnerForm, parsePayoutForm, parsePromoForm, parseShelterForm } from "@/server/admin/schemas";
import {
  adminClient,
  anonClient,
  cleanupUsers,
  createDraft,
  createUser,
  type Client,
  type TestUser,
} from "./helpers/supabase";

/**
 * Admin: tko smije čitati i mijenjati podatke admina, provjereno nad lokalnim Supabaseom
 * stvarnim klijentima (javni ključ + sesija), onako kako ih koristi admin u aplikaciji.
 * Stranice i akcije admina rade klijentom sa sesijom, pa ova pravila vrijede i kad bi netko
 * zaobišao provjeru u aplikaciji.
 */

const service = adminClient();
const run = crypto.randomUUID().slice(0, 8);

let adminUser: TestUser;
let user: TestUser;
let buyer: TestUser;
const anonymous = anonClient();

/** Sve što test stvori, da se na kraju može obrisati. */
const created = {
  memorialId: "",
  orderId: "",
  partnerId: "",
  promoId: "",
  shelterId: "",
  payoutId: "",
  reportId: "",
  entryId: "",
  gestureId: "",
  stripeEventId: `evt_admin_test_${run}`,
  proofPaths: [] as string[],
};

function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(result.error?.message ?? "nema podataka");
  }
  return result.data;
}

const pdf = () => new Blob([new TextEncoder().encode("%PDF-1.4\n%test\n")], { type: "application/pdf" });

beforeAll(async () => {
  [adminUser, user, buyer] = await Promise.all([createUser("admin"), createUser("korisnik"), createUser("kupac")]);
  const promoted = await service.from("profiles").update({ role: "admin" }).eq("id", adminUser.id).select("id");
  expect(must(promoted)).toHaveLength(1);

  // Objavljeni spomen kupca, s porukom i gestom.
  created.memorialId = await createDraft(buyer.client, "Bundo");
  expect((await buyer.client.rpc("publish_memorial", { p_id: created.memorialId })).error).toBeNull();
  created.entryId = must(
    await service
      .from("guestbook_entries")
      .insert({ memorial_id: created.memorialId, author_name: "Susjed", body: "Nedostaje nam.", status: "approved" })
      .select("id")
      .single(),
  ).id;
  created.gestureId = must(
    await service
      .from("gestures")
      .insert({
        memorial_id: created.memorialId,
        kind: "svijeca",
        display_name: "Ana",
        message: "Za Bundu",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single(),
  ).id;
  created.reportId = must(
    await service
      .from("reports")
      .insert({
        target_type: "memorial",
        target_id: created.memorialId,
        memorial_id: created.memorialId,
        reason: "spam",
        reporter_email: "prijava@example.com",
      })
      .select("id")
      .single(),
  ).id;

  // Partner, njegov kod i plaćena narudžba s tim kodom: nastaju pravo, donacija, provizija i korak lijevka.
  created.partnerId = must(
    await service
      .from("partners")
      .insert({ name: `Testni partner ${run}`, type: "vet", commission_type: "percent", commission_value: 10 })
      .select("id")
      .single(),
  ).id;
  created.promoId = must(
    await service
      .from("promo_codes")
      .insert({
        code: `ADMINTEST${run.toUpperCase()}`,
        kind: "partner",
        partner_id: created.partnerId,
        discount_type: "percent",
        discount_value: 10,
      })
      .select("id")
      .single(),
  ).id;
  created.orderId = must(
    await service.rpc("create_order", {
      p_order: {
        user_id: buyer.id,
        email: buyer.email,
        subtotal_cents: 1900,
        discount_cents: 190,
        total_cents: 1710,
        promo_code_id: created.promoId,
      },
      p_lines: [
        {
          kind: "memorial",
          product_key: "memorial",
          memorial_id: created.memorialId,
          unit_amount_cents: 1900,
          discount_cents: 190,
          total_cents: 1710,
          discount_reason: "partner",
        },
      ],
    }),
  );
  must(await service.rpc("fulfill_order", { p_order_id: created.orderId, p_payment_intent: `pi_${run}`, p_email: "" }));

  created.shelterId = must(
    await service.from("shelters").insert({ name: `Testni azil ${run}` }).select("id").single(),
  ).id;
  created.payoutId = must(
    await service
      .from("donation_payouts")
      .insert({ shelter_id: created.shelterId, amount_cents: 500, paid_on: "2026-11-01" })
      .select("id")
      .single(),
  ).id;
  must(
    await service
      .from("stripe_events")
      .insert({ event_id: created.stripeEventId, type: "checkout.session.completed", error: "upgrade_not_applied" })
      .select("event_id"),
  );
});

afterAll(async () => {
  if (created.proofPaths.length > 0) {
    await service.storage.from("donation-proofs").remove(created.proofPaths);
  }
  await service.from("stripe_events").delete().eq("event_id", created.stripeEventId);
  // Koraci lijevka gube vezu kad se obrišu narudžba i spomen, pa idu prvi.
  if (created.orderId) {
    await service.from("funnel_events").delete().eq("order_id", created.orderId);
  }
  if (created.memorialId) {
    await service.from("funnel_events").delete().eq("memorial_id", created.memorialId);
  }
  // Briše narudžbe (s pravima, donacijama i provizijama), korisnike i njihove spomene.
  await cleanupUsers();
  if (created.promoId) {
    await service.from("promo_codes").delete().eq("id", created.promoId);
  }
  if (created.partnerId) {
    await service.from("partner_commissions").delete().eq("partner_id", created.partnerId);
    await service.from("partners").delete().eq("id", created.partnerId);
  }
  if (created.shelterId) {
    await service.from("donation_payouts").delete().eq("shelter_id", created.shelterId);
    await service.from("shelters").delete().eq("id", created.shelterId);
  }
});

describe("uloga admina", () => {
  it("korisnik ne može sam sebe proglasiti adminom", async () => {
    const attempt = await user.client.from("profiles").update({ role: "admin" } as never).eq("id", user.id);
    expect(attempt.error).not.toBeNull();
    const profile = must(await service.from("profiles").select("role").eq("id", user.id).single());
    expect(profile.role).toBe("user");
    expect((await user.client.rpc("is_admin")).data).toBe(false);
    expect((await anonymous.rpc("is_admin")).data).toBe(false);
    expect((await adminUser.client.rpc("is_admin")).data).toBe(true);
  });

  it("korisnik ne može promijeniti ni tuđu ulogu, a tuđi profil ne vidi", async () => {
    const attempt = await user.client.from("profiles").update({ role: "user" } as never).eq("id", adminUser.id);
    expect(attempt.error).not.toBeNull();
    expect((await user.client.from("profiles").select("id").eq("id", adminUser.id)).data ?? []).toHaveLength(0);
    const profile = must(await service.from("profiles").select("role").eq("id", adminUser.id).single());
    expect(profile.role).toBe("admin");
  });
});

describe("čitanje podataka admina", () => {
  /** Upiti koji za admina moraju vratiti redak stvoren u pripremi, a za sve ostale ništa. */
  const reads: Array<{ name: string; query: (client: Client) => PromiseLike<{ data: unknown[] | null; error: unknown }> }> = [
    { name: "orders", query: (c) => c.from("orders").select("id").eq("id", created.orderId) },
    {
      name: "order_lines",
      query: (c) => c.from("order_lines").select("id").eq("order_id", created.orderId),
    },
    { name: "funnel_events", query: (c) => c.from("funnel_events").select("id").eq("order_id", created.orderId) },
    { name: "stripe_events", query: (c) => c.from("stripe_events").select("event_id").eq("event_id", created.stripeEventId) },
    { name: "reports", query: (c) => c.from("reports").select("id").eq("id", created.reportId) },
    { name: "promo_codes", query: (c) => c.from("promo_codes").select("id").eq("id", created.promoId) },
    { name: "partners", query: (c) => c.from("partners").select("id").eq("id", created.partnerId) },
    {
      name: "partner_commissions",
      query: (c) => c.from("partner_commissions").select("id").eq("order_id", created.orderId),
    },
    {
      name: "donation_entries",
      query: (c) => c.from("donation_entries").select("id, order_line:order_lines!inner(order_id)").eq("order_line.order_id", created.orderId),
    },
  ];

  it("priprema je stvorila sve retke koje test čita", async () => {
    for (const read of reads) {
      const result = await read.query(service);
      expect(result.error, read.name).toBeNull();
      expect((result.data ?? []).length, read.name).toBeGreaterThan(0);
    }
  });

  it("prijavljeni korisnik ne vidi ništa od toga", async () => {
    for (const read of reads) {
      const result = await read.query(user.client);
      expect(result.data ?? [], read.name).toHaveLength(0);
    }
  });

  it("anonimni posjetitelj ne vidi ništa od toga", async () => {
    for (const read of reads) {
      const result = await read.query(anonymous);
      expect(result.data ?? [], read.name).toHaveLength(0);
      // Anonimna uloga nema ni pravo čitanja tih tablica, pa upit završava greškom.
      expect(result.error, read.name).not.toBeNull();
    }
  });

  it("admin vidi sve", async () => {
    for (const read of reads) {
      const result = await read.query(adminUser.client);
      expect(result.error, read.name).toBeNull();
      expect((result.data ?? []).length, read.name).toBeGreaterThan(0);
    }
  });

  it("kupac vidi svoju narudžbu, ali ne i proviziju, donaciju ni korak lijevka uz nju", async () => {
    expect((await buyer.client.from("orders").select("id").eq("id", created.orderId)).data).toHaveLength(1);
    for (const name of ["funnel_events", "partner_commissions", "donation_entries"]) {
      const read = reads.find((item) => item.name === name)!;
      expect((await read.query(buyer.client)).data ?? [], name).toHaveLength(0);
    }
  });

  it("atribuciju smije pozvati samo admin", async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const denied = await user.client.rpc("admin_attribution_report", { p_since: since });
    expect(denied.error?.message).toContain("forbidden");
    expect((await anonymous.rpc("admin_attribution_report", { p_since: since })).error).not.toBeNull();

    const report = await adminUser.client.rpc("admin_attribution_report", { p_since: since });
    expect(report.error).toBeNull();
    // Plaćena narudžba iz pripreme nema izvor posjeta, pa ulazi u „(izravno)".
    const direct = (report.data ?? []).find((row) => row.source === "(izravno)");
    expect(Number(direct?.paid_orders ?? 0)).toBeGreaterThanOrEqual(1);
    expect(Number(direct?.revenue_cents ?? 0)).toBeGreaterThanOrEqual(1710);
  });
});

describe("izmjene koje smije samo admin", () => {
  it("cijene: korisnik i anonimni posjetitelj ih ne mijenjaju, admin da", async () => {
    const before = must(
      await service.from("products").select("unit_amount_cents").eq("key", "memorial").single(),
    ).unit_amount_cents;
    try {
      const byUser = await user.client
        .from("products")
        .update({ unit_amount_cents: before + 1 })
        .eq("key", "memorial")
        .select("key");
      expect(byUser.data ?? []).toHaveLength(0);
      const byAnon = await anonymous.from("products").update({ unit_amount_cents: before + 1 }).eq("key", "memorial");
      expect(byAnon.error).not.toBeNull();
      expect(
        must(await service.from("products").select("unit_amount_cents").eq("key", "memorial").single())
          .unit_amount_cents,
      ).toBe(before);

      // Admin sprema istu cijenu: dokazuje pravo izmjene, a drugima ne mijenja cjenik.
      const byAdmin = await adminUser.client
        .from("products")
        .update({ unit_amount_cents: before })
        .eq("key", "memorial")
        .select("key");
      expect(byAdmin.error).toBeNull();
      expect(byAdmin.data).toHaveLength(1);
    } finally {
      await service.from("products").update({ unit_amount_cents: before }).eq("key", "memorial");
    }
  });

  it("isključen proizvod vidi i mijenja samo admin", async () => {
    // Proizvod se isključuje i vraća preko admina; ostali ga za to vrijeme ne vide.
    const key = "upgrade_portrait";
    const before = must(await service.from("products").select("active").eq("key", key).single()).active;
    try {
      const off = await adminUser.client.from("products").update({ active: false }).eq("key", key).select("key, active");
      expect(off.error).toBeNull();
      expect(off.data).toEqual([{ key, active: false }]);
      expect((await adminUser.client.from("products").select("key").eq("key", key)).data).toHaveLength(1);
      expect((await user.client.from("products").select("key").eq("key", key)).data).toHaveLength(0);
      expect((await anonymous.from("products").select("key").eq("key", key)).data).toHaveLength(0);
      // Korisnik ga ne može ni uključiti.
      const byUser = await user.client.from("products").update({ active: true }).eq("key", key).select("key");
      expect(byUser.data ?? []).toHaveLength(0);
      expect(must(await service.from("products").select("active").eq("key", key).single()).active).toBe(false);

      const restored = await adminUser.client.from("products").update({ active: before }).eq("key", key).select("active");
      expect(restored.data).toEqual([{ active: before }]);
    } finally {
      await service.from("products").update({ active: before }).eq("key", key);
    }
  });

  it("postavke: korisnik i anonimni posjetitelj ih ne mijenjaju, admin da", async () => {
    const before = must(
      await service
        .from("settings")
        .select("repeat_discount_pct, donation_per_memorial_cents, active_shelter_id")
        .eq("id", true)
        .single(),
    );
    try {
      const byUser = await user.client
        .from("settings")
        .update({ repeat_discount_pct: 99, active_shelter_id: created.shelterId })
        .eq("id", true)
        .select("id");
      expect(byUser.data ?? []).toHaveLength(0);
      expect((await anonymous.from("settings").update({ repeat_discount_pct: 99 }).eq("id", true)).error).not.toBeNull();
      expect(
        must(
          await service
            .from("settings")
            .select("repeat_discount_pct, donation_per_memorial_cents, active_shelter_id")
            .eq("id", true)
            .single(),
        ),
      ).toEqual(before);

      const byAdmin = await adminUser.client
        .from("settings")
        .update({ repeat_discount_pct: before.repeat_discount_pct })
        .eq("id", true)
        .select("id");
      expect(byAdmin.error).toBeNull();
      expect(byAdmin.data).toHaveLength(1);
    } finally {
      await service.from("settings").update(before).eq("id", true);
    }
  });

  it("azili: unos i izmjena samo za admina", async () => {
    for (const client of [user.client, anonymous]) {
      expect((await client.from("shelters").insert({ name: "Podmetnuti azil" })).error).not.toBeNull();
      const update = await client.from("shelters").update({ name: "Preimenovan" }).eq("id", created.shelterId).select("id");
      expect(update.data ?? []).toHaveLength(0);
      const removed = await client.from("shelters").delete().eq("id", created.shelterId).select("id");
      expect(removed.data ?? []).toHaveLength(0);
    }
    expect(must(await service.from("shelters").select("name").eq("id", created.shelterId).single()).name).toBe(
      `Testni azil ${run}`,
    );

    const byAdmin = await adminUser.client
      .from("shelters")
      .update({ url: "https://example.org/azil" })
      .eq("id", created.shelterId)
      .select("id, url");
    expect(byAdmin.data).toEqual([{ id: created.shelterId, url: "https://example.org/azil" }]);
    // Admin vidi i isključen azil; javnost ne.
    await adminUser.client.from("shelters").update({ active: false }).eq("id", created.shelterId);
    expect((await adminUser.client.from("shelters").select("id").eq("id", created.shelterId)).data).toHaveLength(1);
    expect((await anonymous.from("shelters").select("id").eq("id", created.shelterId)).data).toHaveLength(0);
  });

  it("isplate donacija: unos i izmjena samo za admina; neobjavljena isplata nije javna", async () => {
    for (const client of [user.client, anonymous]) {
      const insert = await client
        .from("donation_payouts")
        .insert({ shelter_id: created.shelterId, amount_cents: 99900, paid_on: "2026-11-02", published: true });
      expect(insert.error).not.toBeNull();
      const update = await client
        .from("donation_payouts")
        .update({ published: true, amount_cents: 99900 })
        .eq("id", created.payoutId)
        .select("id");
      expect(update.data ?? []).toHaveLength(0);
      expect((await client.from("donation_payouts").select("id").eq("id", created.payoutId)).data ?? []).toHaveLength(0);
    }
    expect(
      must(await service.from("donation_payouts").select("amount_cents, published").eq("id", created.payoutId).single()),
    ).toEqual({ amount_cents: 500, published: false });

    const byAdmin = await adminUser.client
      .from("donation_payouts")
      .update({ note: "Uplata na račun", published: true })
      .eq("id", created.payoutId)
      .select("id, published");
    expect(byAdmin.data).toEqual([{ id: created.payoutId, published: true }]);
    expect((await anonymous.from("donation_payouts").select("id").eq("id", created.payoutId)).data).toHaveLength(1);
  });

  it("kodovi, partneri i provizije: izmjena samo za admina", async () => {
    for (const client of [user.client, anonymous]) {
      const code = await client
        .from("promo_codes")
        .insert({ code: `PODMETNUT${run.toUpperCase()}`, discount_type: "percent", discount_value: 100 });
      expect(code.error).not.toBeNull();
      const partner = await client.from("partners").insert({ name: "Podmetnuti partner", type: "other" });
      expect(partner.error).not.toBeNull();
      const paid = await client
        .from("partner_commissions")
        .update({ status: "paid" })
        .eq("order_id", created.orderId)
        .select("id");
      expect(paid.data ?? []).toHaveLength(0);
    }
    const commission = must(
      await service.from("partner_commissions").select("id, status, commission_cents").eq("order_id", created.orderId).single(),
    );
    expect(commission).toMatchObject({ status: "accrued", commission_cents: 171 });

    const byAdmin = await adminUser.client
      .from("partner_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString(), payout_note: "Isplaćeno na račun" })
      .eq("id", commission.id)
      .eq("status", "accrued")
      .select("status");
    expect(byAdmin.data).toEqual([{ status: "paid" }]);
  });

  it("baza čuva pravila kodova i kad ih upisuje admin", async () => {
    const base = { code: `PRAVILA${run.toUpperCase()}`, discount_type: "percent", discount_value: 10 };
    const partnerWithoutPartner = await adminUser.client.from("promo_codes").insert({ ...base, kind: "partner" });
    expect(partnerWithoutPartner.error?.message).toContain("promo_partner_kind");
    const promoWithPartner = await adminUser.client
      .from("promo_codes")
      .insert({ ...base, kind: "promo", partner_id: created.partnerId });
    expect(promoWithPartner.error?.message).toContain("promo_partner_kind");
    const overHundred = await adminUser.client.from("promo_codes").insert({ ...base, discount_value: 101 });
    expect(overHundred.error?.message).toContain("promo_percent_range");
    const lowercase = await adminUser.client.from("promo_codes").insert({ ...base, code: "malaslova" });
    expect(lowercase.error).not.toBeNull();
    expect((await service.from("promo_codes").select("id").eq("code", base.code)).data).toHaveLength(0);
  });

  it("prijave: zatvara ih samo admin", async () => {
    for (const client of [user.client, anonymous]) {
      const update = await client.from("reports").update({ status: "dismissed" }).eq("id", created.reportId).select("id");
      expect(update.data ?? []).toHaveLength(0);
    }
    expect(must(await service.from("reports").select("status").eq("id", created.reportId).single()).status).toBe("open");

    const byAdmin = await adminUser.client
      .from("reports")
      .update({ status: "actioned", handled_by: adminUser.id })
      .eq("id", created.reportId)
      .eq("status", "open")
      .select("status, handled_by");
    expect(byAdmin.data).toEqual([{ status: "actioned", handled_by: adminUser.id }]);
  });

  it("poruku iz knjige sjećanja uklanja samo admin", async () => {
    const byUser = await user.client
      .from("guestbook_entries")
      .update({ status: "removed" })
      .eq("id", created.entryId)
      .select("id");
    expect(byUser.data ?? []).toHaveLength(0);
    expect((await anonymous.from("guestbook_entries").update({ status: "removed" }).eq("id", created.entryId)).error).not.toBeNull();
    // Ni vlasnik spomena: on smije odobriti ili sakriti.
    expect((await buyer.client.from("guestbook_entries").update({ status: "removed" }).eq("id", created.entryId)).error).not.toBeNull();
    expect(must(await service.from("guestbook_entries").select("status").eq("id", created.entryId).single()).status).toBe(
      "approved",
    );

    const byAdmin = await adminUser.client
      .from("guestbook_entries")
      .update({ status: "removed" })
      .eq("id", created.entryId)
      .select("id, status");
    expect(byAdmin.data).toEqual([{ id: created.entryId, status: "removed" }]);
    // Uklonjenu poruku više ne vide ni vlasnik ni javnost.
    expect((await buyer.client.from("guestbook_entries").select("id").eq("id", created.entryId)).data).toHaveLength(0);
    expect((await anonymous.from("guestbook_entries").select("id").eq("id", created.entryId)).data).toHaveLength(0);
    // E-mail autora i sažetak IP-a ne može pročitati ni admin.
    expect((await adminUser.client.from("guestbook_entries").select("author_email").eq("id", created.entryId)).error).not.toBeNull();
  });

  it("tuđu gestu sakriva admin, ali ne i drugi korisnik", async () => {
    const byUser = await user.client.from("gestures").update({ status: "hidden" }).eq("id", created.gestureId).select("id");
    expect(byUser.data ?? []).toHaveLength(0);
    expect((await anonymous.from("gestures").update({ status: "hidden" }).eq("id", created.gestureId)).error).not.toBeNull();

    const byAdmin = await adminUser.client
      .from("gestures")
      .update({ status: "hidden" })
      .eq("id", created.gestureId)
      .eq("status", "active")
      .select("status");
    expect(byAdmin.data).toEqual([{ status: "hidden" }]);
    expect((await anonymous.from("gestures").select("id").eq("id", created.gestureId)).data).toHaveLength(0);
    // Admin ne može gesti dati stanje „vraćen novac"; to radi samo povrat narudžbe.
    const refunded = await adminUser.client.from("gestures").update({ status: "refunded" }).eq("id", created.gestureId);
    expect(refunded.error).not.toBeNull();
  });

  it("spomen skriva i vraća samo admin", async () => {
    const byUser = await user.client.rpc("admin_set_memorial_hidden", { p_id: created.memorialId, p_hidden: true });
    expect(byUser.error?.message).toContain("forbidden");
    // Ni vlasnik spomena.
    const byOwner = await buyer.client.rpc("admin_set_memorial_hidden", { p_id: created.memorialId, p_hidden: true });
    expect(byOwner.error?.message).toContain("forbidden");
    const byAnon = await anonymous.rpc("admin_set_memorial_hidden", { p_id: created.memorialId, p_hidden: true });
    expect(byAnon.error).not.toBeNull();
    expect(must(await service.from("memorials").select("status").eq("id", created.memorialId).single()).status).toBe(
      "published",
    );

    expect(
      (await adminUser.client.rpc("admin_set_memorial_hidden", { p_id: created.memorialId, p_hidden: true })).error,
    ).toBeNull();
    expect(must(await service.from("memorials").select("status").eq("id", created.memorialId).single()).status).toBe(
      "hidden",
    );
    expect((await anonymous.from("memorials").select("id").eq("id", created.memorialId)).data).toHaveLength(0);
    // Admin skriveni spomen i dalje vidi, ali ne i ključ za dijeljenje ni izvor posjeta.
    expect((await adminUser.client.from("memorials").select("id, status").eq("id", created.memorialId)).data).toEqual([
      { id: created.memorialId, status: "hidden" },
    ]);
    expect((await adminUser.client.from("memorials").select("share_key").eq("id", created.memorialId)).error).not.toBeNull();
    expect((await adminUser.client.from("memorials").select("attribution").eq("id", created.memorialId)).error).not.toBeNull();

    expect(
      (await adminUser.client.rpc("admin_set_memorial_hidden", { p_id: created.memorialId, p_hidden: false })).error,
    ).toBeNull();
    expect(must(await service.from("memorials").select("status").eq("id", created.memorialId).single()).status).toBe(
      "published",
    );
  });

  it("admin ne može sam ispuniti ni stvoriti narudžbu", async () => {
    const insert = await adminUser.client.from("orders").insert({ subtotal_cents: 0, total_cents: 0 } as never);
    expect(insert.error).not.toBeNull();
    const paid = await adminUser.client.from("orders").update({ status: "refunded" } as never).eq("id", created.orderId);
    expect(paid.error).not.toBeNull();
    const refund = await adminUser.client.rpc("refund_order" as never, { p_order_id: created.orderId } as never);
    expect(refund.error).not.toBeNull();
    expect(must(await service.from("orders").select("status").eq("id", created.orderId).single()).status).toBe("paid");
  });
});

describe("pohrana dokaza o isplati", () => {
  it("datoteku učitava samo admin; javno je dostupna preko adrese", async () => {
    const path = `${created.payoutId}/dokaz-${run}.pdf`;
    const byUser = await user.client.storage.from("donation-proofs").upload(path, pdf(), { contentType: "application/pdf" });
    expect(byUser.error).not.toBeNull();
    const byAnon = await anonymous.storage.from("donation-proofs").upload(path, pdf(), { contentType: "application/pdf" });
    expect(byAnon.error).not.toBeNull();

    created.proofPaths.push(path);
    const byAdmin = await adminUser.client.storage
      .from("donation-proofs")
      .upload(path, pdf(), { contentType: "application/pdf" });
    expect(byAdmin.error).toBeNull();

    const publicUrl = adminUser.client.storage.from("donation-proofs").getPublicUrl(path).data.publicUrl;
    expect(publicUrl).toMatch(/^https?:\/\//);
    const response = await fetch(publicUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");

    // Adresu dokaza uz isplatu sprema samo admin.
    const linkedByUser = await user.client
      .from("donation_payouts")
      .update({ proof_path: publicUrl })
      .eq("id", created.payoutId)
      .select("id");
    expect(linkedByUser.data ?? []).toHaveLength(0);
    const linked = await adminUser.client
      .from("donation_payouts")
      .update({ proof_path: publicUrl })
      .eq("id", created.payoutId)
      .select("proof_path");
    expect(linked.data).toEqual([{ proof_path: publicUrl }]);
  });

  it("pohrana odbija vrstu datoteke koja nije dokument ni slika", async () => {
    const path = `${created.payoutId}/skripta-${run}.html`;
    created.proofPaths.push(path);
    const upload = await adminUser.client.storage
      .from("donation-proofs")
      .upload(path, new Blob(["<script>alert(1)</script>"], { type: "text/html" }), { contentType: "text/html" });
    expect(upload.error).not.toBeNull();
  });
});

describe("obrasci admina", () => {
  const form = (fields: Record<string, string | string[]>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        data.append(name, item);
      }
    }
    return data;
  };

  it("iznos u eurima postaje iznos u centima, bez nagađanja", () => {
    expect(parseEuroToCents("19")).toBe(1900);
    expect(parseEuroToCents("19,9")).toBe(1990);
    expect(parseEuroToCents("19.90")).toBe(1990);
    expect(parseEuroToCents(" 2,99 € ")).toBe(299);
    expect(parseEuroToCents("0")).toBe(0);
    expect(parseEuroToCents("0,07")).toBe(7);
    for (const invalid of ["", "-5", "1.234,50", "19,999", "abc", "1e3", "19,"]) {
      expect(parseEuroToCents(invalid), invalid).toBeNull();
    }
  });

  it("dan valjanosti računa se u zagrebačkoj zoni, ljeti i zimi", () => {
    expect(zagrebDayStartIso("2026-12-01")).toBe("2026-11-30T23:00:00.000Z");
    expect(zagrebDayEndIso("2026-12-01")).toBe("2026-12-01T22:59:59.999Z");
    expect(zagrebDayStartIso("2026-07-01")).toBe("2026-06-30T22:00:00.000Z");
    expect(zagrebDayEndIso("2026-07-01")).toBe("2026-07-01T21:59:59.999Z");
    // Noć prelaska na ljetno vrijeme: dan traje 23 sata.
    expect(zagrebDayStartIso("2026-03-29")).toBe("2026-03-28T23:00:00.000Z");
    expect(zagrebDayEndIso("2026-03-29")).toBe("2026-03-29T21:59:59.999Z");
  });

  it("kod za popust: velika slova, partner samo uz partnerski kod, postotak do 100", () => {
    const base = {
      code: " ljeto-10 ",
      kind: "promo",
      partner_id: created.partnerId,
      discount_type: "percent",
      discount_value: "10",
      applies_to: ["memorial", "memorial"],
      max_redemptions: "",
      valid_from: "2026-12-01",
      valid_to: "2026-12-31",
      active: "on",
    };
    const promo = parsePromoForm(form(base));
    expect(promo).toEqual({
      ok: true,
      value: {
        code: "LJETO-10",
        kind: "promo",
        // Promo kod nema partnera ni kad ga obrazac pošalje.
        partner_id: null,
        discount_type: "percent",
        discount_value: 10,
        applies_to: ["memorial"],
        max_redemptions: null,
        valid_from: "2026-11-30T23:00:00.000Z",
        valid_to: "2026-12-31T22:59:59.999Z",
        active: true,
      },
    });

    const fixed = parsePromoForm(form({ ...base, kind: "partner", discount_type: "fixed", discount_value: "4,50" }));
    expect(fixed).toMatchObject({ ok: true, value: { partner_id: created.partnerId, discount_value: 450 } });

    for (const invalid of [
      { ...base, kind: "partner", partner_id: "" },
      { ...base, discount_value: "101" },
      { ...base, discount_value: "0" },
      { ...base, discount_type: "fixed", discount_value: "0" },
      { ...base, code: "ab" },
      { ...base, code: "ŠKOLA 10" },
      { ...base, applies_to: [] },
      { ...base, applies_to: ["nepostojeci"] },
      { ...base, max_redemptions: "0" },
      { ...base, valid_from: "2026-02-30" },
      { ...base, valid_from: "2026-12-31", valid_to: "2026-12-01" },
      { ...base, kind: "admin" },
    ]) {
      expect(parsePromoForm(form(invalid)).ok, JSON.stringify(invalid)).toBe(false);
    }
  });

  it("partner, azil i isplata: obavezna polja i sigurne adrese", () => {
    expect(
      parsePartnerForm(
        form({ name: "Ambulanta", type: "vet", contact: "", commission_type: "fixed", commission_value: "3", notes: "" }),
      ),
    ).toEqual({
      ok: true,
      value: {
        name: "Ambulanta",
        type: "vet",
        contact: null,
        commission_type: "fixed",
        commission_value: 300,
        active: false,
        notes: null,
      },
    });
    expect(
      parsePartnerForm(form({ name: "X", type: "vet", commission_type: "percent", commission_value: "150" })).ok,
    ).toBe(false);
    expect(parsePartnerForm(form({ name: "", type: "vet", commission_type: "percent", commission_value: "5" })).ok).toBe(
      false,
    );

    expect(parseShelterForm(form({ name: "Azil", url: "https://example.org", active: "on" }))).toEqual({
      ok: true,
      value: { name: "Azil", url: "https://example.org", active: true },
    });
    expect(parseShelterForm(form({ name: "Azil", url: "javascript:alert(1)" })).ok).toBe(false);
    expect(parseShelterForm(form({ name: "", url: "" })).ok).toBe(false);

    const payout = { shelter_id: created.shelterId, amount: "25", paid_on: "2026-11-20", note: "", published: "on" };
    expect(parsePayoutForm(form(payout))).toEqual({
      ok: true,
      value: { shelter_id: created.shelterId, amount_cents: 2500, paid_on: "2026-11-20", note: null, published: true },
    });
    expect(parsePayoutForm(form({ ...payout, amount: "0" })).ok).toBe(false);
    expect(parsePayoutForm(form({ ...payout, shelter_id: "" })).ok).toBe(false);
    expect(parsePayoutForm(form({ ...payout, paid_on: "jučer" })).ok).toBe(false);
  });

  it("dokaz o isplati: vrsta se čita iz sadržaja, ime se čisti", () => {
    const bytes = (values: number[]) => new Uint8Array(values);
    expect(sniffProofType(new TextEncoder().encode("%PDF-1.7"))?.extension).toBe("pdf");
    expect(sniffProofType(bytes([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe("image/jpeg");
    expect(sniffProofType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.extension).toBe("png");
    expect(sniffProofType(bytes([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))?.extension).toBe("webp");
    expect(sniffProofType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffProofType(bytes([]))).toBeNull();

    expect(sanitizeFilename("Potvrda uplate – Šapa Đurđevac.PDF", "pdf")).toBe("potvrda-uplate-sapa-durdevac.pdf");
    expect(sanitizeFilename("../../etc/passwd", "png")).toBe("etc-passwd.png");
    expect(sanitizeFilename("....", "jpg")).toBe("dokaz.jpg");
    expect(sanitizeFilename(`${"a".repeat(200)}.webp`, "webp")).toBe(`${"a".repeat(60)}.webp`);
  });

  it("adresa spomena iz unosa admina", () => {
    expect(slugFromInput("medo-3f9a1c")).toBe("medo-3f9a1c");
    expect(slugFromInput(" https://tragsape.hr/spomen/Medo-3f9a1c/?iz=livada#knjiga ")).toBe("medo-3f9a1c");
    expect(slugFromInput("/spomen/medo-3f9a1c")).toBe("medo-3f9a1c");
    expect(slugFromInput("medo%' or 1=1")).toBe("");
    expect(slugFromInput("")).toBe("");
  });
});
