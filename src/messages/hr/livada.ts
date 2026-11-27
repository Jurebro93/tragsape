/** Livada sjećanja, sat svijeća i obiteljska stranica. */
export const livada = {
  title: "Livada sjećanja",
  intro: "Zajedničko mjesto svih ljubimaca čiji su vlasnici odlučili podijeliti spomen. Zastani kod nekoga i zapali svijeću.",
  memorialsTitle: "Spomen-stranice na Livadi",
  metaDescription: "Livada sjećanja: javni spomeni ljubimaca na Tragu šape. Svake večeri u 21:00 je sat svijeća.",
  filter: {
    species: "Vrsta",
    allSpecies: "Sve vrste",
    breed: "Pasmina",
    allBreeds: "Sve pasmine",
    apply: "Prikaži",
    clear: "Poništi filtre",
  },
  about: {
    title: "Kako Livada radi",
    items: [
      { title: "Tko je ovdje", body: "Svaki javni spomen, besplatni i plaćeni. Privatni i oni samo s poveznicom nikad." },
      { title: "Svijeća", body: "Besplatna, jedna dnevno po posjetitelju za svakog ljubimca. Broj se vidi na kartici." },
      { title: "Sat svijeća", body: "Od 21:00 do 22:00 Livada pokazuje sve svijeće upaljene te večeri od 18:00." },
      { title: "Pretraga", body: "Po vrsti i pasmini, pa lako nađeš ljubimce slične svome." },
    ],
  },
  examples: {
    title: "Kako izgleda mjesto na Livadi",
    note: "Ovi ljubimci su izmišljeni primjeri. Klik otvara primjer cijelog spomena.",
  },
  empty: {
    title: "Prvi spomeni upravo nastaju",
    body: "Livada se puni kako vlasnici objavljuju spomene. Tvoj može biti među prvima.",
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
