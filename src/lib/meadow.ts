/**
 * Velika livada: raspored cvjetova, vrste, boje i provjera imena. Čista logika, dijeli se s klijentom.
 *
 * Mjesto cvijeta izvodi se iz rednog broja (Vogelova spirala sa zlatnim kutom), pa se položaj ne sprema,
 * cvjetovi se nikad ne preklapaju, a livada raste prema van kako ih je više. Broj 1 je u sredini.
 */

export const MEADOW_SPECIES = ["pas", "macka", "kunic", "ptica", "drugo"] as const;
export type MeadowSpecies = (typeof MEADOW_SPECIES)[number];

export const MEADOW_PETALS = ["terakota", "teal", "sunce", "sljiva", "koralj", "bijela"] as const;
export type MeadowPetal = (typeof MEADOW_PETALS)[number];

/** Boje za crtanje na platnu; iste vrijednosti kao tokeni u globals.css (koralj i šljiva su njihove nijanse). */
export const PETAL_COLORS: Record<MeadowPetal, string> = {
  terakota: "#C2451F",
  teal: "#1F6F6B",
  sunce: "#F8B93B",
  sljiva: "#8E5A7A",
  koralj: "#E07B53",
  bijela: "#FFFFFF",
};

export const SPECIES_COLORS: Record<MeadowSpecies, string> = {
  pas: "#C2451F",
  macka: "#1F6F6B",
  kunic: "#F8B93B",
  ptica: "#8E5A7A",
  drugo: "#33242B",
};

/** Razmak među cvjetovima u jedinicama svijeta; cvijet je promjera oko 26 jedinica. */
export const FLOWER_SPACING = 34;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Livada je šira nego viša, kao krajolik. */
const STRETCH_X = 1.55;
const STRETCH_Y = 0.75;

/** Stalan pseudoslučajan broj u [0, 1) za zadani broj traga i sol; isti ulaz, isti izlaz. */
function noise(number: number, salt: number): number {
  const value = Math.sin(number * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Mjesto cvijeta. Spirala daje ravnomjeran razmak, a mali stalni pomak skriva njezin uzorak,
 * pa izdaleka livada izgleda prirodno, a cvjetovi se i dalje ne preklapaju.
 */
export function flowerPosition(number: number): { x: number; y: number } {
  const radius = FLOWER_SPACING * Math.sqrt(Math.max(0, number - 0.5));
  const angle = number * GOLDEN_ANGLE;
  const jitter = FLOWER_SPACING * 0.42;
  return {
    x: Math.cos(angle) * radius * STRETCH_X + (noise(number, 1) - 0.5) * jitter,
    y: Math.sin(angle) * radius * STRETCH_Y + (noise(number, 2) - 0.5) * jitter,
  };
}

/** Granice livade za zadani najveći broj, s rubom za sunce, nebo i natpise. */
export function meadowBounds(maxNumber: number): { minX: number; maxX: number; minY: number; maxY: number } {
  const radius = FLOWER_SPACING * Math.sqrt(Math.max(60, maxNumber)) + 140;
  return { minX: -radius * STRETCH_X, maxX: radius * STRETCH_X, minY: -radius * STRETCH_Y - 260, maxY: radius * STRETCH_Y + 80 };
}

/** Riječi koje se ne smiju pojaviti u imenu na javnoj livadi. Popis je namjerno kratak; ostalo moderira admin. */
const BLOCKED = ["kurac", "kurc", "pička", "picka", "pičk", "jebe", "jeb", "sranje", "govno", "peder", "kurva", "drolja", "šupak", "supak", "nigger", "fuck", "shit", "porn", "http", "www."];

export type NameCheck = { ok: true; name: string } | { ok: false; reason: "empty" | "long" | "chars" | "blocked" };

/** Ime za javnu livadu: 1–30 znakova, slova (i č, ć, ž, š, đ), razmak, crtica, točka i apostrof. */
export function checkFlowerName(input: string): NameCheck {
  const name = input.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name === "") {
    return { ok: false, reason: "empty" };
  }
  if ([...name].length > 30) {
    return { ok: false, reason: "long" };
  }
  if (!/^[\p{L}][\p{L} .'’-]*$/u.test(name)) {
    return { ok: false, reason: "chars" };
  }
  const lower = name.toLowerCase();
  if (BLOCKED.some((word) => lower.includes(word))) {
    return { ok: false, reason: "blocked" };
  }
  return { ok: true, name };
}

export function isMeadowSpecies(value: unknown): value is MeadowSpecies {
  return typeof value === "string" && (MEADOW_SPECIES as readonly string[]).includes(value);
}

export function isMeadowPetal(value: unknown): value is MeadowPetal {
  return typeof value === "string" && (MEADOW_PETALS as readonly string[]).includes(value);
}

/** Cvijet kako ga dobiva preglednik: [broj, ime, vrsta, boja, adresa spomena ili "", dan ostavljanja YYYY-MM-DD]. */
export type MeadowRow = [number, string, number, number, string, string];

/** Boje prizora na platnu (nebo, brežuljci, stabljike); nijanse tokena iz globals.css. */
export const SCENE_COLORS = {
  skyTop: "#FFF4D6",
  sky: "#FFE7A8",
  sun: "rgba(248,185,59,0.75)",
  sunRing: "rgba(248,185,59,0.45)",
  horizon: "rgba(194,69,31,0.22)",
  ground: "#E4ECD6",
  groundDeep: "#D3E3C8",
  hill: "#EAF0DC",
  stem: "#7FA889",
  label: "#33242B",
  labelHalo: "rgba(255,250,240,0.85)",
  glow: "rgba(255,255,255,0.95)",
  mineRing: "#1F6F6B",
  outline: "rgba(51,36,43,0.2)",
} as const;
