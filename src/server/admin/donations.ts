import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { fetchAllRows, must } from "./queries";

/** Donacije: postavke, azili, isplate i zbrojevi. Ništa se ne predlaže niti unaprijed upisuje. */

export type AdminShelter = { id: string; name: string; url: string | null; active: boolean };

export type AdminPayout = {
  id: string;
  shelterId: string;
  shelterName: string | null;
  amountCents: number;
  /** Datum isplate, YYYY-MM-DD. */
  paidOn: string;
  note: string | null;
  published: boolean;
  /** Javna adresa dokaza, samo ako je cijela http(s) adresa. */
  proofUrl: string | null;
};

export type DonationsData = {
  settings: { donationPerMemorialCents: number; activeShelterId: string | null };
  shelters: AdminShelter[];
  payouts: AdminPayout[];
  totals: { accruedCents: number; paidPublishedCents: number; paidAllCents: number };
};

/** Propušta samo http(s) adrese; sve ostalo ne smije postati poveznica. */
export function httpUrlOrNull(value: string | null): string | null {
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

export async function loadDonations(): Promise<DonationsData> {
  const supabase = await createSessionClient();
  const [settings, shelters, payouts, totals] = await Promise.all([
    supabase
      .from("settings")
      .select("donation_per_memorial_cents, active_shelter_id")
      .eq("id", true)
      .single()
      .then((result) => must(result, "postavke")),
    fetchAllRows(
      (from, to) =>
        supabase.from("shelters").select("id, name, url, active").order("name").order("id").range(from, to),
      "azili",
    ),
    fetchAllRows(
      (from, to) =>
        supabase
          .from("donation_payouts")
          .select("id, shelter_id, amount_cents, paid_on, note, published, proof_path, shelter:shelters(name)")
          .order("paid_on", { ascending: false })
          .order("id")
          .range(from, to),
      "isplate",
    ),
    supabase.rpc("donation_totals").then((result) => must(result, "zbroj donacija")),
  ]);

  return {
    settings: {
      donationPerMemorialCents: settings.donation_per_memorial_cents,
      activeShelterId: settings.active_shelter_id,
    },
    shelters,
    payouts: payouts.map((row) => ({
      id: row.id,
      shelterId: row.shelter_id,
      shelterName: row.shelter?.name ?? null,
      amountCents: row.amount_cents,
      paidOn: row.paid_on,
      note: row.note,
      published: row.published,
      proofUrl: httpUrlOrNull(row.proof_path),
    })),
    totals: {
      accruedCents: Number(totals[0]?.accrued_cents ?? 0),
      paidPublishedCents: Number(totals[0]?.paid_out_cents ?? 0),
      paidAllCents: payouts.reduce((sum, row) => sum + row.amount_cents, 0),
    },
  };
}
