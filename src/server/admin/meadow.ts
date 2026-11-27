import "server-only";
import { createSessionClient } from "@/server/supabase/session";

/** Tragovi na Velikoj livadi za admin. Čita se kroz RLS (admin vidi i skrivene), bez servisnog ključa. */

export type AdminFlowerRow = {
  id: string;
  number: number | null;
  name: string;
  species: string;
  status: "pending" | "visible" | "hidden";
  memorialSlug: string | null;
  createdAt: string;
};

export async function loadMeadowFlowers(query: string | null): Promise<AdminFlowerRow[]> {
  const supabase = await createSessionClient();
  let request = supabase
    .from("meadow_flowers")
    .select("id, number, name, species, status, memorial_slug, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query) {
    request = /^\d+$/.test(query) ? request.eq("number", Number(query)) : request.ilike("name", `%${query.replace(/[%_,()]/g, "")}%`);
  }
  const { data, error } = await request;
  if (error) {
    throw new Error(`Tragovi na livadi nisu učitani: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    species: row.species,
    status: row.status as AdminFlowerRow["status"],
    memorialSlug: row.memorial_slug,
    createdAt: row.created_at,
  }));
}

export type AdminDedication = { id: string; number: number | null; name: string; dedication: string; createdAt: string };

/** Posvete na čekanju. Stupac posvete javne uloge ne vide; admin ga čita kroz funkciju koja provjerava ulogu. */
export async function loadPendingDedications(): Promise<AdminDedication[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("admin_meadow_dedications", { p_status: "pending" });
  if (error) {
    throw new Error(`Posvete na livadi nisu učitane: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    dedication: row.dedication,
    createdAt: row.created_at,
  }));
}
