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
 * Dozvole i privatnost memorijala, provjerene nad lokalnim Supabaseom onako kako ih vidi
 * preglednik: s javnim ključem i korisnikovom sesijom. Ako ovi testovi prolaze, pravila
 * vrijede bez obzira na to što radi kod aplikacije.
 */

const admin = adminClient();
let owner: TestUser;
let stranger: TestUser;

async function setState(id: string, values: { tier?: string; visibility?: string; status?: string }) {
  const { error } = await admin.from("memorials").update(values).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function shareKeyOf(id: string): Promise<string> {
  const { data } = await admin.from("memorials").select("share_key").eq("id", id).single();
  return data!.share_key;
}

beforeAll(async () => {
  owner = await createUser("vlasnik");
  stranger = await createUser("stranac");
});

afterAll(async () => {
  await cleanupUsers();
});

describe("vidljivost memorijala", () => {
  it("nacrt vidi samo vlasnik", async () => {
    const id = await createDraft(owner.client);
    expect((await owner.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await anonClient().from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await stranger.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
  });

  it("objavljeni javni memorijal vide svi, ali ne i njegov ključ za dijeljenje", async () => {
    const id = await createDraft(owner.client);
    const { data: slug, error } = await owner.client.rpc("publish_memorial", { p_id: id });
    expect(error).toBeNull();
    expect(slug).toMatch(/^medo-[a-f0-9]{6}$/);

    const visible = await anonClient().from("memorials").select("id, name, visibility").eq("id", id);
    expect(visible.data).toEqual([{ id, name: "Medo", visibility: "public" }]);

    const leaked = await anonClient().from("memorials").select("share_key").eq("id", id);
    expect(leaked.error).not.toBeNull();
    const attribution = await anonClient().from("memorials").select("attribution").eq("id", id);
    expect(attribution.error).not.toBeNull();
  });

  it("memorijal „samo s linkom” otvara jedino ispravan ključ", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    await setState(id, { tier: "memorial" });
    const before = await shareKeyOf(id);
    expect((await owner.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "unlisted" })).error).toBeNull();
    const key = await shareKeyOf(id);
    // Prelazak na „samo s linkom" izdaje novi ključ.
    expect(key).not.toBe(before);

    expect((await anonClient().from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await anonClient("0".repeat(32)).from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await anonClient(key).from("memorials").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await stranger.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(0);

    // Isto vrijedi za fotografije.
    await admin.from("memorial_photos").insert({ memorial_id: id, storage_path: `${id}/x`, created_by: owner.id });
    expect((await anonClient().from("memorial_photos").select("id").eq("memorial_id", id)).data).toHaveLength(0);
    expect((await anonClient(key).from("memorial_photos").select("id").eq("memorial_id", id)).data).toHaveLength(1);
  });

  it("privatni memorijal vidi samo vlasnik", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    await setState(id, { tier: "memorial" });
    await owner.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "private" });
    const key = await shareKeyOf(id);

    expect((await anonClient().from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await anonClient(key).from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await stranger.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await owner.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(1);
  });

  it("memorijal koji je admin sakrio nije javno vidljiv", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    await setState(id, { status: "hidden" });
    expect((await anonClient().from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    // Vlasnik ga ne može sam vratiti objavom.
    expect((await owner.client.rpc("publish_memorial", { p_id: id })).error?.message).toContain("hidden_by_admin");
  });
});

describe("što korisnik ne smije promijeniti", () => {
  it("paket, stanje i privatnost ne mogu se mijenjati izravno", async () => {
    const id = await createDraft(owner.client);
    for (const patch of [{ tier: "portrait" }, { status: "published" }, { visibility: "private" }, { candle_count: 999 }]) {
      const result = await owner.client.from("memorials").update(patch as never).eq("id", id);
      expect(result.error, JSON.stringify(patch)).not.toBeNull();
    }
    const { data } = await admin.from("memorials").select("tier, status, visibility, candle_count").eq("id", id).single();
    expect(data).toEqual({ tier: "free", status: "draft", visibility: "public", candle_count: 0 });
  });

  it("tuđi memorijal se ne može uređivati, objaviti ni obrisati", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    const update = await stranger.client.from("memorials").update({ name: "Tuđe" }).eq("id", id).select("id");
    expect(update.data ?? []).toHaveLength(0);
    expect((await stranger.client.rpc("unpublish_memorial", { p_id: id })).error).not.toBeNull();
    expect((await stranger.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "private" })).error).not.toBeNull();
    const removed = await stranger.client.from("memorials").delete().eq("id", id).select("id");
    expect(removed.data ?? []).toHaveLength(0);
    const { data } = await admin.from("memorials").select("name, status").eq("id", id).single();
    expect(data).toEqual({ name: "Medo", status: "published" });
  });

  it("besplatni spomen ne može postati privatan", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    const result = await owner.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "private" });
    expect(result.error?.message).toContain("paid_feature");
  });

  it("anonimni korisnik može imati nacrt, ali ne može objaviti bez e-maila", async () => {
    const anonymous = await createAnonymousUser();
    const id = await createDraft(anonymous.client, "Mrvica");
    const result = await anonymous.client.rpc("publish_memorial", { p_id: id });
    expect(result.error?.message).toContain("email_required");
    const { data } = await admin.from("memorials").select("status").eq("id", id).single();
    expect(data?.status).toBe("draft");
  });

  it("besplatni spomen prima najviše pet fotografija", async () => {
    const id = await createDraft(owner.client);
    for (let index = 0; index < 5; index += 1) {
      const added = await owner.client
        .from("memorial_photos")
        .insert({ memorial_id: id, storage_path: `${id}/${index}`, created_by: owner.id });
      expect(added.error).toBeNull();
    }
    const sixth = await owner.client
      .from("memorial_photos")
      .insert({ memorial_id: id, storage_path: `${id}/5`, created_by: owner.id });
    expect(sixth.error?.message).toContain("photo_limit");
    // Tuđi korisnik ne može dodati fotografiju.
    const foreign = await stranger.client
      .from("memorial_photos")
      .insert({ memorial_id: id, storage_path: `${id}/tudje`, created_by: stranger.id });
    expect(foreign.error).not.toBeNull();
  });
});

describe("knjiga sjećanja i javni unosi", () => {
  it("posjetitelj ne piše izravno; poruku na čekanju vidi samo vlasnik, koji je odobrava", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });

    const direct = await anonClient()
      .from("guestbook_entries")
      .insert({ memorial_id: id, author_name: "Robot", body: "Kupite odmah" });
    expect(direct.error).not.toBeNull();

    const { data: entry } = await admin
      .from("guestbook_entries")
      .insert({ memorial_id: id, author_name: "Ivana", body: "Ulica je tiša bez njega.", author_email: "ivana@example.com" })
      .select("id")
      .single();

    expect((await anonClient().from("guestbook_entries").select("id").eq("memorial_id", id)).data).toHaveLength(0);
    expect((await owner.client.from("guestbook_entries").select("id, status").eq("memorial_id", id)).data).toEqual([
      { id: entry!.id, status: "pending" },
    ]);
    // E-mail autora ne može pročitati ni vlasnik.
    expect((await owner.client.from("guestbook_entries").select("author_email").eq("memorial_id", id)).error).not.toBeNull();

    const foreign = await stranger.client.from("guestbook_entries").update({ status: "approved" }).eq("id", entry!.id).select("id");
    expect(foreign.data ?? []).toHaveLength(0);

    const approved = await owner.client.from("guestbook_entries").update({ status: "approved" }).eq("id", entry!.id).select("id");
    expect(approved.data).toHaveLength(1);
    expect((await anonClient().from("guestbook_entries").select("body").eq("memorial_id", id)).data).toEqual([
      { body: "Ulica je tiša bez njega." },
    ]);

    // Vlasnik može sakriti, ali ne i označiti kao uklonjeno (to radi samo admin).
    const removed = await owner.client.from("guestbook_entries").update({ status: "removed" }).eq("id", entry!.id);
    expect(removed.error).not.toBeNull();
  });

  it("svijeće, prijave i ograničenja nisu čitljivi izvana", async () => {
    for (const table of ["candles", "reports", "rate_limits", "stripe_events", "draft_claims"] as const) {
      const result = await anonClient().from(table).select("*").limit(1);
      expect(result.error, table).not.toBeNull();
    }
  });

  it("privatno pismo vidi samo autor", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });
    await owner.client.from("letters").insert({ memorial_id: id, author_id: owner.id, body: "Nedostaješ mi.", visibility: "private" });
    await owner.client.from("letters").insert({ memorial_id: id, author_id: owner.id, body: "Hvala ti.", visibility: "public" });
    expect((await anonClient().from("letters").select("body").eq("memorial_id", id)).data).toEqual([{ body: "Hvala ti." }]);
    expect((await owner.client.from("letters").select("body").eq("memorial_id", id)).data).toHaveLength(2);
  });
});

describe("narudžbe i prava", () => {
  it("korisnik ne može sam stvoriti narudžbu ni pravo, niti vidjeti tuđe", async () => {
    const insert = await owner.client.from("orders").insert({ subtotal_cents: 0, total_cents: 0 } as never);
    expect(insert.error).not.toBeNull();
    const fulfil = await owner.client.rpc("fulfill_order" as never, { p_order_id: crypto.randomUUID(), p_payment_intent: "x", p_email: "" } as never);
    expect(fulfil.error).not.toBeNull();

    const { data: orderId } = await admin.rpc("create_order", {
      p_order: { user_id: owner.id, email: owner.email, subtotal_cents: 1900, discount_cents: 0, total_cents: 1900 },
      p_lines: [{ kind: "memorial", product_key: "memorial", unit_amount_cents: 1900, discount_cents: 0, total_cents: 1900 }],
    });
    expect((await owner.client.from("orders").select("id").eq("id", orderId!)).data).toHaveLength(1);
    expect((await stranger.client.from("orders").select("id").eq("id", orderId!)).data).toHaveLength(0);
    expect((await anonClient().from("orders").select("id").eq("id", orderId!)).error).not.toBeNull();
  });

  it("kodovi za popust i partneri nisu javni", async () => {
    expect((await anonClient().from("promo_codes").select("code").limit(1)).error).not.toBeNull();
    expect((await owner.client.from("promo_codes").select("code").limit(1)).data ?? []).toHaveLength(0);
    expect((await owner.client.from("partners").select("name").limit(1)).data ?? []).toHaveLength(0);
  });
});

describe("preuzimanje nacrta", () => {
  it("nacrt anonimnog korisnika prelazi na račun samo uz ispravan token", async () => {
    const anonymous = await createAnonymousUser();
    const id = await createDraft(anonymous.client, "Luna");
    const { data: token, error } = await anonymous.client.rpc("create_draft_claim");
    expect(error).toBeNull();

    expect((await stranger.client.rpc("claim_drafts", { p_token: "pogresan-token" })).data).toBe(0);
    expect((await admin.from("memorials").select("owner_id").eq("id", id).single()).data?.owner_id).toBe(anonymous.id);

    expect((await owner.client.rpc("claim_drafts", { p_token: token! })).data).toBe(1);
    expect((await admin.from("memorials").select("owner_id").eq("id", id).single()).data?.owner_id).toBe(owner.id);
    // Token je jednokratan.
    expect((await stranger.client.rpc("claim_drafts", { p_token: token! })).data).toBe(0);
  });

  it("prijavljeni korisnik ne može izdati token za tuđe nacrte", async () => {
    const result = await owner.client.rpc("create_draft_claim");
    expect(result.error?.message).toContain("not_anonymous");
  });
});

describe("pohrana fotografija", () => {
  it("datoteku u mapu memorijala može staviti samo onaj tko ga smije uređivati", async () => {
    const id = await createDraft(owner.client);
    const file = new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: "image/webp" });
    const path = `${id}/${crypto.randomUUID()}/thumb.webp`;

    const foreign = await stranger.client.storage.from("memorial-media").upload(path, file, { contentType: "image/webp" });
    expect(foreign.error).not.toBeNull();
    const anonymous = await anonClient().storage.from("memorial-media").upload(path, file, { contentType: "image/webp" });
    expect(anonymous.error).not.toBeNull();

    const own = await owner.client.storage.from("memorial-media").upload(path, file, { contentType: "image/webp" });
    expect(own.error).toBeNull();

    // Nacrt nije javan, pa datoteku ne može preuzeti nitko drugi.
    expect((await anonClient().storage.from("memorial-media").download(path)).error).not.toBeNull();
    expect((await stranger.client.storage.from("memorial-media").download(path)).error).not.toBeNull();
    expect((await owner.client.storage.from("memorial-media").download(path)).error).toBeNull();
  });
});
