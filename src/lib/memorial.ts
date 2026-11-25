import type { DatePrecision } from "@/lib/format";

export type Tier = "free" | "memorial" | "portrait";
export type Visibility = "public" | "unlisted" | "private";
export type MemorialStatus = "draft" | "published" | "hidden";
export type GuestbookMode = "premoderate" | "open" | "off";

export const FREE_PHOTO_LIMIT = 5;
export const PAID_PHOTO_LIMIT = 50;
export const DEDICATION_MAX = 300;

/** Stupci memorijala koje smije čitati svaka uloga. Uvijek se navode izričito. */
export const MEMORIAL_COLUMNS =
  "id, owner_id, slug, status, tier, visibility, name, species, breed, sex, birth_date, birth_precision, death_date, death_precision, adoption_date, dedication, story_md, nicknames, traits, favorite_toy, favorite_treat, favorite_place, funny_habits, video_url, theme, cover_photo_id, guestbook_mode, candle_count, draft_step, published_at, updated_at" as const;

export type MemorialRow = {
  id: string;
  owner_id: string;
  slug: string;
  status: string;
  tier: string;
  visibility: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  birth_precision: string;
  death_date: string | null;
  death_precision: string;
  adoption_date: string | null;
  dedication: string | null;
  story_md: string | null;
  nicknames: string[];
  traits: string[];
  favorite_toy: string | null;
  favorite_treat: string | null;
  favorite_place: string | null;
  funny_habits: string | null;
  video_url: string | null;
  theme: string;
  cover_photo_id: string | null;
  guestbook_mode: string;
  candle_count: number;
  draft_step: number;
  published_at: string | null;
  updated_at: string;
};

export type Memorial = {
  id: string;
  ownerId: string;
  slug: string;
  status: MemorialStatus;
  tier: Tier;
  visibility: Visibility;
  name: string;
  species: string | null;
  breed: string | null;
  sex: "m" | "z" | null;
  birthDate: string | null;
  birthPrecision: DatePrecision;
  deathDate: string | null;
  deathPrecision: DatePrecision;
  adoptionDate: string | null;
  dedication: string | null;
  storyMd: string | null;
  nicknames: string[];
  traits: string[];
  favoriteToy: string | null;
  favoriteTreat: string | null;
  favoritePlace: string | null;
  funnyHabits: string | null;
  videoUrl: string | null;
  theme: string;
  coverPhotoId: string | null;
  guestbookMode: GuestbookMode;
  candleCount: number;
  draftStep: number;
  publishedAt: string | null;
  updatedAt: string;
};

export function toMemorial(row: MemorialRow): Memorial {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    status: row.status as MemorialStatus,
    tier: row.tier as Tier,
    visibility: row.visibility as Visibility,
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: (row.sex as "m" | "z" | null) ?? null,
    birthDate: row.birth_date,
    birthPrecision: row.birth_precision as DatePrecision,
    deathDate: row.death_date,
    deathPrecision: row.death_precision as DatePrecision,
    adoptionDate: row.adoption_date,
    dedication: row.dedication,
    storyMd: row.story_md,
    nicknames: row.nicknames ?? [],
    traits: row.traits ?? [],
    favoriteToy: row.favorite_toy,
    favoriteTreat: row.favorite_treat,
    favoritePlace: row.favorite_place,
    funnyHabits: row.funny_habits,
    videoUrl: row.video_url,
    theme: row.theme,
    coverPhotoId: row.cover_photo_id,
    guestbookMode: row.guestbook_mode as GuestbookMode,
    candleCount: row.candle_count,
    draftStep: row.draft_step,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export type Photo = {
  id: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  kind: "photo" | "ai_portrait";
};

export type GuestbookEntry = {
  id: string;
  authorName: string;
  body: string;
  status: "pending" | "approved" | "hidden" | "removed";
  createdAt: string;
};

export type GestureKind = "svijeca" | "sapica" | "cvijet" | "poslastica" | "loptica";

export type Gesture = {
  id: string;
  kind: GestureKind;
  displayName: string;
  message: string | null;
  expiresAt: string;
};

/** Sve što stranica memorijala treba za prikaz jednom posjetitelju. */
export type MemorialView = {
  memorial: Memorial;
  photos: Photo[];
  guestbook: GuestbookEntry[];
  gestures: Gesture[];
  /** Ključ za „samo s linkom"; dodaje se adresama slika i javnim unosima. */
  shareKey: string | null;
};

export function isPaid(tier: Tier): boolean {
  return tier !== "free";
}

export type PhotoVariant = "thumb" | "medium" | "full";

/** Adresa slike kroz rutu koja provjerava pristup. */
export function photoUrl(photoId: string, variant: PhotoVariant, shareKey?: string | null): string {
  const base = `/slike/${photoId}/${variant}`;
  return shareKey ? `${base}?k=${encodeURIComponent(shareKey)}` : base;
}

/**
 * Što se javno prikazuje ovisi o paketu: besplatni spomen pokazuje naslovnu fotografiju i
 * posvetu, a ostatak profila tek uz Memorijal. Podaci ostaju spremljeni i čekaju nadogradnju.
 */
export function presentForTier(view: MemorialView): MemorialView {
  const { memorial } = view;
  if (isPaid(memorial.tier)) {
    return view;
  }
  const cover = view.photos.find((photo) => photo.id === memorial.coverPhotoId) ?? view.photos[0];
  return {
    ...view,
    photos: cover ? [cover] : [],
    memorial: {
      ...memorial,
      storyMd: null,
      nicknames: [],
      traits: [],
      favoriteToy: null,
      favoriteTreat: null,
      favoritePlace: null,
      funnyHabits: null,
      videoUrl: null,
      adoptionDate: null,
    },
  };
}
