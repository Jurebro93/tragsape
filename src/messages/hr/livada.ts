/** Livada sjećanja, sat svijeća i obiteljska stranica. */
export const livada = {
  title: "Livada sjećanja",
  intro: "Zajedničko mjesto svih ljubimaca čiji su vlasnici odlučili podijeliti spomen. Zastani kod nekoga i zapali svijeću.",
  metaDescription: "Livada sjećanja: javni spomeni ljubimaca na Tragu šape. Svake večeri u 21:00 je sat svijeća.",
  filter: {
    species: "Vrsta",
    allSpecies: "Sve vrste",
    breed: "Pasmina",
    allBreeds: "Sve pasmine",
    apply: "Prikaži",
    clear: "Poništi filtre",
  },
  empty: {
    title: "Ovdje još nema nikoga",
    body: "Livada se puni kako vlasnici objavljuju spomene.",
    filtered: "Za ovaj izbor još nema spomena.",
    action: "Izradi spomen",
  },
  card: {
    candles: { one: "svijeća", few: "svijeće", other: "svijeća" },
  },
  next: "Sljedeća stranica",
  previous: "Prethodna stranica",
  candleHour: {
    note: "Svake večeri u 21:00 je sat svijeća: Livada tada pokazuje sve svijeće upaljene te večeri.",
    title: "Sat svijeća",
    summary: "Večeras gori {candles} za {pets}.",
    pets: { one: "ljubimca", few: "ljubimca", other: "ljubimaca" },
    none: "Večeras još nije upaljena nijedna svijeća. Prva može biti tvoja.",
  },
  family: {
    eyebrow: "Obiteljska stranica",
    empty: "Na ovoj stranici još nema javnih spomena.",
    metaDescription: "Svi ljubimci jedne obitelji na Tragu šape.",
    manage: {
      title: "Obiteljska stranica",
      body: "Jedna adresa za sve tvoje javne spomene. Privatni i oni samo s poveznicom na njoj se ne prikazuju.",
      name: "Naziv stranice",
      namePlaceholder: "npr. Obitelj Horvat",
      intro: "Nekoliko riječi",
      visible: "Stranica je javno dostupna",
      save: "Spremi obiteljsku stranicu",
      saved: "Spremljeno.",
      open: "Otvori obiteljsku stranicu",
      titleRequired: "Upiši naziv stranice.",
    },
  },
} as const;
