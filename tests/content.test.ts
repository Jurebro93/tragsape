import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCtaHref, isInternalPath } from "@/lib/content/attribution";
import { cleanBody, reviewedContentChanged } from "@/lib/content/normalize";
import { pickRelated } from "@/lib/content/related";
import { remarkCtaSlots } from "@/lib/content/remark-cta-slots";
import { planCtaSlots, type BodyBlock } from "@/lib/content/slots";
import { isValidSlug, slugify, SLUG_MAX, suggestSlug } from "@/lib/content/slug";
import type { ArticleSummary, CtaSlot } from "@/lib/content/types";
import { parseArticleForm, parseCtaBlockForm } from "@/lib/content/validation";
import {
  allowedIntents,
  editNeedsConfirmation,
  intentPermitted,
  publishBlocker,
  reviewAfterEdit,
  type ReviewState,
} from "@/lib/content/workflow";
import { adminClient, anonClient, cleanupUsers, createUser, type TestUser } from "./helpers/supabase";

/**
 * Sadržajni sustav: tko smije čitati i pisati članke, izvore i prodajne sekcije (RLS nad lokalnim
 * Supabaseom, onako kako ih vidi preglednik), pravilo objave koje provjerava baza, te čista logika
 * za mjesta prodajnih sekcija, adrese članaka i atribuciju.
 */

const admin = adminClient();
const run = crypto.randomUUID().slice(0, 8);
const CHECK_VIOLATION = "23514";

let editor: TestUser;
let stranger: TestUser;
let publishedId = "";
let draftId = "";
const articleIds: string[] = [];

const now = () => new Date().toISOString();

async function insertArticle(values: {
  slug: string;
  title?: string;
  status?: string;
  needs_vet_review?: boolean;
  vet_reviewed_by?: string | null;
  vet_reviewed_at?: string | null;
  owner_approved_at?: string | null;
  published_at?: string | null;
}): Promise<string> {
  const { data, error } = await admin
    .from("articles")
    .insert({ cluster: "tugovanje", title: values.title ?? "Probni članak", body_md: "Tekst.", ...values })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Članak nije upisan: ${error?.message}`);
  }
  articleIds.push(data.id);
  return data.id;
}

async function insertSource(articleId: string, title: string): Promise<string> {
  const { data, error } = await admin
    .from("article_sources")
    .insert({ article_id: articleId, title, url: "https://example.org/izvor", publisher: "Primjer", accessed_on: "2026-11-25" })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Izvor nije upisan: ${error?.message}`);
  }
  return data.id;
}

beforeAll(async () => {
  editor = await createUser("urednik");
  stranger = await createUser("citatelj");
  const promoted = await admin.from("profiles").update({ role: "admin" }).eq("id", editor.id).select("id");
  if (promoted.error || promoted.data.length !== 1) {
    throw new Error(`Admin nije postavljen: ${promoted.error?.message}`);
  }

  publishedId = await insertArticle({
    slug: `objavljeni-${run}`,
    status: "published",
    owner_approved_at: now(),
    published_at: now(),
  });
  draftId = await insertArticle({ slug: `nacrt-${run}` });
  await insertSource(publishedId, "Javni izvor");
  await insertSource(draftId, "Izvor nacrta");

  const blocks = await admin.from("cta_blocks").insert([
    { key: `aktivna-${run}`, heading: "Aktivna sekcija", button_label: "Otvori", target: "/izradi", active: true },
    { key: `iskljucena-${run}`, heading: "Isključena sekcija", button_label: "Otvori", target: "/izradi", active: false },
  ]);
  if (blocks.error) {
    throw new Error(`Sekcije nisu upisane: ${blocks.error.message}`);
  }
  const slots = await admin.from("article_cta").insert([
    { article_id: publishedId, slot: "after_intro", cta_key: `aktivna-${run}` },
    { article_id: publishedId, slot: "end", cta_key: `iskljucena-${run}` },
  ]);
  if (slots.error) {
    throw new Error(`Dodjele sekcija nisu upisane: ${slots.error.message}`);
  }
});

afterAll(async () => {
  // Izvori i dodjele sekcija nestaju kaskadno s člankom.
  if (articleIds.length > 0) {
    await admin.from("articles").delete().in("id", articleIds);
  }
  await admin.from("articles").delete().like("slug", `%-${run}`);
  await admin.from("cta_blocks").delete().like("key", `%-${run}`);
  await cleanupUsers();
});

describe("čitanje sadržaja (RLS)", () => {
  it("anonimni posjetitelj vidi samo objavljene članke", async () => {
    const { data, error } = await anonClient().from("articles").select("id, status").in("id", [publishedId, draftId]);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: publishedId, status: "published" }]);
  });

  it("prijavljeni korisnik koji nije admin također vidi samo objavljene", async () => {
    const { data } = await stranger.client.from("articles").select("id").in("id", [publishedId, draftId]);
    expect(data).toEqual([{ id: publishedId }]);
  });

  it("izvori se vide samo za objavljene članke", async () => {
    const { data, error } = await anonClient()
      .from("article_sources")
      .select("article_id, title")
      .in("article_id", [publishedId, draftId]);
    expect(error).toBeNull();
    expect(data).toEqual([{ article_id: publishedId, title: "Javni izvor" }]);

    const asUser = await stranger.client.from("article_sources").select("title").eq("article_id", draftId);
    expect(asUser.data).toEqual([]);
  });

  it("članak povučen s objave nestaje zajedno s izvorima", async () => {
    const id = await insertArticle({
      slug: `povuceni-${run}`,
      status: "published",
      owner_approved_at: now(),
      published_at: now(),
    });
    await insertSource(id, "Izvor povučenog");
    expect((await anonClient().from("article_sources").select("id").eq("article_id", id)).data).toHaveLength(1);

    expect((await admin.from("articles").update({ status: "approved" }).eq("id", id)).error).toBeNull();
    expect((await anonClient().from("articles").select("id").eq("id", id)).data).toEqual([]);
    expect((await anonClient().from("article_sources").select("id").eq("article_id", id)).data).toEqual([]);
  });

  it("isključenu prodajnu sekciju vidi samo admin", async () => {
    const keys = [`aktivna-${run}`, `iskljucena-${run}`];
    const anonymous = await anonClient().from("cta_blocks").select("key").in("key", keys);
    expect(anonymous.data).toEqual([{ key: `aktivna-${run}` }]);
    const asAdmin = await editor.client.from("cta_blocks").select("key").in("key", keys).order("key");
    expect(asAdmin.data).toEqual([{ key: `aktivna-${run}` }, { key: `iskljucena-${run}` }]);

    // Dodjela ostaje vidljiva, ali isključena sekcija uz nju ne dolazi.
    const embedded = await anonClient()
      .from("article_cta")
      .select("slot, block:cta_blocks(key)")
      .eq("article_id", publishedId)
      .order("slot");
    expect(embedded.data).toEqual([
      { slot: "after_intro", block: { key: `aktivna-${run}` } },
      { slot: "end", block: null },
    ]);
  });

  it("admin kroz svoju sesiju vidi i nacrte i njihove izvore", async () => {
    const articles = await editor.client.from("articles").select("id").in("id", [publishedId, draftId]);
    expect(articles.data).toHaveLength(2);
    const sources = await editor.client.from("article_sources").select("title").eq("article_id", draftId);
    expect(sources.data).toEqual([{ title: "Izvor nacrta" }]);
  });
});

describe("pisanje sadržaja (RLS)", () => {
  const visitors = () => [
    { who: "anonimni posjetitelj", client: anonClient() },
    { who: "korisnik koji nije admin", client: stranger.client },
  ];

  it("tko nije admin ne može dodati, izmijeniti ni obrisati članak", async () => {
    for (const { who, client } of visitors()) {
      const inserted = await client
        .from("articles")
        .insert({ slug: `uljez-${run}`, cluster: "tugovanje", title: "Uljez" })
        .select("id");
      expect(inserted.error, who).not.toBeNull();

      const updated = await client.from("articles").update({ title: "Promijenjeno" }).eq("id", publishedId).select("id");
      expect(updated.data ?? [], who).toEqual([]);
      const removed = await client.from("articles").delete().eq("id", publishedId).select("id");
      expect(removed.data ?? [], who).toEqual([]);
    }
    const { data } = await admin.from("articles").select("id, title, status").eq("id", publishedId);
    expect(data).toEqual([{ id: publishedId, title: "Probni članak", status: "published" }]);
    expect((await admin.from("articles").select("id").eq("slug", `uljez-${run}`)).data).toEqual([]);
  });

  it("tko nije admin ne može sam sebi objaviti nacrt", async () => {
    const attempt = await stranger.client
      .from("articles")
      .update({ status: "published", owner_approved_at: now(), published_at: now() })
      .eq("id", draftId)
      .select("id");
    expect(attempt.data ?? []).toEqual([]);
    const { data } = await admin.from("articles").select("status, owner_approved_at").eq("id", draftId).single();
    expect(data).toEqual({ status: "draft", owner_approved_at: null });
  });

  it("tko nije admin ne može dodati, izmijeniti ni obrisati izvor", async () => {
    for (const { who, client } of visitors()) {
      const inserted = await client
        .from("article_sources")
        .insert({ article_id: publishedId, title: "Podmetnuti izvor", url: "https://example.org/x", accessed_on: "2026-11-25" })
        .select("id");
      expect(inserted.error, who).not.toBeNull();

      const updated = await client
        .from("article_sources")
        .update({ title: "Promijenjeno" })
        .eq("article_id", publishedId)
        .select("id");
      expect(updated.data ?? [], who).toEqual([]);
      const removed = await client.from("article_sources").delete().eq("article_id", publishedId).select("id");
      expect(removed.data ?? [], who).toEqual([]);
    }
    const { data } = await admin.from("article_sources").select("title").eq("article_id", publishedId);
    expect(data).toEqual([{ title: "Javni izvor" }]);
  });

  it("tko nije admin ne može dodati, izmijeniti ni obrisati prodajnu sekciju ni njezinu dodjelu", async () => {
    const key = `aktivna-${run}`;
    for (const { who, client } of visitors()) {
      const inserted = await client
        .from("cta_blocks")
        .insert({ key: `uljez-${run}`, heading: "Kupi odmah", button_label: "Kupi", target: "/izradi" })
        .select("key");
      expect(inserted.error, who).not.toBeNull();

      const updated = await client.from("cta_blocks").update({ heading: "Kupi odmah" }).eq("key", key).select("key");
      expect(updated.data ?? [], who).toEqual([]);
      const removed = await client.from("cta_blocks").delete().eq("key", key).select("key");
      expect(removed.data ?? [], who).toEqual([]);

      const assigned = await client
        .from("article_cta")
        .insert({ article_id: publishedId, slot: "middle", cta_key: key })
        .select("slot");
      expect(assigned.error, who).not.toBeNull();
      const unassigned = await client.from("article_cta").delete().eq("article_id", publishedId).select("slot");
      expect(unassigned.data ?? [], who).toEqual([]);
    }
    const block = await admin.from("cta_blocks").select("heading").eq("key", key).single();
    expect(block.data).toEqual({ heading: "Aktivna sekcija" });
    expect((await admin.from("cta_blocks").select("key").eq("key", `uljez-${run}`)).data).toEqual([]);
    expect((await admin.from("article_cta").select("slot").eq("article_id", publishedId)).data).toHaveLength(2);
  });

  it("admin kroz svoju sesiju može urediti članak, izvore i sekcije", async () => {
    const created = await editor.client
      .from("articles")
      .insert({ slug: `adminov-${run}`, cluster: "nakon-smrti", title: "Adminov članak" })
      .select("id, status")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id;
    articleIds.push(id);
    expect(created.data!.status).toBe("draft");

    const source = await editor.client
      .from("article_sources")
      .upsert({ article_id: id, title: "Izvor", url: "https://example.org/a", accessed_on: "2026-11-25" })
      .select("id");
    expect(source.error).toBeNull();
    expect(source.data).toHaveLength(1);

    const block = await editor.client
      .from("cta_blocks")
      .insert({ key: `adminova-${run}`, heading: "Sekcija", button_label: "Otvori", target: "/primjer", variant: "plum" });
    expect(block.error).toBeNull();
    const slot = await editor.client
      .from("article_cta")
      .upsert({ article_id: id, slot: "end", cta_key: `adminova-${run}` }, { onConflict: "article_id,slot" });
    expect(slot.error).toBeNull();

    const renamed = await editor.client.from("articles").update({ title: "Novi naslov" }).eq("id", id).select("title");
    expect(renamed.data).toEqual([{ title: "Novi naslov" }]);
    const removed = await editor.client.from("cta_blocks").delete().eq("key", `adminova-${run}`).select("key");
    expect(removed.data).toEqual([{ key: `adminova-${run}` }]);
    // Brisanje sekcije odnosi i njezine dodjele.
    expect((await admin.from("article_cta").select("slot").eq("article_id", id)).data).toEqual([]);
  });
});

describe("pravilo objave u bazi (articles_publish_gate)", () => {
  it("odbija objavu bez vlasnikova odobrenja, i adminu i servisnom ključu", async () => {
    const id = await insertArticle({ slug: `bez-odobrenja-${run}`, status: "in_review" });
    for (const client of [editor.client, admin]) {
      const attempt = await client.from("articles").update({ status: "published", published_at: now() }).eq("id", id);
      expect(attempt.error?.code).toBe(CHECK_VIOLATION);
      expect(attempt.error?.message).toContain("articles_publish_gate");
    }
    expect((await admin.from("articles").select("status").eq("id", id).single()).data).toEqual({ status: "in_review" });
    expect((await anonClient().from("articles").select("id").eq("id", id)).data).toEqual([]);
  });

  it("zdravstveni članak bez pregleda veterinara objavljuje se uz vlasnikovo odobrenje (odluka od 26. 11. 2026.)", async () => {
    const id = await insertArticle({
      slug: `bez-veterinara-${run}`,
      status: "approved",
      needs_vet_review: true,
      owner_approved_at: now(),
    });
    const attempt = await editor.client
      .from("articles")
      .update({ status: "published", published_at: now() })
      .eq("id", id);
    expect(attempt.error).toBeNull();
    // Oznaka ostaje, pa stranica prikazuje napomenu da tekst nije pregledao veterinar.
    expect(
      (await admin.from("articles").select("status, needs_vet_review, vet_reviewed_at").eq("id", id).single()).data,
    ).toEqual({ status: "published", needs_vet_review: true, vet_reviewed_at: null });
  });

  it("odbija i pregled veterinara bez vlasnikova odobrenja", async () => {
    const id = await insertArticle({
      slug: `samo-veterinar-${run}`,
      status: "in_review",
      needs_vet_review: true,
      vet_reviewed_by: "dr. med. vet. Proba",
      vet_reviewed_at: now(),
    });
    const attempt = await editor.client
      .from("articles")
      .update({ status: "published", published_at: now() })
      .eq("id", id);
    expect(attempt.error?.code).toBe(CHECK_VIOLATION);
  });

  it("objavljuje kad postoje i pregled veterinara i odobrenje", async () => {
    const id = await insertArticle({ slug: `potpun-${run}`, status: "in_review", needs_vet_review: true });
    const reviewed = await editor.client
      .from("articles")
      .update({ vet_reviewed_by: "dr. med. vet. Proba", vet_reviewed_at: now() })
      .eq("id", id);
    expect(reviewed.error).toBeNull();
    const approved = await editor.client
      .from("articles")
      .update({ status: "approved", owner_approved_at: now() })
      .eq("id", id);
    expect(approved.error).toBeNull();
    const published = await editor.client
      .from("articles")
      .update({ status: "published", published_at: now() })
      .eq("id", id)
      .select("status");
    expect(published.error).toBeNull();
    expect(published.data).toEqual([{ status: "published" }]);
    expect((await anonClient().from("articles").select("id").eq("id", id)).data).toEqual([{ id }]);
  });

  it("objavljenom članku se ne može naknadno maknuti odobrenje ni pregled", async () => {
    const id = await insertArticle({
      slug: `objavljen-zdravstveni-${run}`,
      status: "published",
      needs_vet_review: true,
      vet_reviewed_by: "dr. med. vet. Proba",
      vet_reviewed_at: now(),
      owner_approved_at: now(),
      published_at: now(),
    });
    const noApproval = await editor.client.from("articles").update({ owner_approved_at: null }).eq("id", id);
    expect(noApproval.error?.code).toBe(CHECK_VIOLATION);
    // Zajedno s povratkom na pregled to prolazi: tako uređivač vraća izmijenjen tekst na pregled.
    const reset = await editor.client
      .from("articles")
      .update({ status: "in_review", owner_approved_at: null, vet_reviewed_by: null, vet_reviewed_at: null })
      .eq("id", id);
    expect(reset.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Čista logika
// ---------------------------------------------------------------------------------------------

/** Blokovi iz kratkog zapisa: "p" odlomak, "h2"/"h3" naslov, "o" ostalo. Svaki blok dug je 100 znakova. */
function blocks(...kinds: string[]): BodyBlock[] {
  return kinds.map((kind, index) => {
    const offset = index * 100;
    if (kind.startsWith("h")) {
      return { kind: "heading", depth: Number(kind.slice(1)), offset };
    }
    return { kind: kind === "p" ? "paragraph" : "other", offset };
  });
}

function plan(kinds: string[], slots: CtaSlot[]) {
  const list = blocks(...kinds);
  return Object.fromEntries(planCtaSlots(list, list.length * 100, slots).map((entry) => [entry.slot, entry.before]));
}

const ALL: CtaSlot[] = ["after_intro", "middle", "end"];

describe("planCtaSlots", () => {
  it("nakon uvoda stoji prije drugog podnaslova ##", () => {
    // 0:p 1:h2 2:p 3:h2 4:p 5:h2 6:p
    expect(plan(["p", "h2", "p", "h2", "p", "h2", "p"], ["after_intro"])).toEqual({ after_intro: 3 });
  });

  it("bez dva podnaslova stoji nakon drugog odlomka", () => {
    expect(plan(["p", "p", "p", "p"], ["after_intro"])).toEqual({ after_intro: 2 });
    expect(plan(["p", "h2", "p", "p"], ["after_intro"])).toEqual({ after_intro: 3 });
    // Podnaslovi razine 3 se za ovo mjesto ne broje.
    expect(plan(["p", "h3", "p", "h3", "p"], ["after_intro"])).toEqual({ after_intro: 3 });
  });

  it("popis ili tablica iza drugog odlomka ostaju uz njega", () => {
    expect(plan(["p", "p", "o", "o", "p"], ["after_intro"])).toEqual({ after_intro: 4 });
  });

  it("nikad ne stoji prije kraja uvodnog odlomka", () => {
    // Tekst počinje s dva podnaslova zaredom: drugi ## je prije prvog odlomka.
    expect(plan(["h2", "h2", "p", "p", "p"], ["after_intro"])).toEqual({ after_intro: 4 });
    expect(plan(["p"], ["after_intro", "middle"])).toEqual({});
    expect(plan(["h2"], ["after_intro", "middle"])).toEqual({});
  });

  it("sredina stoji prije podnaslova najbližeg sredini teksta", () => {
    // Sredina je na 450; podnaslovi su na 100, 300, 500 i 700.
    expect(plan(["p", "h2", "p", "h2", "p", "h2", "p", "h2", "p"], ["middle"])).toEqual({ middle: 5 });
    // Pri jednakoj udaljenosti ostaje raniji podnaslov (sredina 350; podnaslovi na 300 i 400).
    expect(plan(["p", "p", "p", "h2", "h2", "p", "p"], ["middle"])).toEqual({ middle: 3 });
  });

  it("sredina ne pada na isto mjesto kao sekcija nakon uvoda", () => {
    // Najbliži sredini je drugi ## (na 300), ali tamo već stoji sekcija nakon uvoda.
    expect(plan(["p", "h2", "p", "h2", "p", "h2", "p"], ["after_intro", "middle"])).toEqual({
      after_intro: 3,
      middle: 5,
    });
    // Kratak tekst s dva podnaslova: za sredinu više nema podnaslova, pa se ne prikazuje.
    expect(plan(["p", "h2", "p", "h2", "p"], ALL)).toEqual({ after_intro: 3, end: 5 });
  });

  it("sredina gleda podnaslove ###, kad ## nema, a bez podnaslova granicu odlomka", () => {
    expect(plan(["p", "h3", "p", "h3", "p", "h3", "p"], ["middle"])).toEqual({ middle: 3 });
    expect(plan(["p", "p", "p", "p", "p", "p"], ["middle"])).toEqual({ middle: 3 });
    // Odlomak odmah iza naslova nije mjesto: naslov ostaje uz svoj tekst.
    expect(plan(["p", "h1", "p", "p"], ["middle"])).toEqual({ middle: 3 });
  });

  it("kraj je iza zadnjeg bloka, a druga mjesta mu ne smiju biti susjedna", () => {
    expect(plan(["p", "p", "p"], ["end"])).toEqual({ end: 3 });
    // Dva odlomka: „nakon drugog odlomka" je isto što i kraj, pa ostaje samo kraj.
    expect(plan(["p", "p"], ALL)).toEqual({ end: 2 });
    expect(plan(["p", "p"], ["after_intro"])).toEqual({ after_intro: 2 });
  });

  it("vraća mjesta redom kojim se pojavljuju u tekstu i ništa za prazan tekst", () => {
    const list = blocks("p", "h2", "p", "h2", "p", "h2", "p", "h2", "p");
    expect(planCtaSlots(list, 900, ["end", "middle", "after_intro"])).toEqual([
      { slot: "after_intro", before: 3 },
      { slot: "middle", before: 5 },
      { slot: "end", before: 9 },
    ]);
    expect(planCtaSlots([], 0, ALL)).toEqual([]);
  });
});

/** Tekst prolazi isti put kao na stranici; oznake mjesta ostaju vidljive kao <aside data-cta-slot>. */
function render(markdown: string, slots: CtaSlot[]): string {
  return renderToStaticMarkup(
    createElement(Markdown, { remarkPlugins: [remarkGfm, [remarkCtaSlots, { slots }]] }, markdown),
  );
}

function order(html: string, ...needles: string[]): boolean {
  let from = 0;
  for (const needle of needles) {
    const at = html.indexOf(needle, from);
    if (at === -1) {
      return false;
    }
    from = at + needle.length;
  }
  return true;
}

const ARTICLE = [
  "Uvodni odlomak.",
  "## Prvi dio",
  "Tekst prvog dijela.",
  "## Drugi dio",
  "Tekst drugog dijela.",
  "## Treći dio",
  "Tekst trećeg dijela.",
  "## Četvrti dio",
  "Tekst četvrtog dijela.",
].join("\n\n");

describe("remarkCtaSlots (stvarni Markdown)", () => {
  const afterIntro = '<aside data-cta-slot="after_intro"></aside>';
  const middle = '<aside data-cta-slot="middle"></aside>';

  it("umeće sekcije između dijelova teksta", () => {
    const html = render(ARTICLE, ALL);
    expect(
      order(html, "<h2>Prvi dio</h2>", "Tekst prvog dijela.", afterIntro, "<h2>Drugi dio</h2>", middle, "<h2>Treći dio</h2>"),
    ).toBe(true);
    // Kraj se prikazuje ispod teksta, izvan Markdowna.
    expect(html).not.toContain('data-cta-slot="end"');
  });

  it("ne umeće ništa kad članak nema dodijeljenih sekcija", () => {
    expect(render(ARTICLE, [])).not.toContain("data-cta-slot");
  });

  it("ne prekida uvodni odlomak, popis ni blok koda", () => {
    const markdown = [
      "Prvi odlomak.",
      "Drugi odlomak s popisom:",
      "- jedan\n\n- dva\n\n- tri",
      "```\n## nije naslov\n\n## ni ovo\n```",
      "Treći odlomak.",
    ].join("\n\n");
    const html = render(markdown, ["after_intro"]);
    // Rahli popis ostaje jedan popis, a „##" u bloku koda nije podnaslov.
    expect(html.match(/<ul>/g)).toHaveLength(1);
    expect(html).not.toContain("<h2>");
    expect(order(html, "</ul>", "</pre>", afterIntro, "<p>Treći odlomak.</p>")).toBe(true);
    expect(html.indexOf(afterIntro)).toBeGreaterThan(html.indexOf("Prvi odlomak."));
  });

  it("bilješke i poveznice po oznaci rade preko mjesta sekcije", () => {
    const markdown = [
      "Uvod s bilješkom[^1] i [poveznicom][izvor].",
      "Drugi odlomak.",
      "Treći odlomak.",
      "[^1]: Tekst bilješke.",
      "[izvor]: https://example.org/izvor",
    ].join("\n\n");
    const html = render(markdown, ["after_intro"]);
    expect(html).toContain('<a href="https://example.org/izvor">poveznicom</a>');
    expect(html.match(/data-footnotes/g)).toHaveLength(1);
    expect(order(html, "Drugi odlomak.", afterIntro, "Treći odlomak.", "Tekst bilješke.")).toBe(true);
  });

  it("HTML iz teksta se ne izvršava", () => {
    const html = render('Odlomak.\n\n<script>alert(1)</script>\n\n<aside data-cta-slot="end">x</aside>', ALL);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<aside");
  });
});

describe("adresa članka", () => {
  it("prevodi hrvatska slova kao baza", () => {
    expect(slugify("Čežnja, šuma i žeđ: đak Ćiro")).toBe("ceznja-suma-i-zed-dak-ciro");
    expect(slugify("  Što učiniti kad ljubimac ugine?  ")).toBe("sto-uciniti-kad-ljubimac-ugine");
    expect(slugify("Kremiranje — cijene 2026. (Zagreb/Split)")).toBe("kremiranje-cijene-2026-zagreb-split");
    expect(slugify("ČĆŽŠĐ")).toBe("cczsd");
    expect(slugify("---")).toBe("");
  });

  it("daje isti rezultat kao funkcija slugify u bazi", async () => {
    const samples = [
      "Čežnja, šuma i žeđ: đak Ćiro",
      "Što učiniti kad ljubimac ugine?",
      "ÉCOLE über señor  --  100% & više",
      "Eutanazija psa: kada je vrijeme",
      "  rubovi  ",
    ];
    for (const sample of samples) {
      const { data, error } = await admin.rpc("slugify", { p: sample });
      expect(error).toBeNull();
      expect(slugify(sample), sample).toBe(data);
    }
  });

  it("slovo zapisano s odvojenom kvačicom daje isto što i spojeno", () => {
    expect(slugify("čas")).toBe("cas");
  });

  it("prijedlog stane u ograničenje baze i ne završava crticom", () => {
    const long = Array.from({ length: 40 }, (_, index) => `rijec${index}`).join(" ");
    const slug = suggestSlug(long);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(isValidSlug(slug)).toBe(true);
    expect(long.split(" ").map((word) => slugify(word))).toContain(slug.split("-").at(-1));
    expect(suggestSlug("Kratki naslov")).toBe("kratki-naslov");
  });

  it("prepoznaje valjanu adresu", () => {
    expect(isValidSlug("kako-se-oprostiti-2")).toBe(true);
    for (const bad of ["", "Veliko", "dva--crtice", "-rub", "rub-", "raz mak", "šuma", "a".repeat(SLUG_MAX + 1)]) {
      expect(isValidSlug(bad), bad).toBe(false);
    }
  });
});

describe("atribucija prodajne sekcije", () => {
  it("dodaje oznaku članka i sekcije", () => {
    expect(buildCtaHref("/izradi", "kako-se-oprostiti", "besplatni-spomen")).toBe(
      "/izradi?iz=kako-se-oprostiti&cta=besplatni-spomen",
    );
  });

  it("čuva postojeći upit i sidro", () => {
    expect(buildCtaHref("/cjenik?paket=memorijal#paketi", "clanak", "sekcija")).toBe(
      "/cjenik?paket=memorijal&iz=clanak&cta=sekcija#paketi",
    );
    expect(buildCtaHref("/poklon?utm_source=a%20b&x=%C5%A1", "clanak", "sekcija")).toBe(
      "/poklon?utm_source=a+b&x=%C5%A1&iz=clanak&cta=sekcija",
    );
  });

  it("zamjenjuje oznake koje su već u odredištu, ne udvostručuje ih", () => {
    const href = buildCtaHref("/izradi?iz=stari&cta=stara&utm_medium=clanak", "novi", "nova");
    const params = new URL(href, "https://tragsape.test").searchParams;
    expect(params.getAll("iz")).toEqual(["novi"]);
    expect(params.getAll("cta")).toEqual(["nova"]);
    expect(params.get("utm_medium")).toBe("clanak");
  });

  it("odredište izvan stranice zamjenjuje izradom spomena", () => {
    for (const target of ["//zlo.example/izradi", "https://zlo.example", "/\\zlo.example", "javascript:alert(1)", "", "/a b"]) {
      expect(isInternalPath(target), target).toBe(false);
      expect(buildCtaHref(target, "clanak", "sekcija"), target).toBe("/izradi?iz=clanak&cta=sekcija");
    }
    expect(isInternalPath("/izradi")).toBe(true);
  });
});

describe("tijek objave", () => {
  const state = (overrides: Partial<ReviewState> = {}): ReviewState => ({
    status: "draft",
    needsVetReview: false,
    vetReviewedAt: null,
    ownerApprovedAt: null,
    ...overrides,
  });
  const reviewedAt = "2026-11-20T10:00:00.000Z";
  const approvedAt = "2026-11-21T10:00:00.000Z";

  it("nudi samo sljedeći dopušteni korak", () => {
    expect(allowedIntents(state())).toEqual(["submit_review"]);
    expect(allowedIntents(state({ status: "in_review" }))).toEqual(["approve"]);
    expect(allowedIntents(state({ status: "approved", ownerApprovedAt: approvedAt }))).toEqual(["publish"]);
    expect(allowedIntents(state({ status: "published", ownerApprovedAt: approvedAt }))).toEqual(["unpublish"]);
    expect(allowedIntents(state({ status: "archived" }))).toEqual(["to_draft"]);
  });

  it("zdravstveni članak se ne može odobriti dok pregled veterinara nije upisan", () => {
    const waiting = state({ status: "in_review", needsVetReview: true });
    expect(allowedIntents(waiting)).toEqual(["vet_review"]);
    expect(publishBlocker(waiting)).toBe("vet_missing");
    const reviewed = state({ status: "in_review", needsVetReview: true, vetReviewedAt: reviewedAt });
    expect(allowedIntents(reviewed)).toEqual(["vet_review", "approve"]);
    expect(publishBlocker(reviewed)).toBe("not_approved");
  });

  it("objava traži odobrenje, a zdravstvenom članku i pregled", () => {
    expect(publishBlocker(state({ status: "approved", ownerApprovedAt: approvedAt }))).toBeNull();
    // Označen kao odobren, a odobrenja nema: nudi se odobrenje, ne objava.
    expect(publishBlocker(state({ status: "approved" }))).toBe("not_approved");
    expect(allowedIntents(state({ status: "approved" }))).toEqual(["approve"]);
    const unreviewed = state({ status: "approved", needsVetReview: true, ownerApprovedAt: approvedAt });
    expect(publishBlocker(unreviewed)).toBe("vet_missing");
    expect(allowedIntents(unreviewed)).toEqual([]);
  });

  it("poslužitelj dopušta korak samo iz pravog stanja, a o samoj objavi odlučuje baza", () => {
    expect(intentPermitted(state(), "submit_review")).toBe(true);
    expect(intentPermitted(state(), "publish")).toBe(false);
    expect(intentPermitted(state({ status: "in_review" }), "publish")).toBe(false);
    expect(intentPermitted(state({ status: "published", ownerApprovedAt: approvedAt }), "approve")).toBe(false);
    // Objava se iz stanja „odobreno" uvijek smije pokušati; odbije li je baza, sučelje to javlja.
    expect(intentPermitted(state({ status: "approved" }), "publish")).toBe(true);
    expect(intentPermitted(state({ status: "approved" }), "approve")).toBe(true);
    expect(intentPermitted(state({ status: "approved", ownerApprovedAt: approvedAt }), "approve")).toBe(false);
  });

  it("izmjena teksta objavljenog zdravstvenog članka briše pregled i odobrenje i vraća ga na pregled", () => {
    const published = state({
      status: "published",
      needsVetReview: true,
      vetReviewedAt: reviewedAt,
      ownerApprovedAt: approvedAt,
    });
    const effect = reviewAfterEdit(published, { needsVetReview: true, contentChanged: true });
    expect(effect).toEqual({ status: "in_review", clearVetReview: true, clearOwnerApproval: true });
    expect(editNeedsConfirmation(published, effect)).toBe(true);

    const approved = { ...published, status: "approved" as const };
    expect(reviewAfterEdit(approved, { needsVetReview: true, contentChanged: true }).status).toBe("in_review");
  });

  it("izmjena koja ne dira pregledani tekst ne mijenja ništa", () => {
    const published = state({
      status: "published",
      needsVetReview: true,
      vetReviewedAt: reviewedAt,
      ownerApprovedAt: approvedAt,
    });
    const effect = reviewAfterEdit(published, { needsVetReview: true, contentChanged: false });
    expect(effect).toEqual({ status: "published", clearVetReview: false, clearOwnerApproval: false });
    expect(editNeedsConfirmation(published, effect)).toBe(false);
  });

  it("članak kojem pregled ne treba ostaje objavljen i nakon izmjene teksta", () => {
    const published = state({ status: "published", ownerApprovedAt: approvedAt });
    const effect = reviewAfterEdit(published, { needsVetReview: false, contentChanged: true });
    expect(effect).toEqual({ status: "published", clearVetReview: false, clearOwnerApproval: false });
    expect(editNeedsConfirmation(published, effect)).toBe(false);
  });

  it("pregled vrijedi za točno onaj tekst: izmjena ga briše i dok je članak na pregledu", () => {
    const inReview = state({ status: "in_review", needsVetReview: true, vetReviewedAt: reviewedAt });
    const effect = reviewAfterEdit(inReview, { needsVetReview: true, contentChanged: true });
    expect(effect).toEqual({ status: "in_review", clearVetReview: true, clearOwnerApproval: false });
    expect(editNeedsConfirmation(inReview, effect)).toBe(true);
  });

  it("objavljeni članak naknadno označen kao zdravstveni vraća se na pregled", () => {
    const published = state({ status: "published", ownerApprovedAt: approvedAt });
    const effect = reviewAfterEdit(published, { needsVetReview: true, contentChanged: false });
    expect(effect).toEqual({ status: "in_review", clearVetReview: false, clearOwnerApproval: true });
  });

  it("prepoznaje izmjenu pregledanog sadržaja, ali ne i razliku u prazninama", () => {
    const source = { claim: "Cijena", title: "Cjenik", url: "https://example.org", publisher: null, accessedOn: "2026-11-25" };
    const saved = { title: "Naslov", excerpt: null, bodyMd: "Tekst.\n", sources: [source] };
    expect(reviewedContentChanged(saved, { ...saved, title: " Naslov ", excerpt: "", bodyMd: "\r\nTekst.  \r\n" })).toBe(false);
    expect(reviewedContentChanged(saved, { ...saved, bodyMd: "Tekst. Novo." })).toBe(true);
    expect(reviewedContentChanged(saved, { ...saved, excerpt: "Sažetak" })).toBe(true);
    expect(reviewedContentChanged(saved, { ...saved, sources: [] })).toBe(true);
    expect(reviewedContentChanged(saved, { ...saved, sources: [{ ...source, accessedOn: "2026-11-26" }] })).toBe(true);
    expect(cleanBody("\n\n    kod\r\nred  \n\n")).toBe("    kod\nred");
  });
});

describe("obrasci admina", () => {
  function articleForm(overrides: Record<string, string> = {}): FormData {
    const form = new FormData();
    const fields: Record<string, string> = {
      title: "  Kako se oprostiti  ",
      slug: "kako-se-oprostiti",
      cluster: "tugovanje",
      excerpt: "",
      body_md: "Prvi red.\r\n\r\nDrugi red.\r\n",
      seo_title: "",
      seo_description: "",
      sources_json: "[]",
      cta_after_intro: "besplatni-spomen",
      cta_middle: "",
      cta_end: "",
      ...overrides,
    };
    for (const [name, value] of Object.entries(fields)) {
      form.set(name, value);
    }
    return form;
  }

  it("čisti i prihvaća ispravan članak", () => {
    const sourceId = crypto.randomUUID();
    const parsed = parseArticleForm(
      articleForm({
        needs_vet_review: "on",
        sources_json: JSON.stringify([
          { id: sourceId, claim: " ", title: " Cjenik ", url: "https://example.org/cjenik", publisher: "", accessedOn: "2026-11-25" },
        ]),
      }),
      "2026-11-25",
    );
    expect(parsed).toEqual({
      ok: true,
      values: {
        title: "Kako se oprostiti",
        slug: "kako-se-oprostiti",
        cluster: "tugovanje",
        excerpt: null,
        bodyMd: "Prvi red.\n\nDrugi red.",
        seoTitle: null,
        seoDescription: null,
        needsVetReview: true,
        sources: [
          { id: sourceId, claim: null, title: "Cjenik", url: "https://example.org/cjenik", publisher: null, accessedOn: "2026-11-25" },
        ],
        cta: { after_intro: "besplatni-spomen", middle: null, end: null },
      },
    });
  });

  it("odbija izvor bez naslova, bez prave adrese ili s datumom u budućnosti", () => {
    const parsed = parseArticleForm(
      articleForm({
        title: "",
        slug: "Nije Adresa",
        cluster: "nepoznato",
        sources_json: JSON.stringify([
          { id: "a", claim: "", title: "", url: "javascript:alert(1)", publisher: "", accessedOn: "2026-11-25" },
          { id: "b", claim: "", title: "Sutra", url: "https://example.org", publisher: "", accessedOn: "2026-11-26" },
          { id: "c", claim: "", title: "Dobar", url: "http://example.org", publisher: "", accessedOn: "2026-02-30" },
        ]),
      }),
      "2026-11-25",
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(Object.keys(parsed.errors).sort()).toEqual(["cluster", "form", "slug", "sourceRows", "title"]);
      expect(Object.keys(parsed.errors.sourceRows?.a ?? {}).sort()).toEqual(["title", "url"]);
      expect(Object.keys(parsed.errors.sourceRows?.b ?? {})).toEqual(["accessedOn"]);
      expect(Object.keys(parsed.errors.sourceRows?.c ?? {})).toEqual(["accessedOn"]);
    }
  });

  it("odbija pokvaren popis izvora umjesto da ga tiho izbriše", () => {
    const parsed = parseArticleForm(articleForm({ sources_json: "{" }), "2026-11-25");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.sources).toBeDefined();
    }
  });

  it("prodajna sekcija: odredište mora biti putanja unutar stranice, a ključ se pri izmjeni ne čita iz obrasca", () => {
    const form = new FormData();
    form.set("key", "pokusaj-promjene");
    form.set("heading", "Mjesto gdje sjećanje ostaje");
    form.set("body", "");
    form.set("button_label", "Izradi spomen");
    form.set("target", "/izradi");
    form.set("variant", "mint");
    form.set("active", "on");
    expect(parseCtaBlockForm(form, "besplatni-spomen")).toEqual({
      ok: true,
      values: {
        key: "besplatni-spomen",
        heading: "Mjesto gdje sjećanje ostaje",
        body: null,
        buttonLabel: "Izradi spomen",
        target: "/izradi",
        variant: "mint",
        active: true,
      },
    });

    form.set("target", "https://zlo.example");
    form.set("variant", "crvena");
    form.set("key", "Nije Ključ");
    const invalid = parseCtaBlockForm(form, null);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(Object.keys(invalid.errors).sort()).toEqual(["form", "key", "target", "variant"]);
    }
  });
});

describe("povezani članci", () => {
  it("bira najviše tri objavljena iz iste teme, bez samog članka", () => {
    const summary = (id: string, cluster: ArticleSummary["cluster"]): ArticleSummary => ({
      id,
      slug: id,
      cluster,
      title: id,
      excerpt: null,
      publishedAt: null,
      animals: [],
    });
    const all = [
      summary("a", "tugovanje"),
      summary("b", "nakon-smrti"),
      summary("c", "tugovanje"),
      summary("d", "tugovanje"),
      summary("e", "tugovanje"),
      summary("f", "tugovanje"),
    ];
    expect(pickRelated(all, { id: "c", cluster: "tugovanje" }).map((article) => article.id)).toEqual(["a", "d", "e"]);
    expect(pickRelated(all, { id: "b", cluster: "nakon-smrti" })).toEqual([]);
  });
});
