import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  cleanupUsers,
  createAnonymousUser,
  createDraft,
  createUser,
  type TestUser,
} from "./helpers/supabase";

/**
 * Poklon, obiteljska stranica, Livada i lijevak na razini baze: tko što smije i što izlazi
 * u javnost. Plaćanje se ovdje oponaša istim funkcijama koje zove Stripe webhook.
 */

const admin = adminClient();
let buyer: TestUser;
let recipient: TestUser;
let stranger: TestUser;

async function paidOrder(userId: string | null, lines: unknown[], total: number) {
  const { data: orderId, error } = await admin.rpc("create_order", {
    p_order: { user_id: userId, email: null, subtotal_cents: total, discount_cents: 0, total_cents: total },
    p_lines: lines as never,
  });
  if (error || !orderId) {
    throw new Error(error?.message ?? "narudžba nije stvorena");
  }
  const fulfilled = await admin.rpc("fulfill_order", {
    p_order_id: orderId,
    p_payment_intent: `pi_test_${crypto.randomUUID()}`,
    p_email: "kupac@test.tragsape.local",
  });
  if (fulfilled.error) {
    throw new Error(fulfilled.error.message);
  }
  return { orderId, result: fulfilled.data as { gifts: Array<{ code: string }>; issues: unknown[] } };
}

beforeAll(async () => {
  buyer = await createUser("kupac");
  recipient = await createUser("primatelj");
  stranger = await createUser("treci");
});

afterAll(async () => {
  await cleanupUsers();
});

describe("poklon", () => {
  it("primatelj vidi poruku uz kod, preuzima poklon i primjenjuje ga na svoj spomen", async () => {
    const { result } = await paidOrder(
      buyer.id,
      [
        {
          kind: "gift",
          product_key: "memorial_portrait",
          unit_amount_cents: 2900,
          discount_cents: 0,
          total_cents: 2900,
          meta: { recipient_email: recipient.email, buyer_name: "Ana", message: "Mislim na tebe." },
        },
      ],
      2900,
    );
    const code = result.gifts[0].code;

    // Tko ima kod, vidi pošiljatelja i poruku, ali ne i samo pravo.
    const preview = await anonClient().rpc("gift_preview", { p_code: code });
    expect(preview.data).toEqual([
      expect.objectContaining({
        tier: "portrait",
        buyer_name: "Ana",
        message: "Mislim na tebe.",
        redeemed: false,
        entitlement_id: null,
      }),
    ]);
    expect((await anonClient().rpc("gift_preview", { p_code: "0".repeat(24) })).data).toEqual([]);
    // Tablica poklona nije čitljiva izvana (kod se ne može izlistati).
    expect((await anonClient().from("gifts").select("code").limit(1)).error).not.toBeNull();
    expect((await stranger.client.from("gifts").select("code").limit(5)).data ?? []).toHaveLength(0);

    // Anonimni korisnik ne može preuzeti poklon.
    const anonymous = await createAnonymousUser();
    expect((await anonymous.client.rpc("redeem_gift", { p_code: code })).error?.message).toContain("email_required");

    const redeemed = await recipient.client.rpc("redeem_gift", { p_code: code });
    expect(redeemed.error).toBeNull();
    const entitlementId = redeemed.data as string;
    // Drugi račun ga više ne može preuzeti.
    expect((await stranger.client.rpc("redeem_gift", { p_code: code })).error?.message).toContain("already_redeemed");

    // Tuđi spomen ne može dobiti pravo, a ni tuđe pravo vlastiti spomen.
    const foreignMemorial = await createDraft(stranger.client, "Tuđi");
    expect(
      (await recipient.client.rpc("apply_entitlement", { p_entitlement_id: entitlementId, p_memorial_id: foreignMemorial }))
        .error,
    ).not.toBeNull();
    expect(
      (await stranger.client.rpc("apply_entitlement", { p_entitlement_id: entitlementId, p_memorial_id: foreignMemorial }))
        .error,
    ).not.toBeNull();

    const memorialId = await createDraft(recipient.client, "Mrvica");
    const applied = await recipient.client.rpc("apply_entitlement", {
      p_entitlement_id: entitlementId,
      p_memorial_id: memorialId,
    });
    expect(applied.error).toBeNull();
    expect((await admin.from("memorials").select("tier").eq("id", memorialId).single()).data?.tier).toBe("portrait");
    // Jedno pravo vrijedi za jedan spomen.
    const second = await createDraft(recipient.client, "Drugi");
    expect(
      (await recipient.client.rpc("apply_entitlement", { p_entitlement_id: entitlementId, p_memorial_id: second })).error,
    ).not.toBeNull();
    // Donacija je zabilježena i za poklonjeni memorijal.
    const totals = await anonClient().rpc("donation_totals");
    expect(Number(totals.data?.[0]?.accrued_cents ?? 0)).toBeGreaterThanOrEqual(100);
  });
});

describe("Livada, sat svijeća i obiteljska stranica", () => {
  it("prikazuju samo javne objavljene spomene", async () => {
    const publicId = await createDraft(buyer.client, "Javni");
    await buyer.client.rpc("publish_memorial", { p_id: publicId });
    const hiddenId = await createDraft(buyer.client, "Skriveni");
    await buyer.client.rpc("publish_memorial", { p_id: hiddenId });
    await admin.from("memorials").update({ tier: "memorial" }).eq("id", hiddenId);
    await buyer.client.rpc("set_memorial_visibility", { p_id: hiddenId, p_visibility: "unlisted" });
    const draftId = await createDraft(buyer.client, "Nacrt");

    const day = new Date().toISOString().slice(0, 10);
    for (const id of [publicId, hiddenId, draftId]) {
      await admin.from("candles").insert({ memorial_id: id, day, visitor_hash: `test-${crypto.randomUUID()}` });
    }
    const since = new Date(Date.now() - 60_000).toISOString();
    const evening = await anonClient().rpc("evening_candles", { p_since: since, p_limit: 200 });
    const ids = (evening.data ?? []).map((row) => row.memorial_id);
    expect(ids).toContain(publicId);
    expect(ids).not.toContain(hiddenId);
    expect(ids).not.toContain(draftId);

    const listed = await anonClient().from("memorials").select("id").eq("owner_id", buyer.id);
    expect((listed.data ?? []).map((row) => row.id)).toEqual([publicId]);

    // Obiteljska stranica: stvara je samo prijavljeni vlasnik, a privatna nije vidljiva drugima.
    const slug = await buyer.client.rpc("save_family", { p_title: "Obitelj Test", p_intro: "", p_is_public: true });
    expect(slug.error).toBeNull();
    expect(slug.data).toMatch(/^obitelj-test-[a-f0-9]{4}$/);
    expect((await anonClient().from("families").select("title").eq("slug", slug.data!)).data).toEqual([
      { title: "Obitelj Test" },
    ]);
    // Ponovno spremanje mijenja sadržaj, ali ne i adresu.
    const again = await buyer.client.rpc("save_family", { p_title: "Naši ljubimci", p_intro: "", p_is_public: false });
    expect(again.data).toBe(slug.data);
    expect((await anonClient().from("families").select("title").eq("slug", slug.data!)).data).toHaveLength(0);
    expect((await stranger.client.from("families").update({ title: "Tuđe" }).eq("slug", slug.data!).select("slug")).data ?? []).toHaveLength(0);
    const anonymous = await createAnonymousUser();
    expect((await anonymous.client.rpc("save_family", { p_title: "X Y Z", p_intro: "", p_is_public: true })).error).not.toBeNull();
  });
});

describe("lijevak i atribucija", () => {
  it("bilježi korake samo za vlastiti spomen, jednom, i prenosi izvor na plaćenu narudžbu", async () => {
    const { data: id } = await buyer.client.rpc("create_memorial_draft", { p_attribution: { iz: "clanak-test" } });
    const memorialId = id as string;
    await buyer.client.from("memorials").update({ name: "Atribucija" }).eq("id", memorialId);

    await buyer.client.rpc("track_funnel", { p_name: "draft_started", p_memorial_id: memorialId });
    await buyer.client.rpc("track_funnel", { p_name: "draft_started", p_memorial_id: memorialId });
    // Tuđi korisnik ne može upisati korak za ovaj spomen, a „paid" se ne može upisati ručno.
    await stranger.client.rpc("track_funnel", { p_name: "step_review", p_memorial_id: memorialId });
    expect((await buyer.client.rpc("track_funnel", { p_name: "paid" as never, p_memorial_id: memorialId })).error).not.toBeNull();

    const { orderId } = await paidOrder(
      buyer.id,
      [
        {
          kind: "memorial",
          product_key: "memorial",
          memorial_id: memorialId,
          unit_amount_cents: 1900,
          discount_cents: 0,
          total_cents: 1900,
          meta: { publish: false },
        },
      ],
      1900,
    );

    const events = await admin
      .from("funnel_events")
      .select("name, order_id, attribution")
      .eq("memorial_id", memorialId)
      .order("id");
    expect(events.data).toEqual([
      { name: "draft_started", order_id: null, attribution: { iz: "clanak-test" } },
      { name: "paid", order_id: orderId, attribution: { iz: "clanak-test" } },
    ]);
    expect((await admin.from("orders").select("attribution").eq("id", orderId).single()).data?.attribution).toEqual({
      iz: "clanak-test",
    });
    // Lijevak nije čitljiv običnom korisniku.
    expect((await buyer.client.from("funnel_events").select("id").limit(5)).data ?? []).toHaveLength(0);
    expect((await anonClient().from("funnel_events").select("id").limit(1)).error).not.toBeNull();
  });
});
