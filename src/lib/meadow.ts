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
/** Gustoća slaganja: koliko površine dobiva jedan cvijet (malo više od razmaka na kvadrat). */
const AREA_PER_FLOWER = 41 * 41;
/** Veličina otisaka u jedinicama svijeta. */
const PAW = 1.6;

/** Stalan pseudoslučajan broj u [0, 1) za zadani broj traga i sol; isti ulaz, isti izlaz. */
function noise(number: number, salt: number): number {
  const value = Math.sin(number * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Svjetovi Velike livade. Jedan krajolik s jezerom u sredini: psi na livadi lijevo, mačke u vrtu desno,
 * kunići u djetelini iznad jezera, ptice na obali ispod njega, a ostali ljubimci uz stazu. Svaki svijet
 * ima svoj niz mjesta, pa se raspored jednog nikad ne miješa s drugim.
 */
export const MEADOW_ZONES = ["psi", "macke", "mali", "ptice", "ostali"] as const;
export type MeadowZone = (typeof MEADOW_ZONES)[number];

/** Svijet ljubimca prema vrsti; isto pravilo ima i baza (meadow_zone). */
export function zoneOf(species: MeadowSpecies): MeadowZone {
  return species === "pas" ? "psi" : species === "macka" ? "macke" : species === "kunic" ? "mali" : species === "ptica" ? "ptice" : "ostali";
}

/** Psi i mačke uvijek imaju svoj svijet; ostali se pojave kad stigne prvi takav ljubimac. */
export const ALWAYS_SHOWN: readonly MeadowZone[] = ["psi", "macke"];

export type PadKind = "main" | "toe";

/** Jastučić otiska u koordinatama otiska (otisak gleda prema gore, prema negativnom y). */
type PadShape = {
  kind: PadKind;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  taper: number;
  capacity: number;
  /** Mjesta u jedinicama polumjera jastučića (u po širini, v po visini), od sredine prema rubu. */
  slots: ReadonlyArray<{ u: number; v: number }>;
};

/** Razmak mreže mjesta unutar jastučića: dovoljan da se glave cvjetova nikad ne dodiruju. */
const GRID = Math.sqrt(AREA_PER_FLOWER);

/**
 * Mjesta unutar jastučića kao pravilna (šesterokutna) mreža, poredana od sredine prema rubu.
 * Mreža drži isti razmak u svakom obliku, i u uskim prstima ptičje nožice.
 */
function latticeSlots(rx: number, ry: number, taper: number): Array<{ u: number; v: number }> {
  const slots: Array<{ u: number; v: number; d: number }> = [];
  const rowHeight = GRID * 0.866;
  for (let j = -Math.ceil(ry / rowHeight); j <= Math.ceil(ry / rowHeight); j++) {
    const y = j * rowHeight;
    const v = y / ry;
    const width = 1 - Math.abs(taper) + Math.abs(taper) * (taper > 0 ? (v + 1) * 0.5 : (1 - v) * 0.5);
    for (let i = -Math.ceil(rx / GRID) - 1; i <= Math.ceil(rx / GRID) + 1; i++) {
      const x = (i + (j % 2 === 0 ? 0 : 0.5)) * GRID;
      const u = x / (rx * width);
      const d = u * u + v * v;
      if (d <= 0.86) slots.push({ u: x / rx, v, d });
    }
  }
  slots.sort((a, b) => a.d - b.d || Math.atan2(a.v, a.u) - Math.atan2(b.v, b.u));
  return slots.length > 0 ? slots.map(({ u, v }) => ({ u, v })) : [{ u: 0, v: 0 }];
}

function pad(kind: PadKind, x: number, y: number, rx: number, ry: number, rot: number, taper = 0): PadShape {
  const s = PAW;
  const slots = latticeSlots(rx * s, ry * s, taper);
  return { kind, x: x * s, y: y * s, rx: rx * s, ry: ry * s, rot, taper, capacity: slots.length, slots };
}

type ZoneSpec = {
  pads: readonly PadShape[];
  /** Početak traga, uz rub jezera. */
  origin: { x: number; y: number };
  /** Osnovni smjer (0 = prema gore) i koliko trag vijuga. */
  base: number;
  wander: (print: number) => number;
  stride: number;
  side: number;
  radius: number;
};

/** Trag blago vijuga oko svog smjera; psi idu gore lijevo, mačke gore desno, kunići ravno prema obzoru. */
const gentle = (amount: number) => (p: number) => amount * Math.sin(p * 0.35) + 0.06 * Math.sin(p * 1.7 + 1);

const ZONE_SPECS: Record<MeadowZone, ZoneSpec> = {
  psi: {
    pads: [
      pad("main", 0, 0, 300, 245, 0, 0.14),
      pad("toe", -322, -262, 88, 114, -0.5),
      pad("toe", -124, -400, 92, 122, -0.12),
      pad("toe", 124, -400, 92, 122, 0.12),
      pad("toe", 322, -262, 88, 114, 0.5),
    ],
    origin: { x: -1900, y: -650 },
    base: -0.6,
    wander: gentle(0.32),
    stride: 1650,
    side: 520,
    radius: 600 * PAW,
  },
  macke: {
    pads: [
      pad("main", 0, 0, 290, 230, 0, -0.12),
      pad("toe", -292, -250, 96, 100, -0.42),
      pad("toe", -104, -365, 98, 104, -0.12),
      pad("toe", 104, -365, 98, 104, 0.12),
      pad("toe", 292, -250, 96, 100, 0.42),
    ],
    origin: { x: 1900, y: -650 },
    base: 0.6,
    wander: (p) => -gentle(0.32)(p),
    stride: 1600,
    side: 500,
    radius: 580 * PAW,
  },
  mali: {
    pads: [
      pad("main", 0, 40, 150, 360, 0, 0.1),
      pad("toe", -165, -368, 46, 62, -0.3),
      pad("toe", -56, -432, 46, 62, -0.08),
      pad("toe", 56, -432, 46, 62, 0.08),
      pad("toe", 165, -368, 46, 62, 0.3),
    ],
    origin: { x: 0, y: -2150 },
    base: 0,
    wander: gentle(0.22),
    stride: 1500,
    side: 330,
    radius: 520 * PAW,
  },
  ptice: {
    pads: [
      pad("main", 0, 0, 70, 70, 0),
      pad("toe", -150, -205, 40, 165, -0.62),
      pad("toe", 0, -265, 42, 180, 0),
      pad("toe", 150, -205, 40, 165, 0.62),
      pad("toe", 0, 205, 36, 120, 0),
    ],
    origin: { x: -1000, y: 1900 },
    base: Math.PI / 2,
    wander: gentle(0.25),
    stride: 900,
    side: 260,
    radius: 460 * PAW,
  },
  ostali: {
    pads: [
      pad("main", 0, 0, 170, 160, 0),
      pad("toe", -230, -300, 150, 140, 0),
      pad("toe", 150, -560, 150, 140, 0),
      pad("toe", -150, -830, 140, 135, 0),
      pad("toe", 180, -1090, 140, 135, 0),
    ],
    origin: { x: -2600, y: 2300 },
    base: Math.PI * 1.25,
    wander: gentle(0.3),
    stride: 2450,
    side: 0,
    radius: 760 * PAW,
  },
};

/** Broj mjesta u jednom otisku svakog svijeta. */
export const ZONE_CAPACITY: Record<MeadowZone, number> = Object.fromEntries(
  MEADOW_ZONES.map((zone) => [zone, ZONE_SPECS[zone].pads.reduce((sum, item) => sum + item.capacity, 0)]),
) as Record<MeadowZone, number>;

/** Broj mjesta u otisku pseće šape (prikazuje se u objašnjenju livade). */
export const PRINT_CAPACITY = ZONE_CAPACITY.psi;

/**
 * Redoslijed popunjavanja unutar otiska: mjesta se dijele jastučićima razmjerno veličini,
 * pa se oblik otiska vidi već s pet cvjetova i ravnomjerno popunjava.
 */
const ORDERS: Record<MeadowZone, ReadonlyArray<readonly [number, number]>> = Object.fromEntries(
  MEADOW_ZONES.map((zone) => {
    const pads = ZONE_SPECS[zone].pads;
    const filled = pads.map(() => 0);
    const order: Array<readonly [number, number]> = [];
    for (let k = 0; k < ZONE_CAPACITY[zone]; k++) {
      let best = 0;
      let bestRatio = Infinity;
      pads.forEach((item, index) => {
        const ratio = filled[index] / item.capacity;
        if (filled[index] < item.capacity && ratio < bestRatio) {
          best = index;
          bestRatio = ratio;
        }
      });
      order.push([best, filled[best]]);
      filled[best] += 1;
    }
    return [zone, order];
  }),
) as unknown as Record<MeadowZone, ReadonlyArray<readonly [number, number]>>;

/** Središte i zakret otiska p u svijetu. Otisci se nižu od jezera prema van, naizmjence lijevo i desno. */
export function printFrame(zone: MeadowZone, print: number): { x: number; y: number; rot: number } {
  const spec = ZONE_SPECS[zone];
  let x = spec.origin.x;
  let y = spec.origin.y;
  for (let p = 1; p <= print; p++) {
    const h = spec.base + spec.wander(p);
    x += Math.sin(h) * spec.stride;
    y -= Math.cos(h) * spec.stride;
  }
  const h = spec.base + spec.wander(print);
  const side = print % 2 === 0 ? -1 : 1;
  return { x: x + Math.cos(h) * spec.side * side, y: y + Math.sin(h) * spec.side * side, rot: h + (spec.side ? side * 0.1 : 0) };
}

function rotate(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Točka unutar jastučića iz jedinične točke (u, v) u krugu; rub je na polumjeru 1. */
function padPoint(shape: PadShape, u: number, v: number): { x: number; y: number } {
  const taper = 1 - Math.abs(shape.taper) + Math.abs(shape.taper) * (shape.taper > 0 ? (v + 1) * 0.5 : (1 - v) * 0.5);
  const local = rotate(shape.rx * u * taper, shape.ry * v, shape.rot);
  return { x: shape.x + local.x, y: shape.y + local.y };
}

/** Gdje je trag u svom svijetu: redni broj otiska (od 1), jastučić (0 = veliki ili sredina) i mjesto u otisku. */
export function flowerPlace(zone: MeadowZone, zoneIndex: number): { print: number; pad: number; slot: number } {
  const index = Math.max(0, Math.floor(zoneIndex) - 1);
  const slot = index % ZONE_CAPACITY[zone];
  return { print: Math.floor(index / ZONE_CAPACITY[zone]) + 1, pad: ORDERS[zone][slot][0], slot };
}

/**
 * Mjesto cvijeta u njegovu svijetu. Svaki jastučić se puni spiralom od sredine prema rubu, s malim
 * stalnim pomakom da izgleda prirodno. Isti svijet i isti redni broj uvijek daju isto mjesto.
 */
export function flowerPosition(zone: MeadowZone, zoneIndex: number): { x: number; y: number } {
  const index = Math.max(0, Math.floor(zoneIndex) - 1);
  const capacity = ZONE_CAPACITY[zone];
  const print = Math.floor(index / capacity);
  const [padIndex, i] = ORDERS[zone][index % capacity];
  const shape = ZONE_SPECS[zone].pads[padIndex];
  const slot = shape.slots[i];
  const seed = zoneIndex * 7 + MEADOW_ZONES.indexOf(zone);
  // Mali stalni pomak skriva pravilnost mreže; dovoljno je malen da razmak ostane siguran.
  const local = rotate(
    shape.rx * slot.u + (noise(seed, 1) - 0.5) * FLOWER_SPACING * 0.2,
    shape.ry * slot.v + (noise(seed, 2) - 0.5) * FLOWER_SPACING * 0.2,
    shape.rot,
  );
  const frame = printFrame(zone, print);
  const world = rotate(shape.x + local.x, shape.y + local.y, frame.rot);
  return { x: frame.x + world.x, y: frame.y + world.y };
}

/** Obris jastučića u svijetu, za crtanje otiska na travi (i praznog, koji tek čeka cvjetove). */
export function padOutline(zone: MeadowZone, print: number, padIndex: number, steps = 40): Array<{ x: number; y: number }> {
  const frame = printFrame(zone, print);
  const shape = ZONE_SPECS[zone].pads[padIndex];
  const points: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    const local = padPoint(shape, Math.cos(a) * 1.04, Math.sin(a) * 1.04);
    const world = rotate(local.x, local.y, frame.rot);
    points.push({ x: frame.x + world.x, y: frame.y + world.y });
  }
  return points;
}

export const PAD_COUNT = 5;

/** Polumjer koji sigurno obuhvaća cijeli otisak svijeta. */
export function printRadius(zone: MeadowZone): number {
  return ZONE_SPECS[zone].radius;
}

/** Koliko otisaka svijet crta: sve s cvjetovima i sljedeći, prazan, koji pokazuje kamo trag ide. */
export function printsToShow(zone: MeadowZone, maxIndex: number): number {
  const filled = Math.ceil(Math.max(0, maxIndex) / ZONE_CAPACITY[zone]);
  // Sporedni svjetovi ne crtaju prazan sljedeći otisak, da ne preuzmu pažnju dok imaju malo ljubimaca.
  return ALWAYS_SHOWN.includes(zone) ? filled + 1 : filled;
}

/** Jezero u sredini krajolika. */
export const POND = { x: 0, y: 150, rx: 1050, ry: 640 } as const;

/**
 * Granice krajolika za zadane najveće redne brojeve po svijetu (svijet bez ljubimaca i bez
 * stalnog mjesta se ne računa), s rubom za nebo iznad najvišeg otiska.
 */
export function meadowBounds(maxIndex: Partial<Record<MeadowZone, number>>): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = POND.x - POND.rx - 400;
  let maxX = POND.x + POND.rx + 400;
  let minY = POND.y - POND.ry - 400;
  let maxY = POND.y + POND.ry + 400;
  for (const zone of MEADOW_ZONES) {
    const max = maxIndex[zone] ?? 0;
    if (max === 0 && !ALWAYS_SHOWN.includes(zone)) continue;
    for (let p = 0; p < printsToShow(zone, max); p++) {
      const frame = printFrame(zone, p);
      const r = printRadius(zone);
      minX = Math.min(minX, frame.x - r);
      maxX = Math.max(maxX, frame.x + r);
      minY = Math.min(minY, frame.y - r);
      maxY = Math.max(maxY, frame.y + r);
    }
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

export type DedicationCheck = { ok: true; text: string | null } | { ok: false; reason: "dedicationLong" | "dedicationChars" | "dedicationBlocked" };

/** Kratka posveta uz trag: neobavezna, do 80 znakova, bez poveznica i znakova za oznake. Prikazuje se tek nakon odobrenja. */
export function checkDedication(input: unknown): DedicationCheck {
  const text = typeof input === "string" ? input.normalize("NFC").replace(/\s+/g, " ").trim() : "";
  if (text === "") {
    return { ok: true, text: null };
  }
  if ([...text].length > 80) {
    return { ok: false, reason: "dedicationLong" };
  }
  if (/[<>{}\[\]\\]/.test(text)) {
    return { ok: false, reason: "dedicationChars" };
  }
  const lower = text.toLowerCase();
  if (BLOCKED.some((word) => lower.includes(word)) || /\b[a-z0-9-]+\.(hr|com|net|org|eu)\b/.test(lower)) {
    return { ok: false, reason: "dedicationBlocked" };
  }
  return { ok: true, text };
}

export function isMeadowSpecies(value: unknown): value is MeadowSpecies {
  return typeof value === "string" && (MEADOW_SPECIES as readonly string[]).includes(value);
}

export function isMeadowPetal(value: unknown): value is MeadowPetal {
  return typeof value === "string" && (MEADOW_PETALS as readonly string[]).includes(value);
}

/**
 * Cvijet kako ga dobiva preglednik: [broj, ime, vrsta, boja, adresa spomena ili "", dan ostavljanja YYYY-MM-DD,
 * redni broj u svijetu].
 */
export type MeadowRow = [number, string, number, number, string, string, number];

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

export type Season = "proljece" | "ljeto" | "jesen" | "zima";

/** Godišnje doba po datumu u Zagrebu (meteorološko: zima je prosinac, siječanj i veljača). */
export function seasonOf(date: Date): Season {
  const month = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", month: "numeric" }).format(date));
  if (month === 12 || month <= 2) return "zima";
  if (month <= 5) return "proljece";
  if (month <= 8) return "ljeto";
  return "jesen";
}

/** Tlo i ugođaj za svako godišnje doba; zimi inje, ujesen lišće, u proljeće latice, ljeti leptiri. */
export const SEASON_COLORS: Record<
  Season,
  { ground: string; groundDeep: string; tuft: string; particle: string; particleAlt: string; tree: string; treeShade: string; water: string; lily: string; blossom: string | null }
> = {
  proljece: { ground: "#E2EED3", groundDeep: "#CFE3BE", tuft: "rgba(95,150,95,0.26)", particle: "#F4C6CF", particleAlt: "#FFFFFF", tree: "#8FBF7A", treeShade: "#76A866", water: "#A7D0DA", lily: "#6FA963", blossom: "#F4C6CF" },
  ljeto: { ground: "#E4ECD6", groundDeep: "#D3E3C8", tuft: "rgba(95,140,105,0.22)", particle: "#F8B93B", particleAlt: "#E07B53", tree: "#6FA563", treeShade: "#5A8E50", water: "#8FC4D2", lily: "#5E9C5A", blossom: null },
  jesen: { ground: "#E3E8CC", groundDeep: "#D3DBB5", tuft: "rgba(150,130,80,0.25)", particle: "#D98B4A", particleAlt: "#E0B04F", tree: "#D7A867", treeShade: "#C08F52", water: "#96BCC6", lily: "#8FA35A", blossom: null },
  zima: { ground: "#EDF1EA", groundDeep: "#DFE7DC", tuft: "rgba(120,150,135,0.22)", particle: "rgba(255,255,255,0.92)", particleAlt: "rgba(255,255,255,0.7)", tree: "#7E9C8A", treeShade: "#6A8676", water: "#B9D6DF", lily: "#9BB8A2", blossom: null },
};

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
  frost: "rgba(255,255,255,0.75)",
  night: "rgba(51,36,43,0.07)",
  minimapBg: "rgba(255,253,245,0.94)",
  minimapPaw: "rgba(127,168,137,0.55)",
  minimapPawFull: "#7FA889",
  minimapView: "#C2451F",
  waterRipple: "rgba(255,255,255,0.45)",
  ice: "rgba(255,255,255,0.8)",
  lilyFlower: "#F4C6CF",
  sand: "rgba(240,214,160,0.75)",
  garden: "rgba(255,240,205,0.55)",
  fence: "rgba(160,120,90,0.45)",
  clover: "rgba(90,150,90,0.16)",
  shore: "rgba(240,220,175,0.7)",
  treeHighlight: "rgba(255,255,255,0.18)",
  snowCap: "rgba(255,255,255,0.85)",
  shadow: "rgba(51,36,43,0.12)",
  feather: "#B89670",
  featherShaft: "#7D6143",
  zoneLabelBg: "rgba(255,255,255,0.9)",
} as const;

/** Nebo, daleka brda i tlo za svako doba dana. I noć ostaje topla i svijetla, bez crne. */
export const PHASE_COLORS: Record<DayPhase, { skyTop: string; sky: string; hillFar: string; hillNear: string; ground: string; groundDeep: string; sunHeight: number }> = {
  dawn: { skyTop: "#FCE3D2", sky: "#FFE7A8", hillFar: "#E6D9C8", hillNear: "#DCE6CC", ground: "#E4ECD6", groundDeep: "#D3E3C8", sunHeight: 0.15 },
  day: { skyTop: "#FFF4D6", sky: "#FFE7A8", hillFar: "#E3EAD3", hillNear: "#D9E6C8", ground: "#E4ECD6", groundDeep: "#D3E3C8", sunHeight: 0.55 },
  dusk: { skyTop: "#E9C9C9", sky: "#F8C98E", hillFar: "#D8C6BF", hillNear: "#CFDABF", ground: "#DCE5CE", groundDeep: "#CBDCBF", sunHeight: 0.05 },
  night: { skyTop: "#8E7C9E", sky: "#C9B6C4", hillFar: "#B7AEB9", hillNear: "#C3CDB6", ground: "#D4DDC7", groundDeep: "#C5D3BA", sunHeight: -1 },
};
