/**
 * Velika livada: raspored cvjetova, vrste, boje i provjera imena. Čista logika, dijeli se s klijentom.
 *
 * Mjesto cvijeta izvodi se iz rednog broja, pa se položaj ne sprema. Cvjetovi popunjavaju otiske šapa;
 * kad se jedan otisak popuni, trag se nastavlja sljedećim, pa mjesta ima neograničeno.
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
/** Gustoća slaganja: koliko površine dobiva jedan cvijet (malo više od razmaka na kvadrat). */
const AREA_PER_FLOWER = 41 * 41;
/** Veličina otiska šape u jedinicama svijeta. */
const PAW = 1.6;
/** Razmak između dva otiska duž traga i pomak lijeve i desne šape od sredine traga. */
const STRIDE = 1650 * (PAW / 1.6);
const SIDE = 520 * (PAW / 1.6);

/** Stalan pseudoslučajan broj u [0, 1) za zadani broj traga i sol; isti ulaz, isti izlaz. */
function noise(number: number, salt: number): number {
  const value = Math.sin(number * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export type PadKind = "main" | "toe";

/** Jastučić otiska u koordinatama otiska (prsti gledaju prema gore, prema negativnom y). */
type PadShape = { kind: PadKind; x: number; y: number; rx: number; ry: number; rot: number; capacity: number };

/** Veliki jastučić je pri vrhu uži, kao na pravoj šapi. */
const MAIN_TAPER = 0.14;

function padArea(rx: number, ry: number, kind: PadKind): number {
  return Math.PI * rx * ry * (kind === "main" ? 1 - MAIN_TAPER / 2 : 1);
}

function pad(kind: PadKind, x: number, y: number, rx: number, ry: number, rot: number): PadShape {
  const s = PAW;
  return {
    kind,
    x: x * s,
    y: y * s,
    rx: rx * s,
    ry: ry * s,
    rot,
    capacity: Math.floor(padArea(rx * s, ry * s, kind) / AREA_PER_FLOWER),
  };
}

/** Jedan otisak: veliki jastučić i četiri prsta. Redoslijed prstiju slijeva nadesno. */
const PADS: readonly PadShape[] = [
  pad("main", 0, 0, 300, 245, 0),
  pad("toe", -322, -262, 88, 114, -0.5),
  pad("toe", -124, -400, 92, 122, -0.12),
  pad("toe", 124, -400, 92, 122, 0.12),
  pad("toe", 322, -262, 88, 114, 0.5),
];

/** Broj mjesta u jednom otisku šape. */
export const PRINT_CAPACITY = PADS.reduce((sum, item) => sum + item.capacity, 0);

/**
 * Redoslijed popunjavanja unutar otiska: mjesta se dijele jastučićima razmjerno veličini,
 * pa se oblik šape vidi već s pet cvjetova i ravnomjerno popunjava.
 */
const ORDER: ReadonlyArray<readonly [number, number]> = (() => {
  const filled = PADS.map(() => 0);
  const order: Array<readonly [number, number]> = [];
  for (let k = 0; k < PRINT_CAPACITY; k++) {
    let best = 0;
    let bestRatio = Infinity;
    PADS.forEach((item, index) => {
      const ratio = filled[index] / item.capacity;
      if (filled[index] < item.capacity && ratio < bestRatio) {
        best = index;
        bestRatio = ratio;
      }
    });
    order.push([best, filled[best]]);
    filled[best] += 1;
  }
  return order;
})();

/** Smjer traga (0 = ravno gore) za otisak p: trag lagano vijuga, kao pas koji njuši livadu. */
function heading(print: number): number {
  return 0.95 * Math.sin(print * 0.2) + 0.12 * Math.sin(print * 1.7 + 1);
}

/** Središte i zakret otiska p. Otisci se nižu prema gore, naizmjence lijeva i desna šapa. */
export function printFrame(print: number): { x: number; y: number; rot: number } {
  let x = 0;
  let y = 0;
  for (let p = 1; p <= print; p++) {
    const h = heading(p);
    x += Math.sin(h) * STRIDE;
    y -= Math.cos(h) * STRIDE;
  }
  const h = heading(print);
  const side = print % 2 === 0 ? -1 : 1;
  return { x: x + Math.cos(h) * SIDE * side, y: y + Math.sin(h) * SIDE * side, rot: h + side * 0.1 };
}

function rotate(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Točka unutar jastučića iz jedinične točke (u, v) u krugu; rub je na polumjeru 1. */
function padPoint(shape: PadShape, u: number, v: number): { x: number; y: number } {
  const taper = shape.kind === "main" ? 1 - MAIN_TAPER + MAIN_TAPER * (v + 1) * 0.5 : 1;
  const local = rotate(shape.rx * u * taper, shape.ry * v, shape.rot);
  return { x: shape.x + local.x, y: shape.y + local.y };
}

/** Gdje je trag: redni broj otiska (od 1), jastučić (0 = veliki, 1–4 prsti slijeva) i mjesto u otisku. */
export function flowerPlace(number: number): { print: number; pad: number; slot: number } {
  const index = Math.max(0, Math.floor(number) - 1);
  const slot = index % PRINT_CAPACITY;
  return { print: Math.floor(index / PRINT_CAPACITY) + 1, pad: ORDER[slot][0], slot };
}

/**
 * Mjesto cvijeta. Cvjetovi popunjavaju otiske šapa: u svakom jastučiću spirala od sredine prema rubu,
 * s malim stalnim pomakom da izgleda prirodno. Isti broj uvijek daje isto mjesto.
 */
export function flowerPosition(number: number): { x: number; y: number } {
  const index = Math.max(0, Math.floor(number) - 1);
  const print = Math.floor(index / PRINT_CAPACITY);
  const [padIndex, i] = ORDER[index % PRINT_CAPACITY];
  const shape = PADS[padIndex];
  const r = Math.sqrt((i + 0.5) / shape.capacity) * 0.95;
  const a = i * GOLDEN_ANGLE + padIndex * 1.3;
  const jitter = 0.18;
  const point = padPoint(
    shape,
    r * Math.cos(a) + (noise(number, 1) - 0.5) * jitter * (FLOWER_SPACING / shape.rx),
    r * Math.sin(a) + (noise(number, 2) - 0.5) * jitter * (FLOWER_SPACING / shape.ry),
  );
  const frame = printFrame(print);
  const world = rotate(point.x, point.y, frame.rot);
  return { x: frame.x + world.x, y: frame.y + world.y };
}

/** Obrisi jastučića u svijetu, za crtanje otiska na travi (i praznog, koji tek čeka cvjetove). */
export function padOutline(print: number, padIndex: number, steps = 40): Array<{ x: number; y: number }> {
  const frame = printFrame(print);
  const shape = PADS[padIndex];
  const points: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    const local = padPoint(shape, Math.cos(a) * 1.04, Math.sin(a) * 1.04);
    const world = rotate(local.x, local.y, frame.rot);
    points.push({ x: frame.x + world.x, y: frame.y + world.y });
  }
  return points;
}

export const PAD_COUNT = PADS.length;

/** Polumjer koji sigurno obuhvaća cijeli otisak. */
export const PRINT_RADIUS = 600 * PAW;

/** Koliko otisaka se crta: svi s cvjetovima i sljedeći, prazan, koji pokazuje kamo trag ide. */
export function printsToShow(maxNumber: number): number {
  return Math.ceil(Math.max(0, maxNumber) / PRINT_CAPACITY) + 1;
}

/** Granice livade za zadani najveći broj, s rubom za nebo iznad zadnjeg otiska. */
export function meadowBounds(maxNumber: number): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let p = 0; p < printsToShow(maxNumber); p++) {
    const frame = printFrame(p);
    minX = Math.min(minX, frame.x - PRINT_RADIUS);
    maxX = Math.max(maxX, frame.x + PRINT_RADIUS);
    minY = Math.min(minY, frame.y - PRINT_RADIUS);
    maxY = Math.max(maxY, frame.y + PRINT_RADIUS);
  }
  return { minX, maxX, minY: minY - 520, maxY: maxY + 120 };
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

export type DayPhase = "dawn" | "day" | "dusk" | "night";

/** Sat u Zagrebu kao decimalni broj (14.5 = 14:30) i dan u godini. */
function zagrebClock(date: Date): { hour: number; dayOfYear: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const start = Date.UTC(get("year"), 0, 1);
  const dayOfYear = Math.floor((Date.UTC(get("year"), get("month") - 1, get("day")) - start) / 86_400_000) + 1;
  return { hour: get("hour") + get("minute") / 60, dayOfYear };
}

/**
 * Doba dana na livadi prema zagrebačkom vremenu. Izlazak i zalazak sunca približno su izračunati
 * za Zagreb kroz godinu (ljeti oko 5:05 i 20:50, zimi oko 7:35 i 16:15, po lokalnom vremenu).
 */
export function dayPhase(date: Date): DayPhase {
  const { hour, dayOfYear } = zagrebClock(date);
  const season = Math.cos((2 * Math.PI * (dayOfYear - 172)) / 365);
  const sunrise = 6.33 - 1.25 * season;
  const sunset = 18.55 + 2.28 * season;
  if (Math.abs(hour - sunrise) <= 0.75) return "dawn";
  if (Math.abs(hour - sunset) <= 0.75) return "dusk";
  return hour > sunrise && hour < sunset ? "day" : "night";
}

/** Boje prizora na platnu (nebo, brežuljci, stabljike); nijanse tokena iz globals.css. */
export const SCENE_COLORS = {
  sun: "rgba(248,185,59,0.75)",
  sunRing: "rgba(248,185,59,0.45)",
  horizon: "rgba(194,69,31,0.22)",
  stem: "#7FA889",
  label: "#33242B",
  labelHalo: "rgba(255,250,240,0.85)",
  glow: "rgba(255,255,255,0.95)",
  mineRing: "#1F6F6B",
  outline: "rgba(51,36,43,0.2)",
  pawGhost: "rgba(255,253,245,0.5)",
  pawNext: "rgba(51,36,43,0.22)",
  tuft: "rgba(95,140,105,0.22)",
  vignette: "rgba(51,36,43,0.10)",
  star: "rgba(255,250,235,0.85)",
} as const;

/** Nebo, daleka brda i tlo za svako doba dana. I noć ostaje topla i svijetla, bez crne. */
export const PHASE_COLORS: Record<DayPhase, { skyTop: string; sky: string; hillFar: string; hillNear: string; ground: string; groundDeep: string; sunHeight: number }> = {
  dawn: { skyTop: "#FCE3D2", sky: "#FFE7A8", hillFar: "#E6D9C8", hillNear: "#DCE6CC", ground: "#E4ECD6", groundDeep: "#D3E3C8", sunHeight: 0.15 },
  day: { skyTop: "#FFF4D6", sky: "#FFE7A8", hillFar: "#E3EAD3", hillNear: "#D9E6C8", ground: "#E4ECD6", groundDeep: "#D3E3C8", sunHeight: 0.55 },
  dusk: { skyTop: "#E9C9C9", sky: "#F8C98E", hillFar: "#D8C6BF", hillNear: "#CFDABF", ground: "#DCE5CE", groundDeep: "#CBDCBF", sunHeight: 0.05 },
  night: { skyTop: "#8E7C9E", sky: "#C9B6C4", hillFar: "#B7AEB9", hillNear: "#C3CDB6", ground: "#D4DDC7", groundDeep: "#C5D3BA", sunHeight: -1 },
};
