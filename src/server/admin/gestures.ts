import "server-only";
import { createSessionClient } from "@/server/supabase/session";
import { PAGE_SIZE, type MemorialRef } from "./queries";

/** Geste za adminov popis. */

export const GESTURE_FILTERS = ["active", "expired", "hidden", "all"] as const;
export type GestureFilter = (typeof GESTURE_FILTERS)[number];
export const DEFAULT_GESTURE_FILTER: GestureFilter = "active";

export function parseGestureFilter(value: string): GestureFilter {
  return GESTURE_FILTERS.find((filter) => filter === value) ?? DEFAULT_GESTURE_FILTER;
}

export type GestureState = "active" | "expired" | "hidden" | "refunded";

/** Stanje za prikaz: aktivna gesta kojoj je prošao rok je „istekla". `now` je trenutak zahtjeva. */
export function gestureState(status: string, expiresAt: string, now: number): GestureState {
  if (status === "hidden" || status === "refunded") {
    return status;
  }
  return new Date(expiresAt).getTime() <= now ? "expired" : "active";
}

export type GestureListItem = {
  id: string;
  kind: string;
  displayName: string;
  message: string | null;
  expiresAt: string;
  state: GestureState;
  memorial: MemorialRef | null;
};

export type GestureList = { gestures: GestureListItem[]; total: number };

export async function loadGestures(filter: GestureFilter, page: number): Promise<GestureList> {
  const supabase = await createSessionClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let query = supabase
    .from("gestures")
    .select("id, kind, display_name, message, expires_at, status, memorial:memorials(id, name, slug, status, visibility)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter === "active") {
    query = query.eq("status", "active").gt("expires_at", nowIso);
  } else if (filter === "expired") {
    query = query.eq("status", "active").lte("expires_at", nowIso);
  } else if (filter === "hidden") {
    query = query.eq("status", "hidden");
  }
  const result = await query;
  // Stranica iza kraja popisa nije greška; samo je prazna.
  if (result.error && result.error.code !== "PGRST103") {
    throw new Error(`Admin (geste): ${result.error.message}`);
  }
  return {
    gestures: (result.data ?? []).map((gesture) => ({
      id: gesture.id,
      kind: gesture.kind,
      displayName: gesture.display_name,
      message: gesture.message,
      expiresAt: gesture.expires_at,
      state: gestureState(gesture.status, gesture.expires_at, now),
      memorial: gesture.memorial,
    })),
    total: result.count ?? 0,
  };
}
