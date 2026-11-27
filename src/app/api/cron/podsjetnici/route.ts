import { createHash, timingSafeEqual } from "node:crypto";
import { sendDueGifts } from "@/server/checkout/after-payment";
import { env } from "@/server/env";
import { purgePendingFlowers, sendDueAnniversaries } from "@/server/meadow";
import { sendDueReminders, type ReminderSummary } from "@/server/owner/reminders";

/**
 * Dnevni zakazani posao: godišnji podsjetnici, pokloni kojima je došao zakazani datum i brisanje
 * tragova s livade koji nisu potvrđeni u roku, uz godišnje podsjetnike za tragove na livadi.
 * Pozivatelj se predstavlja zaglavljem `Authorization: Bearer <CRON_SECRET>`.
 *
 * Odgovor: 503 dok tajna nije postavljena, 401 za pogrešnu tajnu, 200 sa zbrojem, 500 ako neki
 * dio nije dovršen. Ponovni poziv je siguran: ni podsjetnik ni poklon ne šalju se dvaput.
 */

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Usporedba u stalnom vremenu; sažeci izjednačuju duljinu ulaza. */
function sameSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

async function run(request: Request): Promise<Response> {
  // Zaglavlje se čita prvo, pa se ni GET nikad ne prerenderira.
  const authorization = request.headers.get("authorization") ?? "";
  const secret = env.cronSecret;
  if (!secret) {
    return json({ error: "not_configured" }, 503);
  }
  if (!sameSecret(authorization, `Bearer ${secret}`)) {
    return json({ error: "unauthorized" }, 401);
  }

  let reminders: ReminderSummary | null = null;
  let gifts: number | null = null;
  const errors: string[] = [];
  try {
    reminders = await sendDueReminders();
  } catch (error) {
    errors.push("reminders");
    console.error("[cron] podsjetnici nisu dovršeni", error);
  }
  try {
    gifts = await sendDueGifts();
  } catch (error) {
    errors.push("gifts");
    console.error("[cron] pokloni nisu poslani", error);
  }
  let anniversaries: number | null = null;
  try {
    anniversaries = await sendDueAnniversaries();
  } catch (error) {
    errors.push("meadow-anniversaries");
    console.error("[cron] godišnji podsjetnici s livade nisu poslani", error);
  }
  let purged: number | null = null;
  try {
    purged = await purgePendingFlowers();
  } catch (error) {
    errors.push("meadow");
    console.error("[cron] nepotvrđeni tragovi s livade nisu obrisani", error);
  }
  return json({ ok: errors.length === 0, reminders, gifts: { sent: gifts }, meadow: { purged, anniversaries }, errors }, errors.length === 0 ? 200 : 500);
}

export async function POST(request: Request): Promise<Response> {
  return run(request);
}

export async function GET(request: Request): Promise<Response> {
  return run(request);
}
