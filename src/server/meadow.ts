import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { MEADOW_PETALS, MEADOW_SPECIES, type MeadowPetal, type MeadowRow, type MeadowSpecies } from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow as t } from "@/messages/hr/meadow";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";
import { createAnonClient } from "@/server/supabase/anon";
import { subscribeConfirmed } from "@/server/newsletter";

export const MEADOW_TAG = "livada-tragovi";
const PAGE = 1000;
const MAX_ROWS = 200_000;

/**
 * Svi vidljivi cvjetovi u sažetom obliku. Čita se anonimnim klijentom, pa RLS i ovlasti stupaca
 * jamče da izlaze samo javni podaci (ime, vrsta, boja, broj, datum, adresa spomena).
 */
export async function listMeadowRows(): Promise<MeadowRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(MEADOW_TAG);
  const supabase = createAnonClient();
  const rows: MeadowRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("meadow_flowers")
      .select("number, name, species, petal, memorial_slug, created_at")
      .eq("status", "visible")
      .order("number")
      .range(from, from + PAGE - 1);
    if (error) {
      throw new Error(`Livada: čitanje cvjetova: ${error.message}`);
    }
    for (const row of data) {
      if (row.number === null) continue;
      rows.push([
        row.number,
        row.name,
        Math.max(0, MEADOW_SPECIES.indexOf(row.species as MeadowSpecies)),
        Math.max(0, MEADOW_PETALS.indexOf(row.petal as MeadowPetal)),
        row.memorial_slug ?? "",
        row.created_at.slice(0, 10),
      ]);
    }
    if (data.length < PAGE) {
      break;
    }
  }
  return rows;
}

/** Koliko dana vrijedi poveznica za potvrdu; nepotvrđeni tragovi se nakon toga brišu. */
export const PENDING_DAYS = 7;

/**
 * Novi trag na čekanju: ime, vrsta, boja, e-mail i privola. Mjesto (broj) dobiva tek potvrdom iz e-maila.
 * Vraća false ako je na istu adresu u zadnja 24 sata već poslano previše potvrda.
 */
export async function createPendingFlower(input: {
  name: string;
  species: MeadowSpecies;
  petal: MeadowPetal;
  email: string;
  newsletter: boolean;
  anniversary: boolean;
  dedication: string | null;
  ipHash: string;
}): Promise<"sent" | "limit"> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("meadow_flowers")
    .select("id", { count: "exact", head: true })
    .ilike("email", input.email.replace(/[%_\\]/g, "\\$&"))
    .eq("status", "pending")
    .gte("created_at", since);
  if (countError) {
    throw new Error(`Livada: provjera adrese: ${countError.message}`);
  }
  if ((count ?? 0) >= 3) {
    return "limit";
  }
  const consent = [t.claim.consent, input.newsletter ? t.claim.newsletter : null, input.anniversary ? t.claim.anniversary : null]
    .filter(Boolean)
    .join(" ");
  const { data, error } = await admin
    .from("meadow_flowers")
    .insert({
      name: input.name,
      species: input.species,
      petal: input.petal,
      status: "pending",
      number: null,
      email: input.email,
      consent_text: consent,
      email_saved_at: new Date().toISOString(),
      newsletter_opt_in: input.newsletter,
      anniversary_opt_in: input.anniversary,
      dedication: input.dedication,
      dedication_status: input.dedication ? "pending" : "none",
      ip_hash: input.ipHash,
    })
    .select("claim_token")
    .single();
  if (error) {
    throw new Error(`Livada: upis traga: ${error.message}`);
  }
  const { html, text } = renderEmail({
    heading: t.email.heading,
    paragraphs: [fill(t.email.paragraph, { name: input.name }), fill(t.email.validity, { days: PENDING_DAYS })],
    button: { label: t.email.button, url: `${env.siteUrl}/livada/potvrda?t=${data.claim_token}` },
    footnote: t.email.footnote,
  });
  await sendEmail({ to: input.email, subject: t.email.subject, html, text });
  return "sent";
}

export function trailUrl(number: number): string {
  return `${env.siteUrl}/livada/trag/${number}`;
}

export type PublicTrail = {
  number: number;
  name: string;
  species: MeadowSpecies;
  petal: MeadowPetal;
  memorialSlug: string | null;
  day: string;
  dedication: string | null;
};

/** Javni podaci jednog traga za njegovu stranicu; posveta samo ako je odobrena. */
export async function getPublicTrail(number: number): Promise<PublicTrail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(MEADOW_TAG, `livada-trag:${number}`);
  if (!Number.isInteger(number) || number < 1 || number > 1e12) {
    return null;
  }
  const { data, error } = await createAnonClient().rpc("public_meadow_trail", { p_number: number });
  if (error) {
    throw new Error(`Livada: čitanje traga: ${error.message}`);
  }
  const row = data?.[0];
  if (!row) {
    return null;
  }
  return {
    number: row.number,
    name: row.name,
    species: (MEADOW_SPECIES as readonly string[]).includes(row.species) ? (row.species as MeadowSpecies) : "drugo",
    petal: (MEADOW_PETALS as readonly string[]).includes(row.petal) ? (row.petal as MeadowPetal) : "terakota",
    memorialSlug: row.memorial_slug,
    day: (row.confirmed_at ?? row.created_at).slice(0, 10),
    dedication: row.dedication,
  };
}

/** Datum u Zagrebu kao [godina, mjesec, dan]. */
function zagrebDate(date: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return [get("year"), get("month"), get("day")];
}

/**
 * Godišnji podsjetnik: jednom godišnje, na dan kad je trag potvrđen, poveznica na cvijet.
 * Samo uz privolu; 29. veljače se u običnoj godini šalje 28. veljače. Ponovni poziv istog dana ne šalje dvaput.
 */
export async function sendDueAnniversaries(now: Date = new Date()): Promise<number> {
  const admin = createAdminClient();
  const [year, month, day] = zagrebDate(now);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const { data, error } = await admin
    .from("meadow_flowers")
    .select("id, number, name, email, claim_token, confirmed_at, anniversary_last_year")
    .eq("status", "visible")
    .eq("anniversary_opt_in", true)
    .not("email", "is", null)
    .not("confirmed_at", "is", null)
    .limit(5000);
  if (error) {
    throw new Error(`Livada: čitanje podsjetnika: ${error.message}`);
  }
  let sent = 0;
  for (const row of data ?? []) {
    if (!row.email || !row.confirmed_at || row.number === null) continue;
    const [y, m, d] = zagrebDate(new Date(row.confirmed_at));
    const dueDay = m === 2 && d === 29 && !leap ? 28 : d;
    if (y >= year || m !== month || dueDay !== day || (row.anniversary_last_year ?? 0) >= year) continue;
    const years = year - y;
    const { html, text } = renderEmail({
      heading: fill(t.anniversaryEmail.heading, { name: row.name }),
      paragraphs: [fill(years === 1 ? t.anniversaryEmail.oneYear : t.anniversaryEmail.years, { years }), t.anniversaryEmail.paragraph],
      button: { label: t.anniversaryEmail.button, url: trailUrl(row.number) },
      footnote: fill(t.anniversaryEmail.footnote, { url: `${env.siteUrl}/livada/podsjetnik-odjava?t=${row.claim_token}` }),
    });
    await sendEmail({ to: row.email, subject: fill(t.anniversaryEmail.subject, { name: row.name }), html, text });
    await admin.from("meadow_flowers").update({ anniversary_last_year: year }).eq("id", row.id);
    sent += 1;
  }
  return sent;
}

/** Odjava godišnjeg podsjetnika gumbom s poveznice iz e-maila. */
export async function stopAnniversary(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) {
    return false;
  }
  const { data, error } = await createAdminClient()
    .from("meadow_flowers")
    .update({ anniversary_opt_in: false })
    .eq("claim_token", token)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

const TOKEN = /^[0-9a-f]{48}$/;

/**
 * Potvrda traga gumbom s poveznice iz e-maila: trag postaje vidljiv i dobiva broj.
 * Ako je uz trag tražen i newsletter, potvrda adrese vrijedi i za njega.
 */
export async function confirmFlower(token: string): Promise<{ number: number; name: string; newlyConfirmed: boolean } | null> {
  if (!TOKEN.test(token)) {
    return null;
  }
  const { data, error } = await createAdminClient().rpc("confirm_meadow_flower", { p_token: token });
  if (error) {
    throw new Error(`Livada: potvrda traga: ${error.message}`);
  }
  const row = data?.[0];
  if (!row) {
    return null;
  }
  if (row.newly_confirmed && row.newsletter_opt_in && row.email) {
    await subscribeConfirmed(row.email, "livada", t.claim.newsletter).catch((failure) => {
      console.error("[livada] newsletter uz potvrdu traga nije upisan", failure);
    });
  }
  return { number: row.number, name: row.name, newlyConfirmed: row.newly_confirmed };
}

/** Briše tragove koji nisu potvrđeni u roku; njihov e-mail se ne čuva. */
export async function purgePendingFlowers(): Promise<number> {
  const before = new Date(Date.now() - PENDING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("meadow_flowers")
    .delete()
    .eq("status", "pending")
    .lt("created_at", before)
    .select("id");
  if (error) {
    throw new Error(`Livada: brisanje nepotvrđenih: ${error.message}`);
  }
  return data?.length ?? 0;
}
