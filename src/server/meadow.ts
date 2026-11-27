import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { MEADOW_PETALS, MEADOW_SPECIES, type MeadowPetal, type MeadowRow, type MeadowSpecies } from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow as t } from "@/messages/hr/meadow";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";
import { createAnonClient } from "@/server/supabase/anon";

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

/** Novi trag. Ime je već provjereno; vraća broj i tajni ključ koji dobiva samo onaj tko je trag ostavio. */
export async function createFlower(input: {
  name: string;
  species: MeadowSpecies;
  petal: MeadowPetal;
  ipHash: string;
}): Promise<{ number: number; claimToken: string; createdAt: string }> {
  const { data, error } = await createAdminClient()
    .from("meadow_flowers")
    .insert({ name: input.name, species: input.species, petal: input.petal, ip_hash: input.ipHash })
    .select("number, claim_token, created_at")
    .single();
  if (error) {
    throw new Error(`Livada: upis traga: ${error.message}`);
  }
  return { number: data.number, claimToken: data.claim_token, createdAt: data.created_at };
}

export function trailUrl(number: number): string {
  return `${env.siteUrl}/livada?trag=${number}`;
}

/** Sprema e-mail uz trag i šalje poveznicu. Radi samo s tajnim ključem tog traga. */
export async function saveFlowerEmail(number: number, claimToken: string, email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meadow_flowers")
    .update({ email, consent_text: t.claim.consent, email_saved_at: new Date().toISOString() })
    .eq("number", number)
    .eq("claim_token", claimToken)
    .select("name")
    .maybeSingle();
  if (error || !data) {
    return false;
  }
  const { html, text } = renderEmail({
    heading: fill(t.email.heading, { name: data.name }),
    paragraphs: [t.email.paragraph],
    button: { label: t.email.button, url: trailUrl(number) },
    footnote: t.email.footnote,
  });
  await sendEmail({ to: email, subject: t.email.subject, html, text });
  return true;
}
