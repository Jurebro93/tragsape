import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";
import type { Database } from "./database.types";

/**
 * Klijent bez sesije: vidi točno ono što vidi anonimni posjetitelj.
 * Koristi se za javne stranice koje se predmemoriraju.
 */
export function createAnonClient(options: { shareKey?: string | null } = {}) {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: options.shareKey ? { headers: { "x-share-key": options.shareKey } } : undefined,
  });
}
