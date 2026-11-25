import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { slugFromInput } from "./forms";
import { must, type MemorialRef, type SessionClient } from "./queries";

/** Red prijava, skriveni spomeni i pretraga spomena po adresi. */

export const REPORT_LIMIT = 100;
const HIDDEN_LIMIT = 200;
const SEARCH_LIMIT = 10;

export type ModerationMemorial = MemorialRef & { tier: string; updatedAt: string };

export type ReportItem = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  reporterEmail: string | null;
  createdAt: string;
  /** Spomen na koji se prijava odnosi; null ako više ne postoji. */
  memorial: ModerationMemorial | null;
  entry: { authorName: string; body: string; status: string } | null;
  gesture: { kind: string; displayName: string; message: string | null; status: string } | null;
  photo: { id: string; caption: string | null } | null;
};

export type ModerationData = {
  reports: ReportItem[];
  openReports: number;
  hidden: ModerationMemorial[];
  /** Rezultat pretrage; null kad se ništa nije tražilo. */
  search: { query: string; results: ModerationMemorial[] } | null;
};

const MEMORIAL_COLUMNS = "id, name, slug, status, visibility, tier, updated_at";

type MemorialRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
  tier: string;
  updated_at: string;
};

function toMemorial(row: MemorialRow): ModerationMemorial {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    visibility: row.visibility,
    tier: row.tier,
    updatedAt: row.updated_at,
  };
}

async function searchMemorials(supabase: SessionClient, slug: string): Promise<ModerationMemorial[]> {
  const exact = must(
    await supabase.from("memorials").select(MEMORIAL_COLUMNS).eq("slug", slug).limit(1),
    "pretraga spomena",
  );
  if (exact.length > 0) {
    return exact.map(toMemorial);
  }
  // Adresa sadrži samo slova, brojke i crtice, pa u uzorku nema posebnih znakova.
  const prefixed = must(
    await supabase
      .from("memorials")
      .select(MEMORIAL_COLUMNS)
      .like("slug", `${slug}%`)
      .order("slug")
      .limit(SEARCH_LIMIT),
    "pretraga spomena",
  );
  return prefixed.map(toMemorial);
}

export async function loadModeration(searchInput: string): Promise<ModerationData> {
  const supabase = await createSessionClient();
  const typed = searchInput.trim();
  const slug = slugFromInput(typed);

  const [reportsResult, hidden, searchResults] = await Promise.all([
    supabase
      .from("reports")
      .select("id, target_type, target_id, memorial_id, reason, details, reporter_email, created_at", {
        count: "exact",
      })
      .eq("status", "open")
      .order("created_at")
      .order("id")
      .limit(REPORT_LIMIT),
    supabase
      .from("memorials")
      .select(MEMORIAL_COLUMNS)
      .eq("status", "hidden")
      .order("updated_at", { ascending: false })
      .limit(HIDDEN_LIMIT)
      .then((result) => must(result, "skriveni spomeni")),
    slug === "" ? Promise.resolve(null) : searchMemorials(supabase, slug),
  ]);
  const reports = must(reportsResult, "prijave");

  const idsOf = (type: string) => [
    ...new Set(reports.filter((report) => report.target_type === type).map((report) => report.target_id)),
  ];
  const entryIds = idsOf("guestbook_entry");
  const gestureIds = idsOf("gesture");
  const photoIds = idsOf("photo");

  const [entries, gestures, photos] = await Promise.all([
    entryIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("guestbook_entries")
          .select("id, memorial_id, author_name, body, status")
          .in("id", entryIds)
          .then((result) => must(result, "prijavljene poruke")),
    gestureIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("gestures")
          .select("id, memorial_id, kind, display_name, message, status")
          .in("id", gestureIds)
          .then((result) => must(result, "prijavljene geste")),
    photoIds.length === 0
      ? Promise.resolve([])
      : supabase
          .from("memorial_photos")
          .select("id, memorial_id, caption")
          .in("id", photoIds)
          .then((result) => must(result, "prijavljene fotografije")),
  ]);
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const gestureById = new Map(gestures.map((gesture) => [gesture.id, gesture]));
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  /** Spomen prijave: onaj upisan uz prijavu, inače onaj kojem prijavljeni sadržaj pripada. */
  const memorialIdOf = (report: (typeof reports)[number]): string | null =>
    report.memorial_id ??
    (report.target_type === "memorial"
      ? report.target_id
      : (entryById.get(report.target_id)?.memorial_id ??
        gestureById.get(report.target_id)?.memorial_id ??
        photoById.get(report.target_id)?.memorial_id ??
        null));

  const memorialIds = [...new Set(reports.map(memorialIdOf).filter((id): id is string => id !== null))];
  const memorials =
    memorialIds.length === 0
      ? []
      : must(await supabase.from("memorials").select(MEMORIAL_COLUMNS).in("id", memorialIds), "prijavljeni spomeni");
  const memorialById = new Map(memorials.map((memorial) => [memorial.id, toMemorial(memorial)]));

  return {
    reports: reports.map((report) => {
      const memorialId = memorialIdOf(report);
      const entry = report.target_type === "guestbook_entry" ? entryById.get(report.target_id) : undefined;
      const gesture = report.target_type === "gesture" ? gestureById.get(report.target_id) : undefined;
      const photo = report.target_type === "photo" ? photoById.get(report.target_id) : undefined;
      return {
        id: report.id,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
        details: report.details,
        reporterEmail: report.reporter_email,
        createdAt: report.created_at,
        memorial: memorialId ? (memorialById.get(memorialId) ?? null) : null,
        entry: entry ? { authorName: entry.author_name, body: entry.body, status: entry.status } : null,
        gesture: gesture
          ? {
              kind: gesture.kind,
              displayName: gesture.display_name,
              message: gesture.message,
              status: gesture.status,
            }
          : null,
        photo: photo ? { id: photo.id, caption: photo.caption } : null,
      };
    }),
    openReports: reportsResult.count ?? reports.length,
    hidden: hidden.map(toMemorial),
    // Unos koji ne može biti adresa također je „nema takvog spomena", a ne tišina.
    search: typed === "" ? null : { query: slug || typed.slice(0, 80), results: searchResults ?? [] },
  };
}
