import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// E-mail se ne šalje; provjerava se samo što bi bilo poslano.
vi.mock("@/server/email/send", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/email/send")>()),
  sendEmail: vi.fn(async () => {}),
}));
// Slanje poklona pripada naplati i radi nad istom lokalnom bazom kojom se služe i drugi testovi,
// pa se ovdje samo bilježi da ga je zakazani posao pozvao.
vi.mock("@/server/checkout/after-payment", () => ({ sendDueGifts: vi.fn(async () => 0) }));

import { GET, POST } from "@/app/api/cron/podsjetnici/route";
import { parseVideoUrl } from "@/components/owner/video-url";
import { zagrebDay } from "@/lib/time";
import { isSupportedVideoUrl } from "@/lib/validation";
import { sendDueGifts } from "@/server/checkout/after-payment";
import { sendEmail } from "@/server/email/send";
import { candidateDates, dueKinds, isAnniversaryOn, isLeapYear, monthDaysFor } from "@/server/owner/reminder-dates";
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
 * Vlasnikov prostor: suradnici, pisma i podsjetnici, provjereni u bazi onako kako ih vidi
 * preglednik (javni ključ i korisnikova sesija), zatim čista logika datuma i videa te zakazani
 * posao pozvan kao pravi zahtjev.
 */

const admin = adminClient();
let owner: TestUser;
let collaborator: TestUser;
let stranger: TestUser;

/** Objavljen spomen na plaćenom paketu (paket postavlja servisna uloga, kao nakon plaćanja). */
async function createPaidMemorial(user: TestUser, name = "Medo"): Promise<string> {
  const id = await createDraft(user.client, name);
  const published = await user.client.rpc("publish_memorial", { p_id: id });
  if (published.error) {
    throw new Error(published.error.message);
  }
  const { error } = await admin.from("memorials").update({ tier: "memorial" }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  return id;
}

/** Poziva e-mail adresu i vraća jednokratni token. */
async function invite(memorialId: string, email: string): Promise<string> {
  const { data, error } = await owner.client.rpc("invite_member", { p_memorial_id: memorialId, p_email: email });
  if (error || !data) {
    throw new Error(`Pozivnica nije izdana: ${error?.message}`);
  }
  return data;
}

async function addCollaborator(memorialId: string, user: TestUser): Promise<void> {
  const token = await invite(memorialId, user.email);
  const { error } = await user.client.rpc("accept_member_invite", { p_token: token });
  if (error) {
    throw new Error(`Pozivnica nije prihvaćena: ${error.message}`);
  }
}

beforeAll(async () => {
  owner = await createUser("vlasnik");
  collaborator = await createUser("suradnik");
  stranger = await createUser("stranac");
});

afterAll(async () => {
  await cleanupUsers();
});

describe("suradnici", () => {
  it("poziva samo vlasnik, i ne na besplatnom spomenu", async () => {
    const id = await createDraft(owner.client);
    await owner.client.rpc("publish_memorial", { p_id: id });

    const free = await owner.client.rpc("invite_member", { p_memorial_id: id, p_email: collaborator.email });
    expect(free.error?.message).toContain("paid_feature");

    await admin.from("memorials").update({ tier: "memorial" }).eq("id", id);
    const foreign = await stranger.client.rpc("invite_member", { p_memorial_id: id, p_email: collaborator.email });
    expect(foreign.error?.message).toContain("not_found");
    const anonymous = await anonClient().rpc("invite_member", { p_memorial_id: id, p_email: collaborator.email });
    expect(anonymous.error).not.toBeNull();
    const invalid = await owner.client.rpc("invite_member", { p_memorial_id: id, p_email: "nije-adresa" });
    expect(invalid.error?.message).toContain("invalid_email");

    // Redak se ne može upisati mimo funkcije.
    const direct = await owner.client
      .from("memorial_members")
      .insert({ memorial_id: id, invited_email: "izravno@test.tragsape.local" });
    expect(direct.error).not.toBeNull();

    const token = await invite(id, collaborator.email.toUpperCase());
    expect(token).toMatch(/^[a-f0-9]{48}$/);
    const { data: members } = await owner.client
      .from("memorial_members")
      .select("invited_email, accepted_at, user_id")
      .eq("memorial_id", id);
    expect(members).toEqual([{ invited_email: collaborator.email, accepted_at: null, user_id: null }]);
    // Pozvani još nema pristup, a pozivnicu ne vidi nitko osim vlasnika.
    expect((await collaborator.client.from("memorial_members").select("invited_email").eq("memorial_id", id)).data).toEqual([]);
    expect((await collaborator.client.rpc("can_edit_memorial", { p_memorial_id: id })).data).toBe(false);
  });

  it("pozivnica vrijedi jednom; ne prihvaća je anonimni korisnik ni vlasnik", async () => {
    const id = await createPaidMemorial(owner);
    const token = await invite(id, collaborator.email);

    const anonymous = await createAnonymousUser();
    expect((await anonymous.client.rpc("accept_member_invite", { p_token: token })).error?.message).toContain(
      "email_required",
    );
    expect((await anonClient().rpc("accept_member_invite", { p_token: token })).error).not.toBeNull();
    expect((await owner.client.rpc("accept_member_invite", { p_token: token })).error?.message).toContain("is_owner");
    expect((await collaborator.client.rpc("accept_member_invite", { p_token: "0".repeat(48) })).error?.message).toContain(
      "not_found",
    );
    // Nijedan od neuspjelih pokušaja nije potrošio pozivnicu.
    const accepted = await collaborator.client.rpc("accept_member_invite", { p_token: token });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toBe(id);
    expect((await collaborator.client.rpc("can_edit_memorial", { p_memorial_id: id })).data).toBe(true);

    // Isti token drugi put ne vrijedi ni za koga.
    expect((await stranger.client.rpc("accept_member_invite", { p_token: token })).error).not.toBeNull();
    expect((await collaborator.client.rpc("accept_member_invite", { p_token: token })).error).not.toBeNull();
    expect((await stranger.client.rpc("can_edit_memorial", { p_memorial_id: id })).data).toBe(false);

    const { data: member } = await admin
      .from("memorial_members")
      .select("user_id, invite_token_hash, accepted_at")
      .eq("memorial_id", id)
      .single();
    expect(member?.user_id).toBe(collaborator.id);
    expect(member?.invite_token_hash).toBeNull();
    expect(member?.accepted_at).not.toBeNull();
  });

  it("nova pozivnica poništava staru", async () => {
    const id = await createPaidMemorial(owner);
    const first = await invite(id, collaborator.email);
    const second = await invite(id, collaborator.email);
    expect(second).not.toBe(first);
    expect((await collaborator.client.rpc("accept_member_invite", { p_token: first })).error?.message).toContain("not_found");
    expect((await collaborator.client.rpc("accept_member_invite", { p_token: second })).data).toBe(id);
  });

  it("suradnik uređuje sadržaj i dodaje fotografiju, ali ne mijenja privatnost, objavu ni suradnike i ne briše", async () => {
    const id = await createPaidMemorial(owner);
    await addCollaborator(id, collaborator);

    const edited = await collaborator.client
      .from("memorials")
      .update({ dedication: "Dopisao suradnik.", story_md: "Zajednička priča.", adoption_date: "2014-06-01" })
      .eq("id", id)
      .select("id");
    expect(edited.error).toBeNull();
    expect(edited.data).toHaveLength(1);

    const photo = await collaborator.client
      .from("memorial_photos")
      .insert({ memorial_id: id, storage_path: `${id}/suradnik`, created_by: collaborator.id });
    expect(photo.error).toBeNull();
    const event = await collaborator.client
      .from("timeline_events")
      .insert({ memorial_id: id, event_date: "2014-06-01", title: "Prvi dan kod nas" });
    expect(event.error).toBeNull();

    // Privatnost, objava, brisanje, paket i suradnici ostaju vlasniku.
    expect((await collaborator.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "private" })).error).not.toBeNull();
    expect((await collaborator.client.rpc("unpublish_memorial", { p_id: id })).error).not.toBeNull();
    for (const patch of [{ visibility: "private" }, { status: "draft" }, { tier: "portrait" }]) {
      const result = await collaborator.client.from("memorials").update(patch as never).eq("id", id);
      expect(result.error, JSON.stringify(patch)).not.toBeNull();
    }
    expect((await collaborator.client.from("memorials").delete().eq("id", id).select("id")).data ?? []).toHaveLength(0);
    expect(
      (await collaborator.client.rpc("invite_member", { p_memorial_id: id, p_email: stranger.email })).error?.message,
    ).toContain("not_found");
    expect(
      (await collaborator.client.from("memorial_members").delete().eq("memorial_id", id).select("invited_email")).data ?? [],
    ).toHaveLength(0);

    const { data } = await admin.from("memorials").select("status, visibility, tier, dedication").eq("id", id).single();
    expect(data).toEqual({ status: "published", visibility: "public", tier: "memorial", dedication: "Dopisao suradnik." });
    expect((await admin.from("memorial_members").select("user_id").eq("memorial_id", id)).data).toEqual([
      { user_id: collaborator.id },
    ]);
  });

  it("uklonjeni suradnik gubi pristup", async () => {
    const id = await createPaidMemorial(owner);
    await addCollaborator(id, collaborator);
    await owner.client.rpc("set_memorial_visibility", { p_id: id, p_visibility: "private" });
    // Privatni spomen suradnik vidi i uređuje dok je suradnik.
    expect((await collaborator.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(1);

    // Suradnik može vidjeti samo vlastiti redak; tuđi stranac ne vidi ništa.
    expect((await stranger.client.from("memorial_members").select("invited_email").eq("memorial_id", id)).data).toEqual([]);
    const foreign = await stranger.client.from("memorial_members").delete().eq("memorial_id", id).select("invited_email");
    expect(foreign.data ?? []).toHaveLength(0);

    const removed = await owner.client
      .from("memorial_members")
      .delete()
      .eq("memorial_id", id)
      .eq("invited_email", collaborator.email)
      .select("invited_email");
    expect(removed.data).toHaveLength(1);

    expect((await collaborator.client.rpc("can_edit_memorial", { p_memorial_id: id })).data).toBe(false);
    expect((await collaborator.client.from("memorials").select("id").eq("id", id)).data).toHaveLength(0);
    const edit = await collaborator.client.from("memorials").update({ dedication: "Nakon uklanjanja." }).eq("id", id).select("id");
    expect(edit.data ?? []).toHaveLength(0);
    const photo = await collaborator.client
      .from("memorial_photos")
      .insert({ memorial_id: id, storage_path: `${id}/kasno`, created_by: collaborator.id });
    expect(photo.error).not.toBeNull();
    const letter = await collaborator.client
      .from("letters")
      .insert({ memorial_id: id, author_id: collaborator.id, body: "Nakon uklanjanja." });
    expect(letter.error).not.toBeNull();
  });
});

describe("pisma", () => {
  it("privatno pismo suradnika ne vidi vlasnik, ni obrnuto; javna vide svi", async () => {
    const id = await createPaidMemorial(owner);
    await addCollaborator(id, collaborator);

    const mine = await owner.client
      .from("letters")
      .insert({ memorial_id: id, author_id: owner.id, body: "Vlasnikovo privatno pismo." })
      .select("id, visibility")
      .single();
    expect(mine.error).toBeNull();
    // Zadano je privatno.
    expect(mine.data?.visibility).toBe("private");
    const theirs = await collaborator.client
      .from("letters")
      .insert({ memorial_id: id, author_id: collaborator.id, body: "Suradnikovo privatno pismo.", visibility: "private" })
      .select("id")
      .single();
    expect(theirs.error).toBeNull();
    const shared = await collaborator.client
      .from("letters")
      .insert({ memorial_id: id, author_id: collaborator.id, body: "Suradnikovo javno pismo.", visibility: "public" })
      .select("id")
      .single();
    expect(shared.error).toBeNull();

    const bodies = async (client: TestUser["client"] | ReturnType<typeof anonClient>) =>
      ((await client.from("letters").select("body").eq("memorial_id", id).order("body")).data ?? []).map((row) => row.body);
    expect(await bodies(owner.client)).toEqual(["Suradnikovo javno pismo.", "Vlasnikovo privatno pismo."]);
    expect(await bodies(collaborator.client)).toEqual(["Suradnikovo javno pismo.", "Suradnikovo privatno pismo."]);
    expect(await bodies(stranger.client)).toEqual(["Suradnikovo javno pismo."]);
    expect(await bodies(anonClient())).toEqual(["Suradnikovo javno pismo."]);

    // Tuđe pismo se ne može ni mijenjati ni obrisati, pa ni pismo na vlastitom spomenu.
    const ownerEdits = await owner.client.from("letters").update({ body: "Prepravljeno." }).eq("id", theirs.data!.id).select("id");
    expect(ownerEdits.data ?? []).toHaveLength(0);
    const ownerDeletes = await owner.client.from("letters").delete().eq("id", shared.data!.id).select("id");
    expect(ownerDeletes.data ?? []).toHaveLength(0);
    const collaboratorDeletes = await collaborator.client.from("letters").delete().eq("id", mine.data!.id).select("id");
    expect(collaboratorDeletes.data ?? []).toHaveLength(0);

    // Pismo se ne može potpisati tuđim imenom ni napisati na spomenu koji se ne smije uređivati.
    const forged = await collaborator.client
      .from("letters")
      .insert({ memorial_id: id, author_id: owner.id, body: "U tuđe ime." });
    expect(forged.error).not.toBeNull();
    const outsider = await stranger.client
      .from("letters")
      .insert({ memorial_id: id, author_id: stranger.id, body: "Bez prava uređivanja." });
    expect(outsider.error).not.toBeNull();

    // Autor mijenja i briše svoje.
    const published = await owner.client.from("letters").update({ visibility: "public" }).eq("id", mine.data!.id).select("id");
    expect(published.data).toHaveLength(1);
    expect(await bodies(anonClient())).toEqual(["Suradnikovo javno pismo.", "Vlasnikovo privatno pismo."]);
    expect((await collaborator.client.from("letters").delete().eq("id", theirs.data!.id).select("id")).data).toHaveLength(1);
  });
});

describe("postavke podsjetnika", () => {
  it("redak se stvara samo za sebe i samo za spomen koji se smije uređivati", async () => {
    const id = await createPaidMemorial(owner);
    await addCollaborator(id, collaborator);

    const own = await owner.client.from("reminder_prefs").insert({ memorial_id: id, user_id: owner.id }).select("*").single();
    expect(own.error).toBeNull();
    // Stvoreni redak ima uključena sva tri podsjetnika.
    expect(own.data).toMatchObject({ birthday: true, adoption: true, anniversary: true });
    const collaboratorOwn = await collaborator.client
      .from("reminder_prefs")
      .insert({ memorial_id: id, user_id: collaborator.id, birthday: false });
    expect(collaboratorOwn.error).toBeNull();

    const forOther = await owner.client.from("reminder_prefs").insert({ memorial_id: id, user_id: stranger.id });
    expect(forOther.error).not.toBeNull();
    const outsider = await stranger.client.from("reminder_prefs").insert({ memorial_id: id, user_id: stranger.id });
    expect(outsider.error).not.toBeNull();
    expect((await anonClient().from("reminder_prefs").select("memorial_id").limit(1)).error).not.toBeNull();

    // Svatko vidi i mijenja samo svoje postavke.
    expect((await owner.client.from("reminder_prefs").select("user_id").eq("memorial_id", id)).data).toEqual([
      { user_id: owner.id },
    ]);
    expect((await stranger.client.from("reminder_prefs").select("user_id").eq("memorial_id", id)).data).toEqual([]);
    const hijack = await owner.client
      .from("reminder_prefs")
      .update({ anniversary: false })
      .eq("memorial_id", id)
      .eq("user_id", collaborator.id)
      .select("user_id");
    expect(hijack.data ?? []).toHaveLength(0);
    const off = await collaborator.client
      .from("reminder_prefs")
      .update({ adoption: false })
      .eq("memorial_id", id)
      .eq("user_id", collaborator.id)
      .select("birthday, adoption, anniversary");
    expect(off.data).toEqual([{ birthday: false, adoption: false, anniversary: true }]);

    // Dnevnik poslanih nije dostupan nijednom korisniku.
    expect((await owner.client.from("reminder_log").select("memorial_id").limit(1)).error).not.toBeNull();
    const fakeLog = await owner.client
      .from("reminder_log")
      .insert({ memorial_id: id, user_id: owner.id, kind: "birthday", year: 2026 });
    expect(fakeLog.error).not.toBeNull();
  });
});

describe("datumi podsjetnika", () => {
  it("prijestupne godine", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("29. veljače obilježava se 28. veljače kad godina nema taj dan", () => {
    expect(monthDaysFor("2026-11-25")).toEqual(["11-25"]);
    expect(monthDaysFor("2027-02-28")).toEqual(["02-28", "02-29"]);
    expect(monthDaysFor("2028-02-28")).toEqual(["02-28"]);
    expect(monthDaysFor("2028-02-29")).toEqual(["02-29"]);
    expect(monthDaysFor("2027-03-01")).toEqual(["03-01"]);

    expect(isAnniversaryOn("2020-02-29", "2027-02-28")).toBe(true);
    expect(isAnniversaryOn("2020-02-29", "2027-03-01")).toBe(false);
    expect(isAnniversaryOn("2020-02-29", "2028-02-28")).toBe(false);
    expect(isAnniversaryOn("2020-02-29", "2028-02-29")).toBe(true);
    expect(isAnniversaryOn("2019-02-28", "2027-02-28")).toBe(true);
    expect(isAnniversaryOn("2019-02-28", "2028-02-29")).toBe(false);
  });

  it("godišnjica se računa po mjesecu i danu, i tek od sljedeće godine", () => {
    expect(isAnniversaryOn("2015-11-25", "2026-11-25")).toBe(true);
    expect(isAnniversaryOn("2015-11-24", "2026-11-25")).toBe(false);
    expect(isAnniversaryOn("2015-12-25", "2026-11-25")).toBe(false);
    // Na sam dan događaja podsjetnik se ne šalje.
    expect(isAnniversaryOn("2026-11-25", "2026-11-25")).toBe(false);
    expect(isAnniversaryOn("2027-11-25", "2026-11-25")).toBe(false);
    expect(isAnniversaryOn(null, "2026-11-25")).toBe(false);
    expect(isAnniversaryOn("nije-datum", "2026-11-25")).toBe(false);
  });

  it("rođenje i odlazak računaju se samo uz točan dan", () => {
    const dates = {
      birth_date: "2012-11-25",
      birth_precision: "day",
      adoption_date: "2013-11-25",
      death_date: "2024-11-25",
      death_precision: "day",
    };
    expect(dueKinds(dates, "2026-11-25")).toEqual(["birthday", "adoption", "anniversary"]);
    expect(dueKinds({ ...dates, birth_precision: "month", death_precision: "year" }, "2026-11-25")).toEqual(["adoption"]);
    expect(dueKinds({ ...dates, adoption_date: null }, "2026-11-25")).toEqual(["birthday", "anniversary"]);
    expect(dueKinds(dates, "2026-11-26")).toEqual([]);
  });

  it("popis datuma za upit pokriva sve godine i preskače nepostojeće 29. veljače", () => {
    const regular = candidateDates("2026-11-25");
    expect(regular[0]).toBe("1950-11-25");
    expect(regular.at(-1)).toBe("2025-11-25");
    expect(regular).toHaveLength(76);

    const fallback = candidateDates("2027-02-28");
    expect(fallback).toContain("2026-02-28");
    expect(fallback).toContain("2024-02-29");
    expect(fallback).not.toContain("2023-02-29");
    expect(fallback).not.toContain("2027-02-28");
    expect(candidateDates("2028-02-28").some((date) => date.endsWith("02-29"))).toBe(false);
    // Svaki datum s popisa doista je godišnjica tog dana.
    for (const today of ["2026-11-25", "2027-02-28", "2028-02-29"]) {
      expect(candidateDates(today).every((date) => isAnniversaryOn(date, today))).toBe(true);
    }
  });
});

describe("poveznice na video", () => {
  it("prepoznaje YouTube i Vimeo i slaže adresu za ugradnju od nule", () => {
    const youtube = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "  https://youtu.be/dQw4w9WgXcQ  ",
    ]) {
      expect(parseVideoUrl(url), url).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ", embedUrl: youtube });
    }
    expect(parseVideoUrl("https://vimeo.com/76979871")).toEqual({
      provider: "vimeo",
      id: "76979871",
      hash: null,
      embedUrl: "https://player.vimeo.com/video/76979871?dnt=1",
    });
    expect(parseVideoUrl("https://vimeo.com/76979871/0a1b2c3d4e")?.embedUrl).toBe(
      "https://player.vimeo.com/video/76979871?h=0a1b2c3d4e&dnt=1",
    );
    expect(parseVideoUrl("https://www.vimeo.com/channels/staffpicks/76979871")?.id).toBe("76979871");
    expect(parseVideoUrl("https://vimeo.com/groups/ime/videos/76979871")?.id).toBe("76979871");
  });

  it("odbija sve ostalo", () => {
    for (const url of [
      "",
      "nije poveznica",
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=kratko",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload",
      "https://www.youtube.com/watch",
      "https://www.youtube.com/@kanal",
      "https://www.youtube.com/playlist?list=PL123",
      "https://youtu.be/",
      "https://youtu.be/dQw4w9WgXcQ/../../x",
      "https://youtube.com.zlo.example/watch?v=dQw4w9WgXcQ",
      "https://zlo.example/https://youtu.be/dQw4w9WgXcQ",
      "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com:8443/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/",
      "https://vimeo.com/ime-korisnika",
      "https://vimeo.com/76979871/nije-hash!",
      "https://vimeo.com/76979871/0a1b2c3d4e/jos",
      "https://player.vimeo.com/video/76979871",
      "https://dailymotion.com/video/x123",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
    ]) {
      expect(parseVideoUrl(url), url).toBeNull();
    }
  });

  it("ne prihvaća ništa što ne bi prošlo provjeru pri spremanju", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://vimeo.com/76979871",
      "http://vimeo.com/76979871",
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://example.com/watch?v=dQw4w9WgXcQ",
    ]) {
      if (parseVideoUrl(url) !== null) {
        expect(isSupportedVideoUrl(url), url).toBe(true);
      }
    }
    expect(parseVideoUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("zakazani posao /api/cron/podsjetnici", () => {
  const SECRET = "tajna-za-test-zakazanog-posla";
  const emailMock = vi.mocked(sendEmail);
  const giftsMock = vi.mocked(sendDueGifts);
  let previousSecret: string | undefined;

  function call(handler: (request: Request) => Promise<Response>, authorization?: string): Promise<Response> {
    return handler(
      new Request("http://localhost:3000/api/cron/podsjetnici", {
        method: handler === GET ? "GET" : "POST",
        headers: authorization === undefined ? {} : { Authorization: authorization },
      }),
    );
  }

  /** E-mailovi koje je posao poslao zadanoj adresi (u bazi mogu postojati i tuđi spomeni). */
  function sentTo(address: string) {
    return emailMock.mock.calls.map(([message]) => message).filter((message) => message.to === address);
  }

  beforeAll(() => {
    previousSecret = process.env.CRON_SECRET;
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  });

  it("503 bez postavljene tajne, 401 s pogrešnom ili bez nje", async () => {
    emailMock.mockClear();
    giftsMock.mockClear();
    delete process.env.CRON_SECRET;
    for (const handler of [POST, GET]) {
      const response = await call(handler, `Bearer ${SECRET}`);
      expect(response.status).toBe(503);
    }

    process.env.CRON_SECRET = SECRET;
    for (const authorization of [undefined, "", "Bearer", "Bearer pogresna", SECRET, `Basic ${SECRET}`, `Bearer ${SECRET}x`, `bearer ${SECRET}`]) {
      for (const handler of [POST, GET]) {
        const response = await call(handler, authorization);
        expect(response.status, String(authorization)).toBe(401);
        expect(await response.json()).toEqual({ error: "unauthorized" });
      }
    }
    // Bez ispravne tajne posao nije ni počeo.
    expect(emailMock).not.toHaveBeenCalled();
    expect(giftsMock).not.toHaveBeenCalled();
  });

  it("šalje uključene podsjetnike jednom; drugo pokretanje istog dana ne šalje ništa", async () => {
    process.env.CRON_SECRET = SECRET;
    const today = zagrebDay();
    const monthDay = today.slice(5);
    // Prijestupne godine, da datum postoji i ako se test pokrene 29. veljače.
    const dates = {
      birth_date: `2012-${monthDay}`,
      birth_precision: "day",
      adoption_date: `2016-${monthDay}`,
      death_date: `2020-${monthDay}`,
      // Poznat je samo mjesec odlaska, pa godišnjica nema svoj dan.
      death_precision: "month",
    };

    const id = await createPaidMemorial(owner, "Runo");
    await admin.from("memorials").update(dates).eq("id", id);
    await addCollaborator(id, collaborator);
    await owner.client.from("reminder_prefs").insert({ memorial_id: id, user_id: owner.id });
    await collaborator.client.from("reminder_prefs").insert({ memorial_id: id, user_id: collaborator.id, birthday: false });
    const { data: memorial } = await admin.from("memorials").select("slug").eq("id", id).single();

    // Isti datumi, ali bez uvjeta za slanje: besplatni spomen, nacrt i spomen bez pristanka.
    const freeId = await createDraft(stranger.client, "Besplatni");
    await stranger.client.rpc("publish_memorial", { p_id: freeId });
    await admin.from("memorials").update(dates).eq("id", freeId);
    await stranger.client.from("reminder_prefs").insert({ memorial_id: freeId, user_id: stranger.id });
    const draftId = await createDraft(stranger.client, "Nacrt");
    await admin.from("memorials").update({ ...dates, tier: "memorial" }).eq("id", draftId);
    await stranger.client.from("reminder_prefs").insert({ memorial_id: draftId, user_id: stranger.id });
    const silent = await createUser("bez-pristanka");
    const silentId = await createPaidMemorial(silent, "Tiho");
    await admin.from("memorials").update(dates).eq("id", silentId);

    emailMock.mockClear();
    giftsMock.mockClear();
    const first = await call(POST, `Bearer ${SECRET}`);
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.ok).toBe(true);
    expect(firstBody.reminders.date).toBe(today);
    expect(firstBody.reminders.sent).toBeGreaterThanOrEqual(3);
    expect(firstBody.reminders.failed).toBe(0);
    expect(firstBody.gifts).toEqual({ sent: 0 });
    expect(giftsMock).toHaveBeenCalledTimes(1);

    const toOwner = sentTo(owner.email);
    expect(toOwner.map((message) => message.subject).sort()).toEqual(["Runo: danas je rođendan", "Runo: dan dolaska u obitelj"].sort());
    for (const message of toOwner) {
      expect(message.text).toContain(`/spomen/${memorial!.slug}`);
      expect(message.text).toContain(`/moji-ljubimci/${id}/podsjetnici`);
      expect(message.html).toContain(`href="http://localhost:3000/moji-ljubimci/${id}/podsjetnici"`);
    }
    // Suradnik je isključio rođendan.
    expect(sentTo(collaborator.email).map((message) => message.subject)).toEqual(["Runo: dan dolaska u obitelj"]);
    expect(sentTo(stranger.email)).toHaveLength(0);
    expect(sentTo(silent.email)).toHaveLength(0);

    const { data: log } = await admin.from("reminder_log").select("user_id, kind, year").eq("memorial_id", id);
    expect(log).toHaveLength(3);
    expect(new Set(log!.map((row) => row.year))).toEqual(new Set([Number(today.slice(0, 4))]));
    for (const other of [freeId, draftId, silentId]) {
      expect((await admin.from("reminder_log").select("kind").eq("memorial_id", other)).data).toEqual([]);
    }

    // Drugo pokretanje istog dana, ovaj put kao GET.
    emailMock.mockClear();
    const second = await call(GET, `Bearer ${SECRET}`);
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.reminders.alreadySent).toBeGreaterThanOrEqual(3);
    expect(sentTo(owner.email)).toHaveLength(0);
    expect(sentTo(collaborator.email)).toHaveLength(0);
    expect((await admin.from("reminder_log").select("kind").eq("memorial_id", id)).data).toHaveLength(3);

    // Uklonjeni suradnik ne dobiva podsjetnik ni kad mu je stari redak postavki ostao.
    await owner.client.from("memorial_members").delete().eq("memorial_id", id).eq("invited_email", collaborator.email);
    await admin.from("reminder_log").delete().eq("memorial_id", id);
    emailMock.mockClear();
    const third = await call(POST, `Bearer ${SECRET}`);
    expect(third.status).toBe(200);
    expect(sentTo(owner.email)).toHaveLength(2);
    expect(sentTo(collaborator.email)).toHaveLength(0);
  });
});
