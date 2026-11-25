import "server-only";
import { updateTag } from "next/cache";
import { notFound } from "next/navigation";
import { isPaid, type Memorial } from "@/lib/memorial";
import { getViewer, requireMember, type Viewer } from "@/server/auth";
import { getEditableMemorial, memorialTags } from "@/server/memorials/access";

/** Prijavljeni korisnik i spomen koji smije uređivati (vlasnik ili suradnik). */
export type OwnerContext = {
  viewer: Viewer;
  memorial: Memorial;
  isOwner: boolean;
  /** Pisma, vremenska crta, suradnici, QR i podsjetnici postoje samo uz plaćeni paket. */
  paid: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Za stranice: bez prijave vodi na prijavu, a bez prava uređivanja stranica ne postoji. */
export async function requireOwnerPage(memorialId: string, path: string): Promise<OwnerContext> {
  const viewer = await requireMember(path);
  const editable = await getEditableMemorial(memorialId);
  if (!editable) {
    notFound();
  }
  return { viewer, memorial: editable.memorial, isOwner: editable.isOwner, paid: isPaid(editable.memorial.tier) };
}

/** Za akcije i route handlere: null znači da se radnja odbija. O pravu uređivanja odlučuje RLS. */
export async function getOwnerContext(memorialId: string): Promise<OwnerContext | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    return null;
  }
  const editable = await getEditableMemorial(memorialId);
  if (!editable) {
    return null;
  }
  return { viewer, memorial: editable.memorial, isOwner: editable.isOwner, paid: isPaid(editable.memorial.tier) };
}

/** Osvježava javnu stranicu objavljenog spomena. Zove se samo iz poslužiteljskih akcija. */
export function refreshPublicPage(memorial: Pick<Memorial, "id" | "slug" | "status">): void {
  if (memorial.status !== "published") {
    return;
  }
  for (const tag of memorialTags(memorial)) {
    updateTag(tag);
  }
}
