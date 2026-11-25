import "server-only";
import { createHmac } from "node:crypto";
import { zagrebDay } from "@/lib/time";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";
import { createSessionClient } from "@/server/supabase/session";

/** Adresa posjetitelja iza posrednika domaćina. Koristi se samo za sažetak, nikad se ne sprema. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "nepoznato";
}

function hmac(value: string): string {
  return createHmac("sha256", env.hashSecret).update(value).digest("hex").slice(0, 40);
}

/** Sažetak IP adrese koji vrijedi samo za današnji dan, pa se posjetitelja ne može pratiti. */
export function dailyIpHash(request: Request, now: Date = new Date()): string {
  return hmac(`ip|${zagrebDay(now)}|${clientIp(request)}`);
}

/** Sažetak posjetitelja za dnevnu svijeću: isti uređaj i mreža istog dana daju isti sažetak. */
export function dailyVisitorHash(request: Request, now: Date = new Date()): string {
  return hmac(`posjetitelj|${zagrebDay(now)}|${clientIp(request)}|${request.headers.get("user-agent") ?? ""}`);
}

/** True ako je zahtjev unutar ograničenja učestalosti. */
export async function withinRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  // Ako brojač zakaže, zahtjev se pušta: zaštita ne smije srušiti uslugu.
  return error ? true : data === true;
}

/** Provjera Turnstile tokena. Bez ključa je isključena i oslanjamo se na zamku i ograničenja. */
export async function passesTurnstile(token: string | null | undefined, request: Request): Promise<boolean> {
  const secret = env.turnstileSecretKey;
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(request) }),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export type PublicTarget = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  guestbookMode: string;
};

/**
 * Objavljeni memorijal koji ovaj posjetitelj smije vidjeti (javan, „samo s linkom" uz ključ,
 * ili privatan za članove). Vraća null ako ga RLS ne pokaže.
 */
export async function findPublicTarget(memorialId: string, shareKey: string | null | undefined): Promise<PublicTarget | null> {
  const supabase = await createSessionClient({ shareKey: shareKey ?? null });
  const { data } = await supabase
    .from("memorials")
    .select("id, owner_id, slug, name, status, guestbook_mode")
    .eq("id", memorialId)
    .eq("status", "published")
    .maybeSingle();
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    ownerId: data.owner_id,
    slug: data.slug,
    name: data.name,
    guestbookMode: data.guestbook_mode,
  };
}
