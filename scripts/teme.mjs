#!/usr/bin/env node
// Popis tema iz content/teme.txt: koje su napisane, a koje su sljedeće na redu.
//   node scripts/teme.mjs            sažetak
//   node scripts/teme.mjs --next 30  sljedećih 30 nenapisanih (adresa|tema|zdravstvena|naslov)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP = { č: "c", ć: "c", ž: "z", š: "s", đ: "d" };

export function slugOf(title) {
  return title
    .toLowerCase()
    .replace(/[čćžšđ]/g, (char) => MAP[char])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 8)
    .join("-")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

const topics = readFileSync(join(ROOT, "content", "teme.txt"), "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "" && !line.startsWith("#"))
  .map((line) => {
    const [cluster, vet, ...rest] = line.split("|");
    const title = rest.join("|").trim();
    return { cluster, vet: vet === "1", title, slug: slugOf(title) };
  });

const seen = new Set();
for (const topic of topics) {
  if (seen.has(topic.slug)) {
    console.error(`Dvostruka adresa: ${topic.slug}`);
    process.exitCode = 1;
  }
  seen.add(topic.slug);
}

const pending = topics.filter((topic) => !existsSync(join(ROOT, "content", "clanci", `${topic.slug}.md`)));
const nextAt = process.argv.indexOf("--next");
if (nextAt !== -1) {
  const count = Number(process.argv[nextAt + 1] ?? 10);
  for (const topic of pending.slice(0, count)) {
    console.log(`${topic.slug}|${topic.cluster}|${topic.vet ? "zdravstvena" : "opća"}|${topic.title}`);
  }
} else {
  console.log(`Tema: ${topics.length} | napisano: ${topics.length - pending.length} | preostalo: ${pending.length}`);
}
