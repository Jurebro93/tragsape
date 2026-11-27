import type { MemorialView } from "@/lib/memorial";
import { EXAMPLE_PETS, type ExamplePetKey } from "@/lib/examples";

/**
 * Cijeli izmišljeni spomeni za stranice primjera, po jedan za svakog ljubimca s naslovnice i Livade.
 * Nijedan podatak ne dolazi iz baze; stranica ih prikazuje s oznakom „Primjer" i bez slanja ičega.
 */

const medo: MemorialView = {
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

type Extra = Pick<
  MemorialView["memorial"],
  | "id"
  | "slug"
  | "name"
  | "species"
  | "breed"
  | "sex"
  | "birthDate"
  | "deathDate"
  | "dedication"
  | "storyMd"
  | "traits"
  | "favoriteToy"
  | "favoriteTreat"
  | "favoritePlace"
  | "theme"
  | "candleCount"
>;

function fromMedo(
  extra: Extra,
  rest: Pick<MemorialView, "timeline" | "gestures" | "guestbook">,
): MemorialView {
  return {
    ...medo,
    memorial: { ...medo.memorial, ...extra },
    timeline: rest.timeline,
    gestures: rest.gestures,
    guestbook: rest.guestbook,
  };
}

const mrvica = fromMedo(
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "mrvica",
    name: "Mrvica",
    species: "macka",
    breed: "europska kratkodlaka mačka",
    sex: "z",
    birthDate: "2009-04-20",
    deathDate: "2026-03-11",
    dedication: "Najtiša sustanarka na svijetu. Hvala ti za svako jutro na prozoru.",
    storyMd:
      "Mrvica je stigla iz kartonske kutije ispred dućana, toliko mala da je stala na dlan. Ime je dobila jer je jela sve što bi palo sa stola.\n\nSedamnaest godina pratila je sunce kroz stan: ujutro prozor u kuhinji, popodne fotelja, navečer naše krilo.",
    traits: ["tiha", "uporna", "ljubiteljica sunca", "šefica fotelje"],
    favoriteToy: "pero na štapu",
    favoriteTreat: "komadić kuhane piletine",
    favoritePlace: "prozor u kuhinji",
    theme: "album",
    candleCount: 127,
  },
  {
    timeline: [
      { id: "m1", date: "2009-06-01", precision: "month", title: "Došla iz kutije ispred dućana", body: null },
      { id: "m2", date: "2016-01-01", precision: "year", title: "Preselila se s nama u novi stan", body: "Prvi dan je provela u ormaru, drugi na prozoru." },
      { id: "m3", date: "2026-03-11", precision: "day", title: "Zaspala kod kuće", body: null },
    ],
    gestures: [
      { id: "mg1", kind: "svijeca", displayName: "Petra", message: "Tvoj prozor je još tvoj.", expiresAt: "2027-01-01T00:00:00Z" },
      { id: "mg2", kind: "cvijet", displayName: "teta Vesna", message: null, expiresAt: "2027-01-01T00:00:00Z" },
    ],
    guestbook: [
      { id: "mp1", authorName: "Petra", body: "Jedina mačka koja me pustila da je mazim već prvi dan.", status: "approved", createdAt: "2026-03-13T09:00:00Z" },
    ],
  },
);

const grof = fromMedo(
  {
    id: "00000000-0000-4000-8000-000000000003",
    slug: "grof",
    name: "Grof",
    species: "kunic",
    breed: "patuljasti kunić",
    sex: "m",
    birthDate: "2018-05-02",
    deathDate: "2026-08-19",
    dedication: "Mali gospodin koji je znao točno kad je vrijeme za mrkvu.",
    storyMd:
      "Grofa smo dobili kad je kći imala osam godina. Ime je izabrala ona, jer je i najmanji kunić u kavezu sjedio kao da mu sve pripada.\n\nOsam godina je svako jutro u sedam lupkao nogom o pod, dok netko ne bi ustao i donio sijeno.",
    traits: ["dostojanstven", "znatiželjan", "budilica u sedam"],
    favoriteToy: "kartonski tunel",
    favoriteTreat: "list peršina",
    favoritePlace: "tepih uz balkonska vrata",
    theme: "livada",
    candleCount: 41,
  },
  {
    timeline: [
      { id: "g1", date: "2018-07-01", precision: "month", title: "Došao u obitelj", body: "Kći mu je odabrala ime." },
      { id: "g2", date: "2026-08-19", precision: "day", title: "Oprostili smo se", body: null },
    ],
    gestures: [
      { id: "gg1", kind: "sapica", displayName: "Lucija", message: "Moj prvi ljubimac. Hvala ti.", expiresAt: "2027-01-01T00:00:00Z" },
    ],
    guestbook: [
      { id: "gp1", authorName: "baka Ana", body: "Nikad nisam mislila da kunić može imati toliko karaktera.", status: "approved", createdAt: "2026-08-21T09:00:00Z" },
    ],
  },
);

const kiki = fromMedo(
  {
    id: "00000000-0000-4000-8000-000000000004",
    slug: "kiki",
    name: "Kiki",
    species: "ptica",
    breed: "papiga tigrica",
    sex: "z",
    birthDate: "2015-03-01",
    deathDate: "2025-12-04",
    dedication: "Deset godina jutarnjeg pjevanja. Kuhinja je sada pretiha.",
    storyMd:
      "Kiki je pjevala čim bi netko upalio svjetlo u kuhinji. Naučila je zviždati melodiju zvona na vratima, pa smo godinama otvarali vrata nikome.\n\nNajviše je voljela sjediti na ramenu dok se kuha kava.",
    traits: ["glasna", "društvena", "imitatorica zvona"],
    favoriteToy: "zvončić u kavezu",
    favoriteTreat: "proso",
    favoritePlace: "rame uz kavu",
    theme: "suncano-jutro",
    candleCount: 63,
  },
  {
    timeline: [
      { id: "k1", date: "2015-05-01", precision: "month", title: "Došla u kuhinju", body: null },
      { id: "k2", date: "2019-01-01", precision: "year", title: "Naučila zviždati zvono na vratima", body: null },
      { id: "k3", date: "2025-12-04", precision: "day", title: "Posljednje jutro", body: null },
    ],
    gestures: [
      { id: "kg1", kind: "svijeca", displayName: "Marko", message: "Fali mi tvoje zvono.", expiresAt: "2027-01-01T00:00:00Z" },
    ],
    guestbook: [
      { id: "kp1", authorName: "susjed Ivo", body: "Čuo sam je kroz zid svako jutro. Sad znam koliko mi je to značilo.", status: "approved", createdAt: "2025-12-06T09:00:00Z" },
    ],
  },
);

const EXAMPLE_MEMORIALS: Record<ExamplePetKey, MemorialView> = { medo, mrvica, grof, kiki };

export function exampleMemorial(key: ExamplePetKey): MemorialView {
  return EXAMPLE_MEMORIALS[key];
}

/** Adresa primjera: Medo je na /primjer, ostali na /primjer/{ključ}. */
export function examplePath(key: ExamplePetKey): string {
  return key === "medo" ? "/primjer" : `/primjer/${key}`;
}

export function isExamplePetKey(value: string): value is ExamplePetKey {
  return EXAMPLE_PETS.some((pet) => pet.key === value);
}
