import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEMORIAL_COLUMNS,
  toMemorial,
  type Gesture,
  type GestureKind,
  type GuestbookEntry,
  type Letter,
  type Memorial,
  type MemorialRow,
  type MemorialView,
  type Photo,
  type TimelineEvent,
} from "@/lib/memorial";
import { getViewer } from "@/server/auth";
import { createAnonClient } from "@/server/supabase/anon";
import { createSessionClient } from "@/server/supabase/session";
import type { Database } from "@/server/supabase/database.types";

/**
 * Jedini put do memorijala. Svaka funkcija vraća podatke za prikaz ili null („ne postoji"),
 * a o tome što posjetitelj smije vidjeti odlučuje RLS, ne ovaj kod.
 */

type Client = SupabaseClient<Database>;

export function memorialTags(memorial: { id: string; slug: string }): string[] {
  return [`memorial:${memorial.id}`, `memorial-slug:${memorial.slug}`];
}

const PHOTO_COLUMNS = "id, caption, width, height, sort_order, kind" as const;

function toPhoto(row: {
  id: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  kind: string;
}): Photo {
  return {
    id: row.id,
    caption: row.caption,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    kind: row.kind === "ai_portrait" ? "ai_portrait" : "photo",
  };
}

export async function loadPhotos(client: Client, memorialId: string): Promise<Photo[]> {
  const { data } = await client
    .from("memorial_photos")
    .select(PHOTO_COLUMNS)
    .eq("memorial_id", memorialId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map(toPhoto);
}

async function loadView(client: Client, memorial: Memorial, shareKey: string | null): Promise<MemorialView> {
  const [photos, timeline, letters, guestbook, gestures] = await Promise.all([
    loadPhotos(client, memorial.id),
    client
      .from("timeline_events")
      .select("id, event_date, date_precision, title, body, sort_order")
      .eq("memorial_id", memorial.id)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true })
      .limit(100),
    // Samo javna pisma: privatna vidi isključivo autor, na stranici za upravljanje.
    client
      .from("letters")
      .select("id, written_on, title, body")
      .eq("memorial_id", memorial.id)
      .eq("visibility", "public")
      .order("written_on", { ascending: false })
      .limit(50),
    client
      .from("guestbook_entries")
      .select("id, author_name, body, status, created_at")
      .eq("memorial_id", memorial.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("gestures")
      .select("id, kind, display_name, message, expires_at")
      .eq("memorial_id", memorial.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  return {
    memorial,
    photos,
    guestbook: (guestbook.data ?? []).map(
      (entry): GuestbookEntry => ({
        id: entry.id,
        authorName: entry.author_name,
        body: entry.body,
        status: entry.status as GuestbookEntry["status"],
        createdAt: entry.created_at,
      }),
    ),
    gestures: (gestures.data ?? []).map(
      (gesture): Gesture => ({
        id: gesture.id,
        kind: gesture.kind as GestureKind,
        displayName: gesture.display_name,
        message: gesture.message,
        expiresAt: gesture.expires_at,
      }),
    ),
    timeline: (timeline.data ?? []).map(
      (event): TimelineEvent => ({
        id: event.id,
        date: event.event_date,
        precision: event.date_precision as TimelineEvent["precision"],
        title: event.title,
        body: event.body,
      }),
    ),
    letters: (letters.data ?? []).map(
      (letter): Letter => ({ id: letter.id, writtenOn: letter.written_on, title: letter.title, body: letter.body }),
    ),
    shareKey,
  };
}

/** Javni, objavljeni memorijal po adresi. Predmemorira se i osvježava oznakom nakon izmjene. */
export async function getPublicMemorialBySlug(slug: string): Promise<MemorialView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`memorial-slug:${slug}`);
  const client = createAnonClient();
  const { data } = await client
    .from("memorials")
    .select(MEMORIAL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();
  if (!data) {
    return null;
  }
  cacheTag(`memorial:${data.id}`);
  return loadView(client, toMemorial(data as MemorialRow), null);
}

/** Memorijal „samo s linkom": RLS ga vraća jedino uz ispravan ključ u zaglavlju. */
export async function getUnlistedMemorialByKey(shareKey: string): Promise<MemorialView | null> {
  if (!/^[a-f0-9]{32}$/.test(shareKey)) {
    return null;
  }
  // Nikad se ne predmemorira: privatnost se može promijeniti u svakom trenutku.
  await connection();
  const client = createAnonClient({ shareKey });
  const { data } = await client
    .from("memorials")
    .select(MEMORIAL_COLUMNS)
    .eq("status", "published")
    .eq("visibility", "unlisted")
    .maybeSingle();
  if (!data) {
    return null;
  }
  return loadView(client, toMemorial(data as MemorialRow), shareKey);
}

/**
 * Memorijal po adresi za prijavljenog vlasnika, suradnika ili admina: privatni, „samo s
 * linkom", nacrt ili skriven. Drugima RLS ne vraća ništa.
 */
export async function getMemberMemorialBySlug(slug: string): Promise<MemorialView | null> {
  const viewer = await getViewer();
  if (!viewer) {
    return null;
  }
  const client = await createSessionClient();
  const { data } = await client.from("memorials").select(MEMORIAL_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) {
    return null;
  }
  return loadView(client, toMemorial(data as MemorialRow), null);
}

export type EditableMemorial = { memorial: Memorial; photos: Photo[]; isOwner: boolean };

/** Memorijal koji trenutni korisnik smije uređivati (vlasnik ili suradnik), s fotografijama. */
export async function getEditableMemorial(id: string): Promise<EditableMemorial | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return null;
  }
  const viewer = await getViewer();
  if (!viewer) {
    return null;
  }
  const client = await createSessionClient();
  const [{ data: row }, { data: canEdit }] = await Promise.all([
    client.from("memorials").select(MEMORIAL_COLUMNS).eq("id", id).maybeSingle(),
    client.rpc("can_edit_memorial", { p_memorial_id: id }),
  ]);
  if (!row || canEdit !== true) {
    return null;
  }
  const memorial = toMemorial(row as MemorialRow);
  return {
    memorial,
    photos: await loadPhotos(client, id),
    isOwner: memorial.ownerId === viewer.id,
  };
}

/** Cijeli prikaz za pregled prije objave: iste komponente kao javna stranica. */
export async function getPreviewView(id: string): Promise<MemorialView | null> {
  const editable = await getEditableMemorial(id);
  if (!editable) {
    return null;
  }
  const client = await createSessionClient();
  const view = await loadView(client, editable.memorial, null);
  // Pregled ne prikazuje poruke ni geste: one nastaju tek nakon objave.
  return { ...view, guestbook: [], gestures: [] };
}

/** Svi memorijali trenutnog korisnika, najnoviji prvi. */
export async function listMyMemorials(): Promise<Memorial[]> {
  const viewer = await getViewer();
  if (!viewer) {
    return [];
  }
  const client = await createSessionClient();
  const { data } = await client
    .from("memorials")
    .select(MEMORIAL_COLUMNS)
    .eq("owner_id", viewer.id)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => toMemorial(row as MemorialRow));
}
