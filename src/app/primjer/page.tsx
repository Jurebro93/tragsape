import type { Metadata } from "next";
import { ExampleIllustration } from "@/components/memorial/example-illustration";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import type { MemorialView } from "@/lib/memorial";

export const metadata: Metadata = {
  title: "Primjer memorijala",
  description: "Pogledaj kako izgleda spomen-stranica na Tragu šape. Ljubimac na ovom primjeru je izmišljen.",
};

/** Izmišljeni ljubimac, jasno označen kao primjer. Nijedan podatak ne dolazi iz baze. */
const example: MemorialView = {
  shareKey: null,
  memorial: {
    id: "00000000-0000-4000-8000-000000000001",
    ownerId: "00000000-0000-4000-8000-000000000000",
    slug: "primjer",
    status: "published",
    tier: "memorial",
    visibility: "public",
    name: "Medo",
    species: "pas",
    breed: "zlatni retriver",
    sex: "m",
    birthDate: "2012-03-14",
    birthPrecision: "day",
    deathDate: "2026-10-02",
    deathPrecision: "day",
    adoptionDate: null,
    dedication: "Čuvao si nam kuću, cipele i sve tajne. Hvala ti na svakom dočeku na vratima.",
    storyMd:
      "Medo je došao u našu obitelj jedne kišne subote u svibnju 2012., kao štene koje je stalo u kutiju za cipele. Sjesti je naučio za tri dana, a čekati na ručak nikad.\n\nLjeta je provodio na moru, a zime pred radijatorom, na mjestu koje je smatrao svojim.",
    nicknames: [],
    traits: ["nježan", "tvrdoglav oko šetnje", "kradljivac čarapa", "prijatelj svih poštara"],
    favoriteToy: "žuta teniska loptica",
    favoriteTreat: "kriška jabuke",
    favoritePlace: "livada iza kuće",
    funnyHabits: null,
    videoUrl: null,
    theme: "suncano-jutro",
    coverPhotoId: null,
    guestbookMode: "premoderate",
    candleCount: 348,
    draftStep: 3,
    publishedAt: "2026-10-04T10:00:00Z",
    updatedAt: "2026-10-04T10:00:00Z",
  },
  photos: [],
  timeline: [
    { id: "t1", date: "2012-05-12", precision: "month", title: "Došao u obitelj", body: "Stao je u kutiju za cipele." },
    { id: "t2", date: "2015-07-01", precision: "year", title: "Prvo ljeto na moru", body: null },
    { id: "t3", date: "2026-09-28", precision: "day", title: "Posljednja šetnja livadom", body: null },
  ],
  letters: [],
  gestures: [
    { id: "g1", kind: "svijeca", displayName: "Ana i Luka", message: "Najbolji susjed u ulici.", expiresAt: "2027-01-01T00:00:00Z" },
    { id: "g2", kind: "cvijet", displayName: "baka Marija", message: "Falit ćeš mi na klupi ispred kuće.", expiresAt: "2027-01-01T00:00:00Z" },
    { id: "g3", kind: "loptica", displayName: "Filip", message: "Hvala za sve utakmice u dvorištu.", expiresAt: "2027-01-01T00:00:00Z" },
  ],
  guestbook: [
    {
      id: "p1",
      authorName: "Ivana, susjeda",
      body: "Uvijek je prvi dotrčao do ograde. Ulica je tiša bez njega.",
      status: "approved",
      createdAt: "2026-10-05T09:00:00Z",
    },
    {
      id: "p2",
      authorName: "Tomislav",
      body: "Sjećam se kako je na moru čuvao ručnike kao da su ovce.",
      status: "approved",
      createdAt: "2026-10-09T09:00:00Z",
    },
  ],
};

export default function ExamplePage() {
  return <MemorialScreen view={example} mode="example" illustration={<ExampleIllustration />} />;
}
