/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Dimni test cijelog besplatnog toka u pregledniku, nad lokalnim okruženjem:
 * nacrt bez računa → fotografije → kod iz e-maila → objava → svijeća → poruka → moderacija
 * → kartice za dijeljenje → privatnost „samo s poveznicom".
 *
 * Preduvjeti: `npx supabase start`, `npm run dev` (ili `npm run start`) i Playwright s
 * Chromiumom. Pokretanje: `npm run smoke`. Adrese se mogu promijeniti varijablama
 * SMOKE_BASE_URL, MAILPIT_URL, NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SECRET_KEY.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");

for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}

const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const mailpit = process.env.MAILPIT_URL || "http://127.0.0.1:54324";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = `dimni-${Date.now()}@test.tragsape.local`;
const steps = [];
const ok = (name) => {
  steps.push(name);
  console.log("  ✓", name);
};

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/** Testna „fotografija": jednostavan crtež, ne tuđa slika. */
async function makePhoto(file, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1600" height="1600"><rect width="400" height="400" fill="#CDEAE6"/><circle cx="296" cy="100" r="40" fill="#F8B93B"/><path d="M0 300C110 260 230 300 400 270V400H0Z" fill="#7DB58B"/><ellipse cx="200" cy="200" rx="80" ry="78" fill="#E2A857"/><circle cx="170" cy="190" r="8" fill="#3A2A22"/><circle cx="230" cy="190" r="8" fill="#3A2A22"/></svg>`;
  await sharp(Buffer.from(svg)).modulate({ hue }).jpeg({ quality: 90 }).toFile(file);
}

async function codeFor(address) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await (await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent("to:" + address)}`)).json();
    if (list.messages && list.messages.length > 0) {
      const message = await (await fetch(`${mailpit}/api/v1/message/${list.messages[0].ID}`)).json();
      const code = /\b(\d{6})\b/.exec(message.Text || "");
      if (code) {
        return code[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Kod iz e-maila nije stigao u Mailpit.");
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trag-sape-dimni-"));
  const photos = [path.join(dir, "a.jpg"), path.join(dir, "b.jpg")];
  await makePhoto(photos[0], 0);
  await makePhoto(photos[1], 60);

  const browser = await chromium.launch();
  const options = { viewport: { width: 390, height: 844 }, locale: "hr-HR" };
  const quiet = (context) =>
    context.addInitScript(() => {
      try {
        localStorage.setItem("trag-sape-kolacici", "1");
      } catch {}
    });
  const errors = [];
  const watch = (page, who) => {
    page.on("pageerror", (error) => errors.push(`${who}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`${who}: ${message.text().slice(0, 300)}`);
      }
    });
  };

  // --- vlasnik: izrada bez računa
  const ownerContext = await browser.newContext(options);
  await quiet(ownerContext);
  const owner = await ownerContext.newPage();
  watch(owner, "vlasnik");
  await owner.goto(`${base}/izradi`, { waitUntil: "networkidle" });
  await owner.fill("#name", "Žućo Đurđević");
  await owner.selectOption("#species", "pas");
  await owner.fill("#breed", "mješanac");
  await owner.fill('input[name="birth_year"]', "2011");
  await owner.fill('input[name="death_day"]', "2");
  await owner.selectOption('select[name="death_month"]', "10");
  await owner.fill('input[name="death_year"]', "2026");
  await owner.click('button[type="submit"]');
  await owner.waitForURL(/\/izradi\/[0-9a-f-]{36}\/prica/, { timeout: 60000 });
  ok("nacrt bez računa");

  await owner.setInputFiles("#photo-input", photos);
  await owner.waitForFunction(() => document.querySelectorAll("ul li img").length === 2, null, { timeout: 60000 });
  await owner.fill("#dedication", "Čuvao si nam kuću, cipele i sve tajne. Hvala ti na svakom dočeku na vratima.");
  await owner.fill("#traits", "nježan, tvrdoglav oko šetnje");
  ok("dvije fotografije i posveta");

  await owner.click('button:has-text("Na pregled")');
  await owner.waitForURL(/\/pregled/, { timeout: 60000 });
  await owner.waitForSelector("#email", { timeout: 60000 });
  await owner.fill("#email", email);
  await owner.click('button:has-text("Pošalji mi kod")');
  await owner.waitForSelector("#code", { timeout: 30000 });
  await owner.fill("#code", await codeFor(email));
  await owner.click('button:has-text("Potvrdi")');
  await owner.waitForSelector('button:has-text("Objavi besplatno")', { timeout: 60000 });
  ok("potvrda e-maila kodom");

  await owner.click('button:has-text("Objavi besplatno")');
  await owner.waitForURL(/\/spomen\/.+objavljeno=1/, { timeout: 60000 });
  const publicUrl = owner.url().split("?")[0];
  const slug = publicUrl.split("/spomen/")[1];
  expect(/^zuco-durdevic-[a-f0-9]{6}$/.test(slug), `neočekivana adresa: ${slug}`);
  ok(`objava na /spomen/${slug}`);

  // --- posjetitelj
  const visitorContext = await browser.newContext(options);
  await quiet(visitorContext);
  const visitor = await visitorContext.newPage();
  watch(visitor, "posjetitelj");
  await visitor.goto(publicUrl, { waitUntil: "domcontentloaded" });
  await visitor.waitForSelector("h1");
  expect((await visitor.locator("text=Ovo je tvoj spomen").count()) === 0, "posjetitelj vidi traku vlasnika");
  await visitor.waitForSelector('button:has-text("Zapali svijeću"):not([disabled])', { timeout: 30000 });
  await visitor.click('button:has-text("Zapali svijeću")');
  await visitor.waitForSelector('button:has-text("Svijeća gori")', { timeout: 30000 });
  ok("dnevna svijeća");

  await visitor.fill("#gb-name", "Ivana, susjeda");
  await visitor.fill("#gb-message", "Uvijek je prvi dotrčao do ograde.");
  await visitor.waitForTimeout(3300);
  await visitor.waitForSelector('button:has-text("Pošalji poruku"):not([disabled])', { timeout: 30000 });
  await visitor.click('button:has-text("Pošalji poruku")');
  await visitor.waitForSelector("text=Poruka će se prikazati kad je vlasnik odobri", { timeout: 30000 });
  await visitor.reload({ waitUntil: "domcontentloaded" });
  await visitor.waitForSelector("h1");
  expect((await visitor.locator("text=Uvijek je prvi dotrčao").count()) === 0, "poruka je vidljiva prije odobrenja");
  ok("poruka čeka odobrenje");

  await owner.goto(`${base}/moji-ljubimci`, { waitUntil: "domcontentloaded" });
  await owner.click("text=Upravljaj");
  await owner.waitForSelector("text=Čeka odobrenje", { timeout: 60000 });
  await owner.click('button:has-text("Odobri")');
  await owner.waitForTimeout(1500);
  await visitor.goto(publicUrl, { waitUntil: "domcontentloaded" });
  await visitor.waitForSelector("text=Uvijek je prvi dotrčao", { timeout: 30000 });
  ok("vlasnik odobrava, poruka postaje javna");

  for (const cardPath of [`/spomen/${slug}/opengraph-image`, `/kartica/${slug}/story`, `/kartica/${slug}/objava`]) {
    const response = await fetch(base + cardPath);
    expect(response.status === 200 && response.headers.get("content-type") === "image/png", `kartica ${cardPath}`);
  }
  ok("kartice za dijeljenje");

  // --- privatnost (paket ovdje postavlja servisna uloga, kao što bi nakon plaćanja webhook)
  if (supabaseUrl && secretKey) {
    const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
    const rows = await (await fetch(`${supabaseUrl}/rest/v1/memorials?slug=eq.${slug}&select=id`, { headers })).json();
    const id = rows[0].id;
    await fetch(`${supabaseUrl}/rest/v1/memorials?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ tier: "memorial" }) });
    await owner.goto(`${base}/moji-ljubimci/${id}`, { waitUntil: "domcontentloaded" });
    await owner.check('input[name="visibility"][value="unlisted"]');
    await owner.click('button:has-text("Spremi privatnost")');
    await owner.waitForSelector("text=Poveznica za dijeljenje", { timeout: 30000 });
    const sharePath = /\/s\/[a-f0-9]{32}/.exec(await owner.locator("text=/\\/s\\/[a-f0-9]{32}/").first().innerText())[0];
    await visitor.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await visitor.waitForSelector("text=Ove stranice nema", { timeout: 30000 });
    await visitor.goto(base + sharePath, { waitUntil: "domcontentloaded" });
    await visitor.waitForSelector("h1:has-text('Žućo')", { timeout: 30000 });
    const image = await visitor.locator("img").first().getAttribute("src");
    expect((await fetch(base + image)).status === 200, "slika s ključem nije dostupna");
    expect((await fetch(base + image.split("?")[0])).status === 404, "slika je dostupna bez ključa");
    expect((await fetch(`${base}/spomen/${slug}/opengraph-image`)).status === 404, "OG slika postoji za nejavni spomen");
    ok("„samo s poveznicom”: javna adresa i slike zatvorene, ključ otvara");

    await owner.fill("#confirm-delete", "Žućo Đurđević");
    await owner.click('button:has-text("Trajno obriši spomen")');
    await owner.waitForURL(/\/moji-ljubimci$/, { timeout: 30000 });
    ok("brisanje spomena");
  }

  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  expect(errors.length === 0, `greške u pregledniku:\n${errors.join("\n")}`);
  console.log(`\nDimni test prošao (${steps.length} koraka).`);
}

main().catch((error) => {
  console.error("\nDimni test NIJE prošao:", error.message);
  process.exit(1);
});
