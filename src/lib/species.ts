/** Vrste koje nudimo pri izradi. Ključ se sprema u bazu, naziv se prikazuje. */
export const SPECIES = [
  { key: "pas", label: "pas" },
  { key: "macka", label: "mačka" },
  { key: "kunic", label: "kunić" },
  { key: "zamorac", label: "zamorac" },
  { key: "hrcak", label: "hrčak" },
  { key: "ptica", label: "ptica" },
  { key: "kornjaca", label: "kornjača" },
  { key: "konj", label: "konj" },
  { key: "tvor", label: "tvor" },
  { key: "riba", label: "riba" },
  { key: "drugo", label: "drugi ljubimac" },
] as const;

export type SpeciesKey = (typeof SPECIES)[number]["key"];

export const SPECIES_KEYS = SPECIES.map((item) => item.key) as [SpeciesKey, ...SpeciesKey[]];

export function speciesLabel(key: string | null): string | null {
  return SPECIES.find((item) => item.key === key)?.label ?? null;
}
