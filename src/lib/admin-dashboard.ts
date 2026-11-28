/**
 * Nadzorna ploča admina: pretvara odgovor funkcije `admin_dashboard` u stalne brojke i
 * slaže popis onoga što čeka pažnju. Čista logika, bez I/O.
 */

export type DashboardNumbers = {
  memorials: {
    created: number;
    published: number;
    publishedTotal: number;
    onMeadow: number;
    paidTotal: number;
    openDrafts: number;
  };
  /** Objavljeni spomeni po vrsti, od najbrojnije. */
  species: Array<{ key: string; count: number }>;
  trails: { new: number; total: number; waitingEmail: number; dedicationsPending: number };
  newsletter: { confirmed: number; newConfirmed: number; pending: number; unsubscribed: number };
  accounts: { total: number; new: number };
  engagement: { candles: number; messages: number; gestures: number };
  attention: { reports: number; questions: number; articlesInReview: number; stripeErrors: number };
  content: { articles: number; questionsTotal: number };
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

function record(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** Broj iz JSON-a; sve što nije konačan nenegativan broj postaje nula. */
function count(value: Json | undefined): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function pick<K extends string>(source: Json | undefined, keys: readonly K[]): Record<K, number> {
  const values = record(source);
  return Object.fromEntries(keys.map((key) => [key, count(values[key])])) as Record<K, number>;
}

export function readDashboard(data: Json | undefined): DashboardNumbers {
  const root = record(data);
  return {
    memorials: pick(root.memorials, ["created", "published", "publishedTotal", "onMeadow", "paidTotal", "openDrafts"]),
    species: Object.entries(record(root.species))
      .map(([key, value]) => ({ key, count: count(value) }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    trails: pick(root.trails, ["new", "total", "waitingEmail", "dedicationsPending"]),
    newsletter: pick(root.newsletter, ["confirmed", "newConfirmed", "pending", "unsubscribed"]),
    accounts: pick(root.accounts, ["total", "new"]),
    engagement: pick(root.engagement, ["candles", "messages", "gestures"]),
    attention: pick(root.attention, ["reports", "questions", "articlesInReview", "stripeErrors"]),
    content: pick(root.content, ["articles", "questionsTotal"]),
  };
}

export type AttentionKey = "reports" | "questions" | "dedications" | "articles" | "stripe";

/** Samo ono što stvarno čeka, redom važnosti; prazan popis znači da ništa ne čeka. */
export function attentionItems(numbers: DashboardNumbers): Array<{ key: AttentionKey; count: number; href: string }> {
  const items: Array<{ key: AttentionKey; count: number; href: string }> = [
    { key: "stripe", count: numbers.attention.stripeErrors, href: "/admin/postavke#stripe" },
    { key: "reports", count: numbers.attention.reports, href: "/admin/moderacija" },
    { key: "questions", count: numbers.attention.questions, href: "/admin/pitanja" },
    { key: "dedications", count: numbers.trails.dedicationsPending, href: "/admin/livada" },
    { key: "articles", count: numbers.attention.articlesInReview, href: "/admin/clanci" },
  ];
  return items.filter((item) => item.count > 0);
}

/** Udio u postocima, zaokružen; null kad se nema s čim usporediti. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}
