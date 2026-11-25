import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";
import type { Database } from "./database.types";

/**
 * Klijent sa servisnim ključem: zaobilazi RLS. Smije se koristiti samo u Stripe webhooku,
 * stvaranju narudžbe, zakazanim poslovima, poslužiteljskim endpointima za javne unose i
 * čitanju slike nakon što je pristup već provjeren kroz RLS. Vidi AGENTS.md.
 */
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
