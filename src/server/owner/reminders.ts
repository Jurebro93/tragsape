import "server-only";
import { zagrebDay } from "@/lib/time";
import { sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";
import { reminderEmail } from "./emails";
import { candidateDates, dueKinds, type ReminderKind } from "./reminder-dates";

/**
 * Godišnji podsjetnici e-mailom. Pokreće ih isključivo zakazani posao, sa servisnim ključem:
 * čita memorijale svih vlasnika i adrese primatelja iz Supabase Autha.
 *
 * Pravila: samo objavljeni spomeni na plaćenom paketu; primatelj je vlasnik ili suradnik koji
 * je prihvatio pozivnicu i sam uključio tu vrstu podsjetnika (bez retka u `reminder_prefs`
 * nema e-maila); zapis u `reminder_log` nastaje prije slanja, pa ponovljeno pokretanje istog
 * dana ili iste godine ne šalje ništa dvaput.
 */

export type ReminderSummary = {
  /** Dan u zoni Europe/Zagreb za koji je posao radio. */
  date: string;
  /** Spomeni kojima je danas neki od datuma. */
  memorials: number;
  /** Podsjetnici koje je netko uključio i koji danas vrijede. */
  due: number;
  sent: number;
  alreadySent: number;
  withoutEmail: number;
  failed: number;
};

const PAGE_SIZE = 500;
const ID_CHUNK = 100;

type Admin = ReturnType<typeof createAdminClient>;

type DueMemorial = {
  id: string;
  ownerId: string;
  slug: string;
  shareKey: string;
  visibility: string;
  name: string;
  kinds: ReminderKind[];
};

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function loadDueMemorials(admin: Admin, today: string): Promise<DueMemorial[]> {
  const dates = candidateDates(today);
  if (dates.length === 0) {
    return [];
  }
  const list = dates.join(",");
  const due: DueMemorial[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("memorials")
      .select(
        "id, owner_id, slug, share_key, visibility, name, birth_date, birth_precision, adoption_date, death_date, death_precision",
      )
      .eq("status", "published")
      .neq("tier", "free")
      .or(`birth_date.in.(${list}),adoption_date.in.(${list}),death_date.in.(${list})`)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`memorials: ${error.message}`);
    }
    for (const row of data ?? []) {
      // Upit je samo grubi filtar; preciznost datuma i prijestupne godine odlučuju se ovdje.
      const kinds = dueKinds(row, today);
      if (kinds.length > 0) {
        due.push({
          id: row.id,
          ownerId: row.owner_id,
          slug: row.slug,
          shareKey: row.share_key,
          visibility: row.visibility,
          name: row.name,
          kinds,
        });
      }
    }
    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }
  return due;
}

/** Adresa na koju primatelj otvara spomen. Privatni spomen traži prijavu. */
function memorialUrl(memorial: DueMemorial): string {
  if (memorial.visibility === "unlisted") {
    return `${env.siteUrl}/s/${memorial.shareKey}`;
  }
  const path = `/spomen/${memorial.slug}`;
  return memorial.visibility === "private"
    ? `${env.siteUrl}/prijava?dalje=${encodeURIComponent(path)}`
    : `${env.siteUrl}${path}`;
}

export async function sendDueReminders(now: Date = new Date()): Promise<ReminderSummary> {
  const admin = createAdminClient();
  const today = zagrebDay(now);
  const year = Number(today.slice(0, 4));
  const summary: ReminderSummary = {
    date: today,
    memorials: 0,
    due: 0,
    sent: 0,
    alreadySent: 0,
    withoutEmail: 0,
    failed: 0,
  };

  const memorials = await loadDueMemorials(admin, today);
  summary.memorials = memorials.length;
  if (memorials.length === 0) {
    return summary;
  }

  // Primatelji: vlasnik i suradnici koji su prihvatili pozivnicu. Uklonjeni suradnik može imati
  // stari redak u `reminder_prefs`, ali više nije na ovom popisu.
  const recipients = new Map<string, Set<string>>(memorials.map((memorial) => [memorial.id, new Set([memorial.ownerId])]));
  const prefs = new Map<string, Record<ReminderKind, boolean>>();
  for (const ids of chunks(Array.from(recipients.keys()), ID_CHUNK)) {
    const [members, preferences] = await Promise.all([
      admin
        .from("memorial_members")
        .select("memorial_id, user_id")
        .in("memorial_id", ids)
        .not("accepted_at", "is", null)
        .not("user_id", "is", null),
      admin.from("reminder_prefs").select("memorial_id, user_id, birthday, adoption, anniversary").in("memorial_id", ids),
    ]);
    if (members.error || preferences.error) {
      throw new Error(`recipients: ${members.error?.message ?? preferences.error?.message}`);
    }
    for (const member of members.data ?? []) {
      if (member.user_id) {
        recipients.get(member.memorial_id)?.add(member.user_id);
      }
    }
    for (const row of preferences.data ?? []) {
      prefs.set(`${row.memorial_id}:${row.user_id}`, {
        birthday: row.birthday,
        adoption: row.adoption,
        anniversary: row.anniversary,
      });
    }
  }

  // Adresa primatelja dolazi isključivo iz Supabase Autha.
  const emails = new Map<string, string | null>();
  async function emailOf(userId: string): Promise<string | null> {
    if (!emails.has(userId)) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      const user = error ? null : data.user;
      emails.set(userId, user && !user.is_anonymous && user.email ? user.email : null);
    }
    return emails.get(userId) ?? null;
  }

  for (const memorial of memorials) {
    for (const userId of recipients.get(memorial.id) ?? []) {
      const wanted = prefs.get(`${memorial.id}:${userId}`);
      if (!wanted) {
        continue;
      }
      for (const kind of memorial.kinds) {
        if (!wanted[kind]) {
          continue;
        }
        summary.due += 1;
        try {
          const to = await emailOf(userId);
          if (!to) {
            summary.withoutEmail += 1;
            continue;
          }
          // Prvo zapis, zatim slanje: ako redak već postoji, podsjetnik je ove godine poslan.
          const { data: logged, error } = await admin
            .from("reminder_log")
            .upsert(
              { memorial_id: memorial.id, user_id: userId, kind, year },
              { onConflict: "memorial_id,user_id,kind,year", ignoreDuplicates: true },
            )
            .select("memorial_id");
          if (error) {
            throw new Error(error.message);
          }
          if (!logged || logged.length === 0) {
            summary.alreadySent += 1;
            continue;
          }
          await sendEmail(
            reminderEmail({
              to,
              kind,
              petName: memorial.name,
              memorialUrl: memorialUrl(memorial),
              settingsUrl: `${env.siteUrl}/moji-ljubimci/${memorial.id}/podsjetnici`,
            }),
          );
          summary.sent += 1;
        } catch (error) {
          summary.failed += 1;
          console.error(`[podsjetnici] ${kind} za spomen ${memorial.id} nije poslan`, error);
        }
      }
    }
  }
  return summary;
}
