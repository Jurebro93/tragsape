import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ProductKey } from "@/lib/pricing";
import { createAnonClient } from "@/server/supabase/anon";

/**
 * Javni katalog: cijene, postavke prodaje i evidencija donacija.
 * Sve se čita anonimnim klijentom (RLS kao za posjetitelja) i predmemorira,
 * pa stranice koje ovo koriste ostaju statične. Nakon izmjene u adminu treba
 * osvježiti oznake `products` odnosno `donations`.
 *
 * Greška baze se baca, a ne pretvara u praznu vrijednost: tako se pogrešan cjenik
 * nikad ne predmemorira.
 */

export type { ProductKey };

/** Svi poznati ključevi proizvoda. Zapis po ključu tjera prevoditelj da javi ako se popis i tip raziđu. */
const KNOWN_PRODUCT_KEYS: Record<ProductKey, true> = {
  memorial: true,
  memorial_portrait: true,
  upgrade_portrait: true,
  gesture_7d: true,
  gesture_30d: true,
  gesture_365d: true,
};

export type Product = {
  key: ProductKey;
  name: string;
  unitAmountCents: number;
};

/** Aktivni proizvodi po ključu. Proizvod koji je isključen u adminu ovdje ne postoji. */
export type ProductMap = Partial<Record<ProductKey, Product>>;

export type Shelter = {
  name: string;
  url: string | null;
};

export type Settings = {
  repeatDiscountPct: number;
  donationPerMemorialCents: number;
  /** Azil kojem trenutačno idu donacije; null dok ga vlasnik ne unese. */
  shelter: Shelter | null;
};

export type DonationPayout = {
  id: string;
  /** Datum isplate, YYYY-MM-DD. */
  paidOn: string;
  amountCents: number;
  note: string | null;
  proofUrl: string | null;
  shelterName: string | null;
};

export type DonationSummary = {
  accruedCents: number;
  paidOutCents: number;
  perMemorialCents: number;
  shelter: Shelter | null;
  payouts: DonationPayout[];
};

function isProductKey(value: string): value is ProductKey {
  return Object.hasOwn(KNOWN_PRODUCT_KEYS, value);
}

/** Propušta samo http(s) adrese; sve ostalo (npr. javascript:) ne smije postati poveznica. */
function httpUrlOrNull(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Dokaz isplate postaje poveznica samo ako je u `proof_path` upisana cijela http(s) adresa.
 * Putanja u privatnoj pohrani još nema rutu koja bi je poslužila; kad admin dobije učitavanje
 * dokaza, ovdje se dodaje pretvorba putanje u adresu te rute.
 */
function proofUrlFromPath(proofPath: string | null): string | null {
  return httpUrlOrNull(proofPath);
}

export async function getProducts(): Promise<ProductMap> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { data, error } = await createAnonClient()
    .from("products")
    .select("key, name, unit_amount_cents")
    .eq("active", true);
  if (error) {
    throw new Error(`Cjenik se ne može pročitati: ${error.message}`);
  }

  const products: ProductMap = {};
  for (const row of data) {
    if (isProductKey(row.key)) {
      products[row.key] = { key: row.key, name: row.name, unitAmountCents: row.unit_amount_cents };
    }
  }
  return products;
}

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  // Azil se dohvaća ugniježđeno preko active_shelter_id; RLS vraća samo aktivne azile.
  const { data, error } = await createAnonClient()
    .from("settings")
    .select("repeat_discount_pct, donation_per_memorial_cents, active_shelter_id, shelter:shelters(name, url)")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    throw new Error(`Postavke se ne mogu pročitati: ${error.message}`);
  }
  if (!data) {
    // Bez retka postavki ne tvrdimo ni popust ni donaciju.
    return { repeatDiscountPct: 0, donationPerMemorialCents: 0, shelter: null };
  }

  const shelter = data.active_shelter_id && data.shelter ? data.shelter : null;
  return {
    repeatDiscountPct: data.repeat_discount_pct,
    donationPerMemorialCents: data.donation_per_memorial_cents,
    shelter: shelter ? { name: shelter.name, url: httpUrlOrNull(shelter.url) } : null,
  };
}

export async function getDonationSummary(): Promise<DonationSummary> {
  "use cache";
  cacheLife("hours");
  // Sažetak ovisi i o postavkama (iznos po memorijalu, aktivni azil), pa nosi obje oznake.
  cacheTag("donations", "products");

  const supabase = createAnonClient();
  const [settings, totals, payouts] = await Promise.all([
    getSettings(),
    supabase.rpc("donation_totals"),
    supabase
      .from("donation_payouts")
      .select("id, amount_cents, paid_on, note, proof_path, shelter:shelters(name)")
      .eq("published", true)
      .order("paid_on", { ascending: false })
      .order("id"),
  ]);
  if (totals.error) {
    throw new Error(`Zbroj donacija se ne može pročitati: ${totals.error.message}`);
  }
  if (payouts.error) {
    throw new Error(`Isplate donacija se ne mogu pročitati: ${payouts.error.message}`);
  }

  const total = totals.data[0];
  return {
    accruedCents: Number(total?.accrued_cents ?? 0),
    paidOutCents: Number(total?.paid_out_cents ?? 0),
    perMemorialCents: settings.donationPerMemorialCents,
    shelter: settings.shelter,
    payouts: payouts.data.map((row) => ({
      id: row.id,
      paidOn: row.paid_on,
      amountCents: row.amount_cents,
      note: row.note,
      proofUrl: proofUrlFromPath(row.proof_path),
      shelterName: row.shelter?.name ?? null,
    })),
  };
}
