/**
 * Izmišljeni ljubimci za primjere na naslovnici i Livadi. Nijedan nije stvaran i nijedan podatak
 * ne dolazi iz baze; svugdje gdje se prikazuju stoji oznaka „Primjer".
 */

export type ExamplePetKey = "medo" | "mrvica" | "grof" | "kiki";

export type ExamplePet = {
  key: ExamplePetKey;
  name: string;
  kind: string;
  years: string;
  candles: number;
  dedication: string;
};

export const EXAMPLE_PETS: readonly ExamplePet[] = [
  {
    key: "medo",
    name: "Medo",
    kind: "zlatni retriver",
    years: "2012. – 2026.",
    candles: 348,
    dedication: "Čuvao si nam kuću, cipele i sve tajne.",
  },
  {
    key: "mrvica",
    name: "Mrvica",
    kind: "europska kratkodlaka mačka",
    years: "2009. – 2026.",
    candles: 127,
    dedication: "Najtiša sustanarka na svijetu. Hvala ti za svako jutro na prozoru.",
  },
  {
    key: "grof",
    name: "Grof",
    kind: "patuljasti kunić",
    years: "2018. – 2026.",
    candles: 41,
    dedication: "Mali gospodin koji je znao točno kad je vrijeme za mrkvu.",
  },
  {
    key: "kiki",
    name: "Kiki",
    kind: "papiga tigrica",
    years: "2015. – 2025.",
    candles: 63,
    dedication: "Deset godina jutarnjeg pjevanja. Kuhinja je sada pretiha.",
  },
];

export function examplePet(key: ExamplePetKey): ExamplePet {
  return EXAMPLE_PETS.find((pet) => pet.key === key) ?? EXAMPLE_PETS[0];
}
