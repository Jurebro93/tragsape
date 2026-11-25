import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { photoUrl } from "@/lib/memorial";
import type { Viewer } from "@/server/auth";
import { env } from "@/server/env";
import type { Database } from "@/server/supabase/database.types";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Izvoz podataka računa. Sve se čita korisnikovom sesijom, pa u datoteku ulazi točno ono što
 * RLS tom korisniku dopušta: ništa tuđe i nijedan stupac koji mu baza ne daje.
 */

type Client = SupabaseClient<Database>;

const PAGE_SIZE = 1000;
const ID_CHUNK = 100;

/** Svi stupci memorijala koje prijavljeni korisnik smije čitati. */
const MEMORIAL_EXPORT_COLUMNS =
  "id, owner_id, slug, status, tier, visibility, name, species, breed, sex, birth_date, birth_precision, death_date, death_precision, adoption_date, dedication, story_md, nicknames, traits, favorite_toy, favorite_treat, favorite_place, funny_habits, video_url, theme, cover_photo_id, guestbook_mode, candle_count, draft_step, published_at, created_at, updated_at" as const;

type PageResult<Row> = { data: Row[] | null; error: { message: string } | null };

/** Čita sve retke upita, stranicu po stranicu (PostgREST vraća najviše tisuću odjednom). */
async function readAll<Row>(page: (from: number, to: number) => PromiseLike<PageResult<Row>>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/** Isto, za upite ograničene popisom identifikatora, koji se dijeli da adresa upita ostane kratka. */
async function readAllFor<Row>(
  ids: string[],
  page: (ids: string[], from: number, to: number) => PromiseLike<PageResult<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    const chunk = ids.slice(index, index + ID_CHUNK);
    rows.push(...(await readAll((from, to) => page(chunk, from, to))));
  }
  return rows;
}

export async function buildAccountExport(viewer: Viewer, client?: Client) {
  const supabase = client ?? (await createSessionClient());
  const userId = viewer.id;

  const [profile, family, memorials, letters, reminderPrefs, collaborations, orders, entitlements] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role, created_at, updated_at").eq("id", userId).maybeSingle(),
    supabase
      .from("families")
      .select("slug, title, intro, is_public, created_at, updated_at")
      .eq("owner_id", userId)
      .maybeSingle(),
    readAll((from, to) =>
      supabase
        .from("memorials")
        .select(MEMORIAL_EXPORT_COLUMNS)
        .eq("owner_id", userId)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    // Vlastita pisma, i ona napisana na spomenima na kojima korisnik samo surađuje.
    readAll((from, to) =>
      supabase
        .from("letters")
        .select("id, memorial_id, written_on, title, body, visibility, created_at, updated_at")
        .eq("author_id", userId)
        .order("written_on")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("reminder_prefs")
        .select("memorial_id, birthday, adoption, anniversary, updated_at")
        .eq("user_id", userId)
        .order("memorial_id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("memorial_members")
        .select("memorial_id, invited_email, accepted_at, created_at")
        .eq("user_id", userId)
        .order("created_at")
        .order("memorial_id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("orders")
        .select(
          "id, email, status, currency, subtotal_cents, discount_cents, total_cents, withdrawal_waiver_at, attribution, created_at, paid_at, refunded_at",
        )
        .eq("user_id", userId)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("entitlements")
        .select("id, order_line_id, tier, memorial_id, status, applied_at, created_at")
        .eq("owner_id", userId)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
  ]);
  if (profile.error || family.error) {
    throw new Error(profile.error?.message ?? family.error?.message);
  }

  const memorialIds = memorials.map((memorial) => memorial.id);
  const orderIds = orders.map((order) => order.id);
  const [photos, timeline, guestbook, invited, orderLines] = await Promise.all([
    readAllFor(memorialIds, (ids, from, to) =>
      supabase
        .from("memorial_photos")
        .select("id, memorial_id, kind, caption, taken_on, width, height, sort_order, source_photo_id, created_at")
        .in("memorial_id", ids)
        .order("memorial_id")
        .order("sort_order")
        .order("id")
        .range(from, to),
    ),
    readAllFor(memorialIds, (ids, from, to) =>
      supabase
        .from("timeline_events")
        .select("id, memorial_id, event_date, date_precision, title, body, photo_id, sort_order, created_at")
        .in("memorial_id", ids)
        .order("memorial_id")
        .order("event_date")
        .order("id")
        .range(from, to),
    ),
    readAllFor(memorialIds, (ids, from, to) =>
      supabase
        .from("guestbook_entries")
        .select("id, memorial_id, author_name, body, status, created_at, moderated_at")
        .in("memorial_id", ids)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    // Osobe koje je korisnik pozvao na svoje spomene.
    readAllFor(memorialIds, (ids, from, to) =>
      supabase
        .from("memorial_members")
        .select("memorial_id, invited_email, accepted_at, created_at")
        .in("memorial_id", ids)
        .order("created_at")
        .order("invited_email")
        .range(from, to),
    ),
    readAllFor(orderIds, (ids, from, to) =>
      supabase
        .from("order_lines")
        .select(
          "id, order_id, position, kind, product_key, memorial_id, unit_amount_cents, discount_cents, total_cents, discount_reason, meta",
        )
        .in("order_id", ids)
        .order("order_id")
        .order("position")
        .range(from, to),
    ),
  ]);

  return {
    exported_at: new Date().toISOString(),
    site: env.siteUrl,
    account: { id: userId, email: viewer.email },
    profile: profile.data,
    family: family.data,
    memorials,
    // Datoteke fotografija nisu u izvozu; adresa vrijedi dok je korisnik prijavljen.
    photos: photos.map((photo) => ({ ...photo, url: `${env.siteUrl}${photoUrl(photo.id, "full")}` })),
    timeline_events: timeline,
    letters,
    guestbook_entries: guestbook,
    invited_members: invited,
    collaborations,
    reminder_prefs: reminderPrefs,
    orders: orders.map((order) => ({
      ...order,
      lines: orderLines.filter((line) => line.order_id === order.id),
    })),
    entitlements,
  };
}
