import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/server/env";
import type { Database } from "./database.types";

/**
 * Klijent s korisnikovom sesijom iz kolačića. Svaki upit prolazi kroz RLS kao taj korisnik.
 * `shareKey` se šalje kao zaglavlje x-share-key za memorijale „samo s linkom".
 */
export async function createSessionClient(options: { shareKey?: string | null } = {}) {
  // Sesija vrijedi samo u stvarnom zahtjevu: Supabase pri čitanju uspoređuje istek tokena s
  // trenutnim vremenom, pa se ovaj dio nikad ne prerenderira.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    global: options.shareKey ? { headers: { "x-share-key": options.shareKey } } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            cookieStore.set(name, value, cookieOptions);
          }
        } catch {
          // U poslužiteljskoj komponenti kolačići se ne mogu postaviti; sesiju osvježava proxy.
        }
      },
    },
  });
}
