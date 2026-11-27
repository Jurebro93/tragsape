#!/usr/bin/env node
// Učitava nacrte članaka iz content/clanci/*.md u bazu (tablice articles, article_sources, article_cta).
//
//   node scripts/seed-articles.mjs --check   samo provjera datoteka, bez baze
//   node scripts/seed-articles.mjs           provjera pa upis u bazu
//
// Pravila:
// - Novi članak ulazi sa statusom `in_review`.
// - Postojeći članak mijenja se SAMO ako mu je status `draft` ili `in_review`; odobreni,
//   objavljeni i arhivirani se preskaču.
// - Skripta nikad ne postavlja `owner_approved_at`, `vet_reviewed_*` ni status `published`.
// - Izvori i mjesta prodajnih sekcija članka zamjenjuju se onima iz datoteke.
// - Bilo koja pogreška u provjeri prekida rad prije ikakvog upisa i vraća izlazni kod 1.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content", "clanci");
const ENV_FILE = join(ROOT, ".env.local");

// Granice iz migracije 20261126000000_admin_sadrzaj_podsjetnici.sql (ograničenja CHECK).
const CLUSTERS = ["zdravlje", "kraj-zivota", "nakon-smrti", "tugovanje", "prigodni-datumi"];
const CTA_SLOTS = ["after_intro", "middle", "end"];
const KNOWN_CTA_KEYS = ["besplatni-spomen", "pogledaj-primjer", "poklon"];
const TOOL_PATHS = [
  "/alati/psece-godine",
  "/alati/macje-godine",
  "/alati/posveta",
  "/alati/sucut",
  "/alati/oprostaj",
  // Stranice proizvoda na koje članak smije voditi.
  "/izradi",
  "/primjer",
  "/livada",
  "/cjenik",
  "/poklon",
  "/alati",
  "/vodic",
];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LIMITS = {
  slug: 120,
  title: 160,
  excerpt: 400,
  seoTitle: 160,
  seoDescription: 320,
  sourceClaim: 400,
  sourceTitle: 240,
  sourceUrl: 600,
  sourcePublisher: 160,
};
// Preporuke za tražilice: prekoračenje je upozorenje, ne pogreška.
const SEO_TITLE_IDEAL = 60;
const SEO_DESCRIPTION_IDEAL = 155;
const EDITABLE_STATUSES = ["draft", "in_review"];
const ARTICLE_KEYS = ["slug", "cluster", "title", "excerpt", "seo_title", "seo_description", "needs_vet_review", "cta", "sources"];
const SOURCE_KEYS = ["claim", "title", "url", "publisher", "accessed_on"];

class ParseError extends Error {}

// ---------------------------------------------------------------------------------------------
// Front matter: strogi, redak po redak, samo oblik koji koriste članci.
// ---------------------------------------------------------------------------------------------

/** Vrijednost iza `ključ:`: "tekst" (JSON navodnici), true/false, datum ili goli tekst. */
function parseScalar(raw, where) {
  const value = raw.trim();
  if (value === "") {
    throw new ParseError(`${where}: nedostaje vrijednost`);
  }
  if (value.startsWith('"')) {
    // Niz u dvostrukim navodnicima; iza njega smije stajati samo komentar.
    const match = /^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/.exec(value);
    if (!match) {
      throw new ParseError(`${where}: neispravan niz u navodnicima`);
    }
    try {
      return JSON.parse(match[1]);
    } catch {
      throw new ParseError(`${where}: neispravan niz u navodnicima`);
    }
  }
  const bare = value.replace(/\s+#.*$/, "").trim();
  if (bare === "true") return true;
  if (bare === "false") return false;
  if (/["'[\]{}]|:\s/.test(bare)) {
    throw new ParseError(`${where}: tekst s posebnim znakovima mora biti u dvostrukim navodnicima`);
  }
  return bare;
}

function splitKeyValue(text, where) {
  const match = /^([a-z_]+):(.*)$/.exec(text);
  if (!match) {
    throw new ParseError(`${where}: očekuje se "ključ: vrijednost"`);
  }
  return { key: match[1], rest: match[2] };
}

function parseFrontMatter(text, file) {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new ParseError("datoteka mora početi s --- (front matter)");
  }
  const end = normalized.indexOf("\n---\n", 3);
  if (end === -1) {
    throw new ParseError("front matter nije zatvoren s ---");
  }
  const lines = normalized.slice(4, end).split("\n");
  const body = normalized.slice(end + 5);
  const meta = {};
  let block = null; // "cta" | "sources"
  let currentSource = null;

  lines.forEach((line, index) => {
    const where = `${file}:${index + 2}`;
    if (line.trim() === "" || line.trim().startsWith("#")) {
      return;
    }
    if (/\t/.test(line)) {
      throw new ParseError(`${where}: tabulator nije dopušten, koristi razmake`);
    }
    const indent = line.length - line.trimStart().length;
    const content = line.trim();

    if (indent === 0) {
      const { key, rest } = splitKeyValue(content, where);
      if (!ARTICLE_KEYS.includes(key)) {
        throw new ParseError(`${where}: nepoznato polje "${key}"`);
      }
      if (key in meta) {
        throw new ParseError(`${where}: polje "${key}" navedeno je dvaput`);
      }
      currentSource = null;
      if (key === "cta" || key === "sources") {
        if (rest.replace(/\s+#.*$/, "").trim() !== "") {
          throw new ParseError(`${where}: iza "${key}:" slijede uvučeni redci, ne vrijednost`);
        }
        meta[key] = key === "cta" ? {} : [];
        block = key;
      } else {
        meta[key] = parseScalar(rest, where);
        block = null;
      }
      return;
    }

    if (block === "cta" && indent === 2) {
      const { key, rest } = splitKeyValue(content, where);
      if (key in meta.cta) {
        throw new ParseError(`${where}: mjesto "${key}" navedeno je dvaput`);
      }
      meta.cta[key] = parseScalar(rest, where);
      return;
    }

    if (block === "sources" && indent === 2 && content.startsWith("- ")) {
      currentSource = {};
      meta.sources.push(currentSource);
      const { key, rest } = splitKeyValue(content.slice(2).trim(), where);
      if (!SOURCE_KEYS.includes(key)) {
        throw new ParseError(`${where}: nepoznato polje izvora "${key}"`);
      }
      currentSource[key] = parseScalar(rest, where);
      return;
    }

    if (block === "sources" && indent === 4 && currentSource) {
      const { key, rest } = splitKeyValue(content, where);
      if (!SOURCE_KEYS.includes(key)) {
        throw new ParseError(`${where}: nepoznato polje izvora "${key}"`);
      }
      if (key in currentSource) {
        throw new ParseError(`${where}: polje izvora "${key}" navedeno je dvaput`);
      }
      currentSource[key] = parseScalar(rest, where);
      return;
    }

    throw new ParseError(`${where}: neočekivana uvlaka ili redak`);
  });

  return { meta, body };
}

// ---------------------------------------------------------------------------------------------
// Provjera
// ---------------------------------------------------------------------------------------------

/** Znakovi kako ih broji Postgresov char_length (kodne točke, ne UTF-16 jedinice). */
function charLength(value) {
  return Array.from(value).length;
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Tekst bez blokova i isječaka koda, da se u njima ne traže oznake izvora ni HTML. */
function withoutCode(body) {
  return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function countWords(body) {
  const plain = withoutCode(body)
    .replace(/\[(\d{1,3})\]/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/[#>*_|`~]+/g, " ");
  return plain.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

function requireText(errors, value, name, max) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`polje "${name}" je obavezno`);
    return false;
  }
  if (value !== value.trim()) {
    errors.push(`polje "${name}" ima praznine na početku ili kraju`);
  }
  if (charLength(value) > max) {
    errors.push(`polje "${name}" ima ${charLength(value)} znakova (najviše ${max})`);
  }
  return true;
}


/** Javni alati koji se smiju ugraditi u članak; čitaju se iz registra da popis ne zastari. */
const EMBEDDABLE_TOOLS = new Set(["psece-godine", "macje-godine", "posveta", "sucut", "oprostaj"]);
function publicToolSlugs() {
  const registry = readFileSync(join(ROOT, "src", "lib", "tools", "registry.ts"), "utf8");
  return new Set([...registry.matchAll(/slug: "([a-z0-9-]+)"[^}]*status: "public"/g)].map((match) => match[1]));
}
const CALLOUT_KINDS = ["cinjenica", "savjet", "vazno", "brojke", "alat"];

/** Okviri [!VRSTA] u tekstu: poznata vrsta, a alat mora biti javan i ugradiv. */
function validateCallouts(body, errors) {
  const tools = publicToolSlugs();
  for (const line of withoutCode(body).split("\n")) {
    const match = /^>\s*\[!([^\]]+)\]\s*(.*)$/u.exec(line);
    if (!match) continue;
    const kind = match[1].toLowerCase();
    if (!CALLOUT_KINDS.includes(kind)) {
      errors.push(`okvir [!${match[1]}] ne postoji (${CALLOUT_KINDS.map((k) => k.toUpperCase()).join(", ")})`);
    } else if (kind === "alat" && !(tools.has(match[2].trim()) && EMBEDDABLE_TOOLS.has(match[2].trim()))) {
      errors.push(`okvir [!ALAT] ${match[2].trim()}: alat nije javan ili se ne može ugraditi (${[...EMBEDDABLE_TOOLS].join(", ")})`);
    }
  }
}

function validateArticle(article, allSlugs) {
  const { meta, body, file } = article;
  const errors = [];
  const warnings = [];

  // Osnovna polja
  if (requireText(errors, meta.slug, "slug", LIMITS.slug)) {
    if (!SLUG_PATTERN.test(meta.slug)) {
      errors.push(`slug "${meta.slug}" smije imati samo mala slova, brojke i crtice`);
    }
    if (`${meta.slug}.md` !== file) {
      errors.push(`slug "${meta.slug}" ne odgovara imenu datoteke ${file}`);
    }
  }
  if (!CLUSTERS.includes(meta.cluster)) {
    errors.push(`cluster "${meta.cluster}" nije dopušten (${CLUSTERS.join(", ")})`);
  }
  requireText(errors, meta.title, "title", LIMITS.title);
  requireText(errors, meta.excerpt, "excerpt", LIMITS.excerpt);
  if (requireText(errors, meta.seo_title, "seo_title", LIMITS.seoTitle) && charLength(meta.seo_title) > SEO_TITLE_IDEAL) {
    warnings.push(`seo_title ima ${charLength(meta.seo_title)} znakova (preporuka do ${SEO_TITLE_IDEAL})`);
  }
  if (
    requireText(errors, meta.seo_description, "seo_description", LIMITS.seoDescription) &&
    charLength(meta.seo_description) > SEO_DESCRIPTION_IDEAL
  ) {
    warnings.push(`seo_description ima ${charLength(meta.seo_description)} znakova (preporuka do ${SEO_DESCRIPTION_IDEAL})`);
  }
  if (typeof meta.needs_vet_review !== "boolean") {
    errors.push('polje "needs_vet_review" mora biti true ili false');
  }

  validateCallouts(body, errors);

  // Prodajne sekcije
  const cta = meta.cta ?? {};
  for (const [slot, key] of Object.entries(cta)) {
    if (!CTA_SLOTS.includes(slot)) {
      errors.push(`cta: mjesto "${slot}" ne postoji (${CTA_SLOTS.join(", ")})`);
    }
    if (typeof key !== "string" || !KNOWN_CTA_KEYS.includes(key)) {
      errors.push(`cta: ključ "${key}" nije među poznatima (${KNOWN_CTA_KEYS.join(", ")})`);
    }
  }

  // Izvori
  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  if (sources.length === 0) {
    errors.push("članak nema nijedan izvor");
  }
  sources.forEach((source, index) => {
    const label = `izvor ${index + 1}`;
    if (typeof source.title !== "string" || source.title.trim() === "") {
      errors.push(`${label}: nedostaje title`);
    } else if (charLength(source.title) > LIMITS.sourceTitle) {
      errors.push(`${label}: title ima ${charLength(source.title)} znakova (najviše ${LIMITS.sourceTitle})`);
    }
    if (typeof source.url !== "string" || !/^https:\/\/\S+$/.test(source.url) || !URL.canParse(source.url)) {
      errors.push(`${label}: url mora biti ispravna https adresa`);
    } else if (charLength(source.url) > LIMITS.sourceUrl) {
      errors.push(`${label}: url ima ${charLength(source.url)} znakova (najviše ${LIMITS.sourceUrl})`);
    }
    if (source.claim !== undefined) {
      if (typeof source.claim !== "string" || source.claim.trim() === "") {
        errors.push(`${label}: claim je prazan`);
      } else if (charLength(source.claim) > LIMITS.sourceClaim) {
        errors.push(`${label}: claim ima ${charLength(source.claim)} znakova (najviše ${LIMITS.sourceClaim})`);
      }
    } else {
      errors.push(`${label}: nedostaje claim (što izvor potvrđuje)`);
    }
    if (source.publisher !== undefined) {
      if (typeof source.publisher !== "string" || source.publisher.trim() === "") {
        errors.push(`${label}: publisher je prazan`);
      } else if (charLength(source.publisher) > LIMITS.sourcePublisher) {
        errors.push(`${label}: publisher ima ${charLength(source.publisher)} znakova (najviše ${LIMITS.sourcePublisher})`);
      }
    }
    if (!isRealDate(source.accessed_on)) {
      errors.push(`${label}: accessed_on mora biti datum oblika GGGG-MM-DD`);
    } else if (source.accessed_on > new Date().toISOString().slice(0, 10)) {
      errors.push(`${label}: accessed_on (${source.accessed_on}) je u budućnosti`);
    }
  });
  const urls = sources.map((source) => source.url);
  urls.forEach((url, index) => {
    if (typeof url === "string" && urls.indexOf(url) !== index) {
      warnings.push(`izvor ${index + 1}: ista adresa kao izvor ${urls.indexOf(url) + 1}`);
    }
  });

  // Tekst
  const text = withoutCode(body);
  if (body.trim() === "") {
    errors.push("tekst članka je prazan");
  }
  if (/^#\s/m.test(text)) {
    errors.push("tekst ne smije imati naslov prve razine (#); naslov je zasebno polje");
  }
  if (!/^##\s/m.test(text)) {
    errors.push("tekst nema nijedan podnaslov (##)");
  }
  if (/<\/?[a-zA-Z][^>\n]*>/.test(text)) {
    errors.push("tekst sadrži HTML oznake; dopušten je samo Markdown");
  }
  if (!/^##\s+Sljedeći korak\s*$/m.test(text)) {
    errors.push('tekst nema završni odjeljak "## Sljedeći korak"');
  }

  // Oznake izvora [n] moraju odgovarati popisu izvora, u oba smjera.
  const referenced = new Set();
  for (const match of text.matchAll(/\[(\d{1,3})\](?!\()/g)) {
    const number = Number(match[1]);
    referenced.add(number);
    if (number < 1 || number > sources.length) {
      errors.push(`oznaka [${number}] u tekstu nema izvor (izvora je ${sources.length})`);
    }
  }
  sources.forEach((_, index) => {
    if (!referenced.has(index + 1)) {
      errors.push(`izvor ${index + 1} se u tekstu nigdje ne spominje oznakom [${index + 1}]`);
    }
  });

  // Unutarnje poveznice vode samo na članke iz ovog skupa i na postojeće alate.
  for (const match of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const path = match[1];
    if (path.startsWith("/vodic/")) {
      const slug = path.slice("/vodic/".length);
      if (!allSlugs.has(slug)) {
        errors.push(`poveznica ${path} vodi na članak koji ne postoji u content/clanci`);
      }
      if (slug === meta.slug) {
        errors.push(`poveznica ${path} vodi na isti članak`);
      }
    } else if (!TOOL_PATHS.includes(path)) {
      errors.push(`unutarnja poveznica ${path} nije ni /vodic/{slug} ni poznati alat`);
    }
  }
  for (const match of text.matchAll(/\]\((?!\/|https:\/\/)([^)\s]*)\)/g)) {
    errors.push(`poveznica "${match[1]}" mora biti https adresa ili unutarnja putanja`);
  }

  // Zdravlje i eutanazija: rečenica da tekst ne zamjenjuje veterinara mora biti pri vrhu.
  if (meta.needs_vet_review === true) {
    const intro = body.slice(0, 900).toLowerCase();
    if (!(intro.includes("ne zamjenjuje") && intro.includes("veterinar"))) {
      errors.push("članak za pregled veterinara mora pri vrhu reći da tekst ne zamjenjuje veterinara");
    }
  }

  const notes = [...text.matchAll(/\[PROVJERITI:[^\]]*\]/g)].map((match) => match[0]);
  if (/\[PROVJERITI(?!:)/.test(text)) {
    errors.push('bilješka uredniku mora imati oblik "[PROVJERITI: što treba provjeriti]"');
  }

  return { errors, warnings, words: countWords(body), notes };
}

function loadArticles() {
  if (!existsSync(CONTENT_DIR)) {
    throw new Error(`Mapa ${CONTENT_DIR} ne postoji.`);
  }
  const files = readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
  return files.map((file) => {
    const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
    try {
      const { meta, body } = parseFrontMatter(raw, file);
      // Kao u adminu: bez praznih redaka na početku i bez praznina na kraju.
      const cleanBody = body.replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, "");
      return { file, meta, body: cleanBody, parseError: null };
    } catch (error) {
      if (error instanceof ParseError) {
        return { file, meta: {}, body: "", parseError: error.message };
      }
      throw error;
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Baza
// ---------------------------------------------------------------------------------------------

function loadEnv() {
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
  if (names.some((name) => !process.env[name]) && existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match || !names.includes(match[1]) || process.env[match[1]]) {
        continue;
      }
      process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Nedostaju varijable okruženja: ${missing.join(", ")} (ni u okruženju ni u .env.local).`);
  }
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
}

function fail(step, error) {
  throw new Error(`${step}: ${error.message}`);
}

async function upsertArticle(supabase, article) {
  const { meta, body } = article;
  const fields = {
    cluster: meta.cluster,
    title: meta.title,
    excerpt: meta.excerpt,
    body_md: body,
    needs_vet_review: meta.needs_vet_review,
    seo_title: meta.seo_title,
    seo_description: meta.seo_description,
  };

  const existing = await supabase.from("articles").select("id, status").eq("slug", meta.slug).maybeSingle();
  if (existing.error) fail("čitanje članka", existing.error);

  let id;
  let outcome;
  if (existing.data === null) {
    const inserted = await supabase
      .from("articles")
      .insert({ slug: meta.slug, locale: "hr", status: "in_review", ...fields })
      .select("id")
      .single();
    if (inserted.error) fail("upis članka", inserted.error);
    id = inserted.data.id;
    outcome = "dodan (in_review)";
  } else if (EDITABLE_STATUSES.includes(existing.data.status)) {
    // Uvjet na status i u samom upitu: ako ga netko odobri usred rada, ne diramo ga.
    const updated = await supabase
      .from("articles")
      .update(fields)
      .eq("id", existing.data.id)
      .in("status", EDITABLE_STATUSES)
      .select("id");
    if (updated.error) fail("izmjena članka", updated.error);
    if (updated.data.length === 0) {
      return `preskočen (status se u međuvremenu promijenio)`;
    }
    id = existing.data.id;
    outcome = `osvježen (${existing.data.status})`;
  } else {
    return `preskočen (status ${existing.data.status}; odobreni, objavljeni i arhivirani se ne diraju)`;
  }

  const removedSources = await supabase.from("article_sources").delete().eq("article_id", id);
  if (removedSources.error) fail("brisanje starih izvora", removedSources.error);
  const sourceRows = meta.sources.map((source, index) => ({
    article_id: id,
    position: index + 1,
    claim: source.claim ?? null,
    title: source.title,
    url: source.url,
    publisher: source.publisher ?? null,
    accessed_on: source.accessed_on,
  }));
  const insertedSources = await supabase.from("article_sources").insert(sourceRows);
  if (insertedSources.error) fail("upis izvora", insertedSources.error);

  const removedCta = await supabase.from("article_cta").delete().eq("article_id", id);
  if (removedCta.error) fail("brisanje starih prodajnih sekcija", removedCta.error);
  const ctaRows = Object.entries(meta.cta ?? {}).map(([slot, key]) => ({ article_id: id, slot, cta_key: key }));
  if (ctaRows.length > 0) {
    const insertedCta = await supabase.from("article_cta").insert(ctaRows);
    if (insertedCta.error) fail("upis prodajnih sekcija", insertedCta.error);
  }

  return `${outcome}, izvora: ${sourceRows.length}, prodajnih sekcija: ${ctaRows.length}`;
}

// ---------------------------------------------------------------------------------------------
// Glavni tijek
// ---------------------------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--check");
  if (unknown.length > 0) {
    console.error(`Nepoznat argument: ${unknown.join(" ")}\nUpotreba: node scripts/seed-articles.mjs [--check]`);
    return 2;
  }
  const checkOnly = args.includes("--check");

  const articles = loadArticles();
  if (articles.length === 0) {
    console.error(`U ${CONTENT_DIR} nema nijedne .md datoteke.`);
    return 1;
  }
  const allSlugs = new Set(articles.map((article) => article.meta.slug).filter((slug) => typeof slug === "string"));

  let errorCount = 0;
  console.log(`Provjera ${articles.length} članaka iz content/clanci\n`);
  for (const article of articles) {
    const result = article.parseError
      ? { errors: [article.parseError], warnings: [], words: 0, notes: [] }
      : validateArticle(article, allSlugs);
    article.result = result;
    errorCount += result.errors.length;
    const mark = result.errors.length === 0 ? "OK   " : "GREŠKA";
    const flags = [
      article.meta.cluster ?? "?",
      `${result.words} riječi`,
      `izvora: ${article.meta.sources?.length ?? 0}`,
      article.meta.needs_vet_review === true ? "čeka veterinara" : null,
      Object.keys(article.meta.cta ?? {}).length > 0
        ? `cta: ${Object.entries(article.meta.cta).map(([slot, key]) => `${slot}=${key}`).join(", ")}`
        : "bez cta",
      result.notes.length > 0 ? `PROVJERITI: ${result.notes.length}` : null,
    ].filter(Boolean);
    console.log(`${mark} ${article.file}  (${flags.join(" · ")})`);
    for (const error of result.errors) console.log(`       ✗ ${error}`);
    for (const warning of result.warnings) console.log(`       ! ${warning}`);
    for (const note of result.notes) console.log(`       ? ${note}`);
  }

  const duplicates = articles
    .map((article) => article.meta.slug)
    .filter((slug, index, list) => typeof slug === "string" && list.indexOf(slug) !== index);
  if (duplicates.length > 0) {
    errorCount += duplicates.length;
    console.log(`\n✗ Isti slug u više datoteka: ${[...new Set(duplicates)].join(", ")}`);
  }

  if (errorCount > 0) {
    console.error(`\nProvjera nije prošla: ${errorCount} pogrešaka. U bazu nije upisano ništa.`);
    return 1;
  }
  console.log(`\nProvjera je prošla: ${articles.length} članaka, bez pogrešaka.`);
  if (checkOnly) {
    return 0;
  }

  const { url, key } = loadEnv();
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Ključevi prodajnih sekcija moraju postojati i u bazi (strani ključ na cta_blocks).
  const blocks = await supabase.from("cta_blocks").select("key");
  if (blocks.error) {
    console.error(`\nBaza nije dostupna ili nema tablicu cta_blocks: ${blocks.error.message}`);
    return 1;
  }
  const dbKeys = new Set(blocks.data.map((row) => row.key));
  const missingKeys = new Set();
  for (const article of articles) {
    for (const cta of Object.values(article.meta.cta ?? {})) {
      if (!dbKeys.has(cta)) missingKeys.add(cta);
    }
  }
  if (missingKeys.size > 0) {
    console.error(`\nU tablici cta_blocks nema ključeva: ${[...missingKeys].join(", ")}. U bazu nije upisano ništa.`);
    return 1;
  }

  console.log(`\nUpis u bazu (${new URL(url).host})\n`);
  let failed = 0;
  for (const article of articles) {
    try {
      const outcome = await upsertArticle(supabase, article);
      console.log(`${article.meta.slug}: ${outcome}`);
    } catch (error) {
      failed += 1;
      console.error(`${article.meta.slug}: NIJE UPISAN – ${error.message}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} članaka nije upisano.`);
    return 1;
  }
  console.log("\nGotovo. Članci čekaju pregled u adminu; ništa nije objavljeno.");
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
