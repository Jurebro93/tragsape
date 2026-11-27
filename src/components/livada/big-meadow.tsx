"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatPetDate } from "@/lib/format";
import {
  MEADOW_PETALS,
  MEADOW_SPECIES,
  PAD_COUNT,
  PETAL_COLORS,
  PHASE_COLORS,
  PRINT_CAPACITY,
  PRINT_RADIUS,
  SCENE_COLORS,
  SEASON_COLORS,
  SPECIES_COLORS,
  checkFlowerName,
  dayPhase,
  flowerPlace,
  flowerPosition,
  meadowBounds,
  padOutline,
  printFrame,
  printsToShow,
  seasonOf,
  type MeadowPetal,
  type MeadowRow,
  type MeadowSpecies,
} from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow as t } from "@/messages/hr/meadow";
import { FitIcon } from "@/components/icons";
import { readMine } from "./mine";

type Flower = {
  number: number;
  name: string;
  species: MeadowSpecies;
  petal: MeadowPetal;
  slug: string;
  day: string;
  x: number;
  y: number;
  search: string;
};

const FLOWER_SIZE = 26;
const CELL = 120;
const TUFT_CELL = 70;
const MAX_SCALE = 2.6;
const SMALL_SCREEN = "(max-width: 639px)";
const FILTERS = ["all", "pas", "macka", "kunic", "ptica", "drugo", "spomen"] as const;
type Filter = (typeof FILTERS)[number];

function plainSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

function toFlower(row: MeadowRow): Flower {
  const [number, name, speciesIndex, petalIndex, slug, day] = row;
  const { x, y } = flowerPosition(number);
  return {
    number,
    name,
    species: MEADOW_SPECIES[speciesIndex] ?? "drugo",
    petal: MEADOW_PETALS[petalIndex] ?? "terakota",
    slug,
    day,
    x,
    y,
    search: plainSearch(name),
  };
}

/** Stalan pseudoslučajan broj u [0, 1) za cijeli broj; služi za travu i primjer livade. */
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Izmišljena puna livada za primjer: uvijek ista, jasno označena, bez stvarnih imena. */
function demoRows(): MeadowRow[] {
  const names = t.demo.names;
  const start = Date.UTC(2025, 0, 1);
  return Array.from({ length: t.demo.count }, (_, index) => {
    const number = index + 1;
    const day = new Date(start + Math.floor(hash(number * 7) * 690) * 86_400_000).toISOString().slice(0, 10);
    return [
      number,
      names[Math.floor(hash(number * 3) * names.length)],
      Math.floor(hash(number * 5) * MEADOW_SPECIES.length),
      Math.floor(hash(number * 11) * MEADOW_PETALS.length),
      "",
      day,
    ];
  });
}

/** Kad je cvjetova malo, crtaju se veći, da se vide i kad je prikazana cijela livada. */
function minFlowerPx(count: number): number {
  return count < 40 ? 24 : count < 400 ? 9 : 0;
}

function placeLabel(number: number): string {
  const place = flowerPlace(number);
  return fill(t.place.label, { print: place.print, pad: t.place.pads[place.pad] });
}

/** Velika livada: svaki ljubimac je cvijet; cvjetovi popunjavaju otiske šapa koji tvore trag. */
export function BigMeadow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [realFlowers, setRealFlowers] = useState<Flower[] | null>(null);
  const [demo, setDemo] = useState(false);
  const demoFlowers = useMemo(() => (demo ? demoRows().map(toFlower) : null), [demo]);
  const flowers = demo ? demoFlowers : realFlowers;
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Flower | null>(null);
  const [mine, setMine] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [claimOpen, setClaimOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);
  const [full, setFull] = useState(false);
  const [small, setSmall] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [walking, setWalking] = useState(false);
  const [walkCaption, setWalkCaption] = useState("");
  const [zoomedIn, setZoomedIn] = useState(false);
  const interactive = full || !small;

  const view = useRef({ x: 0, y: 0, scale: 1 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const fly = useRef<{ x: number; y: number; scale: number } | null>(null);
  const dirty = useRef(true);
  const fontFamily = useRef("system-ui, sans-serif");
  const wantOverview = useRef(false);
  const pendingFocus = useRef<Flower | null>(null);
  const pushedFull = useRef(false);
  const zoomedRef = useRef(false);
  const walk = useRef<{ path: Array<{ x: number; y: number }>; total: number; distance: number; lastStep: number } | null>(null);
  const bloom = useRef<{ number: number; start: number } | null>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const minimapTransform = useRef({ m: 1, ox: 0, oy: 0 });

  const byNumber = useMemo(() => new Map((flowers ?? []).map((flower) => [flower.number, flower])), [flowers]);
  const maxNumber = useMemo(() => (flowers ?? []).reduce((max, flower) => Math.max(max, flower.number), 0), [flowers]);
  const bounds = useMemo(() => meadowBounds(maxNumber), [maxNumber]);
  const prints = useMemo(() => {
    const total = printsToShow(maxNumber);
    return Array.from({ length: total }, (_, p) => ({
      frame: printFrame(p),
      pads: Array.from({ length: PAD_COUNT }, (_, k) => padOutline(p, k)),
      empty: p * PRINT_CAPACITY >= maxNumber,
    }));
  }, [maxNumber]);
  const grid = useMemo(() => {
    const cells = new Map<string, Flower[]>();
    for (const flower of flowers ?? []) {
      const key = `${Math.floor(flower.x / CELL)}:${Math.floor(flower.y / CELL)}`;
      const list = cells.get(key);
      if (list) list.push(flower);
      else cells.set(key, [flower]);
    }
    return cells;
  }, [flowers]);
  const mineNumbers = useMemo(() => new Set(demo ? [] : mine), [mine, demo]);

  // Veličina zaslona: na mobitelu je livada u stranici pregled, a prava livada otvara se preko cijelog zaslona.
  useEffect(() => {
    const media = window.matchMedia(SMALL_SCREEN);
    const update = () => setSmall(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Učitavanje cvjetova i vlastitih tragova iz preglednika.
  useEffect(() => {
    let cancelled = false;
    const load = (fresh: boolean): Promise<MeadowRow[]> =>
      fetch(fresh ? "/api/livada/tragovi?svjeze=1" : "/api/livada/tragovi", fresh ? { cache: "no-store" } : undefined)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((data: { rows: MeadowRow[] }) => data.rows);
    const wanted = Number(new URLSearchParams(window.location.search).get("trag"));
    load(false)
      .then(async (rows) => {
        // Upravo potvrđen trag može kratko nedostajati u predmemoriranom popisu: jednom se dohvati svjež.
        if (Number.isInteger(wanted) && wanted > 0 && !rows.some((row) => row[0] === wanted)) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          rows = await load(true).catch(() => rows);
          if (!cancelled && !rows.some((row) => row[0] === wanted)) setMissing(wanted);
        }
        if (!cancelled) {
          setMine(readMine());
          setRealFlowers(rows.map(toFlower));
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const minScale = useCallback(() => {
    const { w, h } = size.current;
    return Math.min(w / (bounds.maxX - bounds.minX), h / (bounds.maxY - bounds.minY)) * 0.95;
  }, [bounds]);

  const clamp = useCallback(() => {
    const v = view.current;
    v.scale = Math.min(MAX_SCALE, Math.max(minScale(), v.scale));
    v.x = Math.min(bounds.maxX, Math.max(bounds.minX, v.x));
    v.y = Math.min(bounds.maxY, Math.max(bounds.minY, v.y));
    dirty.current = true;
  }, [bounds, minScale]);

  const overview = useCallback(
    () => ({ x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, scale: minScale() }),
    [bounds, minScale],
  );

  const showAll = useCallback(() => {
    fly.current = overview();
  }, [overview]);

  const focus = useCallback((flower: Flower, open = true) => {
    // Cvijet dolazi malo ispod sredine, da kartica stane iznad njega i ne prekrije ime.
    const scale = Math.min(MAX_SCALE, Math.max(1.8, view.current.scale));
    fly.current = { x: flower.x, y: flower.y - Math.min(170, size.current.h * 0.28) / scale, scale };
    if (open) setSelected(flower);
  }, []);

  // Mini-karta i šetnja mijenjaju što se crta povrh livade.
  useEffect(() => {
    dirty.current = true;
  }, [zoomedIn, walking]);

  // Nakon zatvaranja cijelog zaslona pregled u stranici opet pokazuje cijeli trag.
  const wasFull = useRef(false);
  useEffect(() => {
    if (wasFull.current && !full) {
      const timer = window.setTimeout(() => {
        fly.current = overview();
      }, 80);
      wasFull.current = full;
      return () => window.clearTimeout(timer);
    }
    wasFull.current = full;
  }, [full, overview]);

  // Cijeli zaslon: na mobitelu ulaz preko povijesti, pa tipka „natrag” zatvara livadu.
  const enterFull = useCallback((target?: Flower | null) => {
    pendingFocus.current = target ?? null;
    setFull(true);
    if (window.matchMedia(SMALL_SCREEN).matches && !pushedFull.current) {
      window.history.pushState({ livadaFull: true }, "");
      pushedFull.current = true;
    }
  }, []);

  const exitFull = useCallback(() => {
    if (pushedFull.current) {
      pushedFull.current = false;
      window.history.back();
    }
    walk.current = null;
    setWalking(false);
    setFull(false);
  }, []);

  // Veličina platna i prvi pogled (cijela livada ili trag iz poveznice).
  const placedInitial = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flowers) return;
    fontFamily.current = getComputedStyle(canvas).fontFamily || fontFamily.current;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      size.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      clamp();
    };
    resize();
    if (!placedInitial.current) {
      placedInitial.current = true;
      view.current = overview();
      clamp();
      const wanted = Number(new URLSearchParams(window.location.search).get("trag"));
      const target = Number.isInteger(wanted) ? byNumber.get(wanted) : undefined;
      if (target) {
        bloom.current = { number: target.number, start: performance.now() + 700 };
        // Poveznica na trag: na mobitelu se livada otvara preko cijelog zaslona, na računalu se pomakne u pogled.
        if (window.matchMedia(SMALL_SCREEN).matches) {
          window.setTimeout(() => enterFull(target), 0);
        } else {
          canvas.scrollIntoView({ block: "center" });
          window.setTimeout(() => focus(target), 300);
        }
      }
    }
    if (wantOverview.current) {
      wantOverview.current = false;
      view.current = overview();
      clamp();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [flowers, bounds, byNumber, clamp, focus, overview, enterFull]);

  // Crtanje: prizor se iscrtava kad se nešto promijeni; njihanje, cvjetanje, šetnja i čestice godišnjeg doba
  // crtaju se do 30 puta u sekundi, i nikad kad posjetitelj traži manje kretanja.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flowers) return;
    const main = canvas.getContext("2d");
    const sceneCanvas = document.createElement("canvas");
    const sceneCtx = sceneCanvas.getContext("2d");
    if (!main || !sceneCtx) return;
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Doba dana i godišnje doba po zagrebačkom vremenu; provjerava se svakih pet minuta.
    let palette = PHASE_COLORS[dayPhase(new Date())];
    let season = seasonOf(new Date());
    let seasonColors = SEASON_COLORS[season];
    const phaseTimer = window.setInterval(() => {
      palette = PHASE_COLORS[dayPhase(new Date())];
      season = seasonOf(new Date());
      seasonColors = SEASON_COLORS[season];
      dirty.current = true;
    }, 5 * 60 * 1000);
    const lastFrame = prints[prints.length - 1].frame;
    const matches = (f: Flower) =>
      filter === "all" ? true : filter === "spomen" ? f.slug !== "" : f.species === filter;

    // Prizor se crta na zasebno platno; čestice godišnjeg doba i mini-karta idu povrh njega.
    const drawScene = (ctx: CanvasRenderingContext2D, now: number, sway: boolean) => {
      const { w, h, dpr } = size.current;
      const v = view.current;
      const sx = (x: number) => (x - v.x) * v.scale + w / 2;
      const sy = (y: number) => (y - v.y) * v.scale + h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Nebo iznad zadnjeg otiska: trag vodi prema obzoru.
      const horizonWorld = bounds.minY + 400;
      const horizonY = sy(horizonWorld);
      const sky = ctx.createLinearGradient(0, Math.min(0, horizonY - 400 * v.scale), 0, Math.max(1, horizonY));
      sky.addColorStop(0, palette.skyTop);
      sky.addColorStop(1, palette.sky);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      if (horizonY > 0) {
        const sunX = sx(lastFrame.x + 420);
        const sunR = Math.max(26, 150 * v.scale);
        if (palette.sunHeight >= 0) {
          const sunY = horizonY - sunR * palette.sunHeight * 1.6;
          ctx.fillStyle = SCENE_COLORS.sun;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = SCENE_COLORS.sunRing;
          ctx.lineWidth = 2;
          for (const k of [1.45, 1.95]) {
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR * k, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // Noć: mjesec i nekoliko zvijezda, i dalje toplih boja.
          ctx.fillStyle = SCENE_COLORS.star;
          const shift = v.x * v.scale * 0.08;
          for (let k = 0; k < 46; k++) {
            const x = ((hash(k * 13) * (w + 200) - shift) % (w + 200) + (w + 200)) % (w + 200) - 100;
            const y = horizonY - 30 - hash(k * 29) * Math.min(horizonY, 420);
            if (y < 0) continue;
            ctx.beginPath();
            ctx.arc(x, y, 0.8 + hash(k * 31) * 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(sunX, horizonY - sunR * 1.9, sunR * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        // Daleka brda: pomiču se sporije od livade, pa se vidi dubina.
        const hills = (color: string, factor: number, amp: number, period: number) => {
          const offset = v.x * v.scale * factor;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(0, horizonY + 1);
          for (let x = 0; x <= w + 24; x += 24) {
            const u = (x + offset) / period;
            const y = horizonY - amp * (0.55 + 0.35 * Math.sin(u * Math.PI * 2) + 0.1 * Math.sin(u * Math.PI * 5.3));
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, horizonY + 1);
          ctx.closePath();
          ctx.fill();
        };
        const depth = Math.sqrt(v.scale);
        hills(palette.hillFar, 0.25, 70 * depth, 520 * depth);
        hills(palette.hillNear, 0.5, 38 * depth, 340 * depth);
      }

      const ground = ctx.createLinearGradient(0, horizonY, 0, sy(bounds.maxY));
      ground.addColorStop(0, seasonColors.ground);
      ground.addColorStop(1, seasonColors.groundDeep);
      ctx.fillStyle = ground;
      ctx.fillRect(0, Math.max(0, horizonY), w, h);
      if (palette.sunHeight < 0) {
        ctx.fillStyle = SCENE_COLORS.night;
        ctx.fillRect(0, Math.max(0, horizonY), w, h);
      }

      const left = v.x - w / 2 / v.scale;
      const right = v.x + w / 2 / v.scale;
      const top = v.y - h / 2 / v.scale;
      const bottom = v.y + h / 2 / v.scale;

      // Otisci šapa na travi: popunjeni su pokošeni, sljedeći je tek naznačen.
      for (const print of prints) {
        const { frame } = print;
        if (frame.x + PRINT_RADIUS < left || frame.x - PRINT_RADIUS > right || frame.y + PRINT_RADIUS < top || frame.y - PRINT_RADIUS > bottom) {
          continue;
        }
        for (const outline of print.pads) {
          ctx.beginPath();
          outline.forEach((point, index) => (index === 0 ? ctx.moveTo(sx(point.x), sy(point.y)) : ctx.lineTo(sx(point.x), sy(point.y))));
          ctx.closePath();
          ctx.fillStyle = SCENE_COLORS.pawGhost;
          ctx.fill();
          if (print.empty) {
            ctx.setLineDash([6, 7]);
            ctx.strokeStyle = SCENE_COLORS.pawNext;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        if (print.empty && PRINT_RADIUS * v.scale > 70) {
          const label = maxNumber === 0 ? t.firstPrint : t.nextPrint;
          const fontSize = Math.round(Math.min(20, Math.max(12, PRINT_RADIUS * v.scale * 0.06)));
          ctx.font = `700 ${fontSize}px ${fontFamily.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 4;
          ctx.strokeStyle = SCENE_COLORS.labelHalo;
          ctx.strokeText(label, sx(frame.x), sy(frame.y));
          ctx.fillStyle = SCENE_COLORS.label;
          ctx.fillText(label, sx(frame.x), sy(frame.y));
        }
      }

      const px = FLOWER_SIZE * v.scale;

      // Trava izbliza: kratke vlati na stalnim mjestima.
      if (px >= 9) {
        ctx.strokeStyle = seasonColors.tuft;
        ctx.lineWidth = Math.max(1, v.scale * 1.2);
        ctx.lineCap = "round";
        const cx0 = Math.floor(left / TUFT_CELL);
        const cx1 = Math.floor(right / TUFT_CELL);
        const cy0 = Math.max(Math.floor(top / TUFT_CELL), Math.floor(horizonWorld / TUFT_CELL) + 1);
        const cy1 = Math.floor(bottom / TUFT_CELL);
        ctx.beginPath();
        for (let gx = cx0; gx <= cx1; gx++) {
          for (let gy = cy0; gy <= cy1; gy++) {
            const seed = gx * 73856093 + gy * 19349663;
            const x = sx((gx + hash(seed)) * TUFT_CELL);
            const y = sy((gy + hash(seed + 1)) * TUFT_CELL);
            // Tri savijene vlati različite visine; izdaleka se stapaju u teksturu trave.
            const blade = (4.5 + hash(seed + 2) * 3) * v.scale;
            const spread = blade * 0.18;
            ctx.moveTo(x - spread, y);
            ctx.quadraticCurveTo(x - spread * 1.4, y - blade * 0.6, x - blade * 0.5, y - blade * 0.85);
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + spread * 0.4, y - blade * 0.7, x + blade * 0.08, y - blade * 1.25);
            ctx.moveTo(x + spread, y);
            ctx.quadraticCurveTo(x + spread * 1.6, y - blade * 0.5, x + blade * 0.55, y - blade * 0.7);
          }
        }
        ctx.stroke();
        if (season === "zima") {
          // Inje: sitne bijele točke na vrhovima vlati.
          ctx.fillStyle = SCENE_COLORS.frost;
          for (let gx = cx0; gx <= cx1; gx++) {
            for (let gy = cy0; gy <= cy1; gy++) {
              const seed = gx * 73856093 + gy * 19349663;
              const blade = (4.5 + hash(seed + 2) * 3) * v.scale;
              ctx.beginPath();
              ctx.arc(sx((gx + hash(seed)) * TUFT_CELL) + blade * 0.08, sy((gy + hash(seed + 1)) * TUFT_CELL) - blade * 1.25, Math.max(0.8, v.scale * 1.1), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Vidljivi cvjetovi.
      const pad = FLOWER_SIZE * 2;
      const x0 = Math.floor((left - pad) / CELL);
      const x1 = Math.floor((right + pad) / CELL);
      const y0 = Math.floor((top - pad) / CELL);
      const y1 = Math.floor((bottom + pad) / CELL);
      const visible: Flower[] = [];
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const list = grid.get(`${gx}:${gy}`);
          if (list) visible.push(...list);
        }
      }
      visible.sort((a, b) => a.y - b.y);

      const fpx = Math.max(px, minFlowerPx(flowers.length));
      const showNames = fpx >= 30 || flowers.length < 40;
      for (const f of visible) {
        const cx = sx(f.x);
        const cy = sy(f.y);
        const isMine = mineNumbers.has(f.number);
        const isSelected = selected?.number === f.number;
        ctx.globalAlpha = matches(f) ? 1 : 0.14;
        if (fpx < 5) {
          // Izdaleka: točkica u boji cvijeta.
          ctx.fillStyle = f.petal === "bijela" ? SCENE_COLORS.label : PETAL_COLORS[f.petal];
          const r = Math.max(1.2, fpx * 0.35) * (isMine || isSelected ? 2.2 : 1);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          if (isMine || isSelected) {
            ctx.strokeStyle = SCENE_COLORS.mineRing;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
          continue;
        }
        // Novi trag procvjeta: raste iz zemlje nešto više od sekunde.
        const growth = bloom.current && bloom.current.number === f.number ? Math.max(0, Math.min(1, (now - bloom.current.start) / 1200)) : 1;
        const grow = 1 - (1 - growth) ** 3;
        const r = fpx * 0.32 * grow;
        const stem = fpx * 0.9 * grow;
        const lean = sway ? Math.sin(now * 0.0016 + f.number * 1.7 + f.x * 0.002) * fpx * 0.09 : 0;
        const headX = cx + lean;
        const headY = cy - stem;
        if (isMine || isSelected) {
          const glow = ctx.createRadialGradient(headX, headY, 0, headX, headY, Math.max(1, r * 5));
          glow.addColorStop(0, SCENE_COLORS.glow);
          glow.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(headX, headY, Math.max(1, r * 5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = SCENE_COLORS.stem;
        ctx.lineWidth = Math.max(1, fpx * 0.07);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + r * 0.3 + lean * 0.3, cy - stem * 0.5, headX, headY);
        ctx.stroke();
        ctx.fillStyle = PETAL_COLORS[f.petal];
        const turn = (f.number * 0.7) % (Math.PI * 2);
        for (let k = 0; k < 5; k++) {
          const a = turn + (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(headX + Math.cos(a) * r * 0.78, headY + Math.sin(a) * r * 0.78, r * 0.62, 0, Math.PI * 2);
          ctx.fill();
          if (f.petal === "bijela") {
            ctx.strokeStyle = SCENE_COLORS.outline;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.fillStyle = SPECIES_COLORS[f.species];
        ctx.beginPath();
        ctx.arc(headX, headY, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        if (isMine) {
          ctx.strokeStyle = SCENE_COLORS.mineRing;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(headX, headY, r * 1.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (showNames || isMine || isSelected) {
          const fontSize = Math.round(Math.min(18, Math.max(11, fpx * 0.36)));
          ctx.font = `700 ${fontSize}px ${fontFamily.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.lineWidth = 3;
          ctx.strokeStyle = SCENE_COLORS.labelHalo;
          ctx.strokeText(f.name, cx, cy + 3);
          ctx.fillStyle = SCENE_COLORS.label;
          ctx.fillText(f.name, cx, cy + 3);
        }
      }
      ctx.globalAlpha = 1;

      // Blago zatamnjeni rubovi: pogled je kao kroz prozor na veći prostor.
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
      vignette.addColorStop(0, "rgba(51,36,43,0)");
      vignette.addColorStop(1, SCENE_COLORS.vignette);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    };

    // Čestice godišnjeg doba u prostoru zaslona: snijeg, latice, lišće ili poneki leptir.
    const drawParticles = (now: number) => {
      const { w, h, dpr } = size.current;
      main.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = season === "ljeto" ? 6 : season === "proljece" ? 18 : season === "jesen" ? 22 : 44;
      const t = now / 1000;
      for (let k = 0; k < count; k++) {
        const speed = 0.3 + hash(k * 7) * 0.7;
        const baseX = hash(k * 3) * w;
        if (season === "ljeto") {
          const x = baseX + Math.sin(t * 0.6 + k) * 60;
          const y = hash(k * 5) * h * 0.8 + Math.cos(t * 0.45 + k * 2) * 40;
          const flap = Math.abs(Math.sin(t * 9 + k));
          main.fillStyle = k % 2 ? seasonColors.particle : seasonColors.particleAlt;
          main.beginPath();
          main.ellipse(x - 3, y, 4 * flap + 1, 3, -0.4, 0, Math.PI * 2);
          main.ellipse(x + 3, y, 4 * flap + 1, 3, 0.4, 0, Math.PI * 2);
          main.fill();
          continue;
        }
        const fall = season === "zima" ? 0.05 : 0.035;
        const y = ((hash(k * 5) + t * speed * fall) % 1) * (h + 20) - 10;
        const x = baseX + Math.sin(t * speed + k) * 18;
        main.fillStyle = k % 3 ? seasonColors.particle : seasonColors.particleAlt;
        main.beginPath();
        if (season === "zima") main.arc(x, y, 1.2 + speed * 1.6, 0, Math.PI * 2);
        else main.ellipse(x, y, season === "jesen" ? 4.5 : 3.2, season === "jesen" ? 2.4 : 2, t * speed + k, 0, Math.PI * 2);
        main.fill();
      }
    };

    // Mini-karta: cijeli trag i okvir trenutnog pogleda.
    const drawMinimap = () => {
      const mini = minimapRef.current;
      if (!mini || mini.clientWidth === 0) return;
      const mctx = mini.getContext("2d");
      if (!mctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const mw = mini.clientWidth;
      const mh = mini.clientHeight;
      if (mini.width !== Math.round(mw * dpr)) {
        mini.width = Math.round(mw * dpr);
        mini.height = Math.round(mh * dpr);
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = Math.min(mw / (bounds.maxX - bounds.minX), mh / (bounds.maxY - bounds.minY)) * 0.9;
      const ox = mw / 2 - ((bounds.minX + bounds.maxX) / 2) * m;
      const oy = mh / 2 - ((bounds.minY + bounds.maxY) / 2) * m;
      minimapTransform.current = { m, ox, oy };
      mctx.clearRect(0, 0, mw, mh);
      mctx.fillStyle = SCENE_COLORS.minimapBg;
      mctx.beginPath();
      mctx.roundRect(0, 0, mw, mh, 16);
      mctx.fill();
      for (const print of prints) {
        mctx.fillStyle = print.empty ? SCENE_COLORS.minimapPaw : SCENE_COLORS.minimapPawFull;
        for (const outline of print.pads) {
          mctx.beginPath();
          outline.forEach((point, index) => (index % 4 === 0 ? (index === 0 ? mctx.moveTo(ox + point.x * m, oy + point.y * m) : mctx.lineTo(ox + point.x * m, oy + point.y * m)) : null));
          mctx.closePath();
          mctx.fill();
        }
      }
      mctx.fillStyle = SCENE_COLORS.mineRing;
      for (const number of mineNumbers) {
        const f = byNumber.get(number);
        if (!f) continue;
        mctx.beginPath();
        mctx.arc(ox + f.x * m, oy + f.y * m, 3.5, 0, Math.PI * 2);
        mctx.fill();
      }
      const { w, h } = size.current;
      const v = view.current;
      mctx.strokeStyle = SCENE_COLORS.minimapView;
      mctx.lineWidth = 2;
      mctx.strokeRect(ox + (v.x - w / 2 / v.scale) * m, oy + (v.y - h / 2 / v.scale) * m, (w / v.scale) * m, (h / v.scale) * m);
    };

    let lastAnimated = 0;
    let lastCaption = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - lastTime);
      lastTime = now;
      const target = fly.current;
      if (target) {
        const v = view.current;
        const k = reduced ? 1 : 0.14;
        v.x += (target.x - v.x) * k;
        v.y += (target.y - v.y) * k;
        v.scale += (target.scale - v.scale) * k;
        clamp();
        if (Math.abs(target.x - v.x) < 0.5 && Math.abs(target.y - v.y) < 0.5 && Math.abs(target.scale - v.scale) < 0.002) {
          fly.current = null;
        }
      }
      // Šetnja tragom: pogled polako slijedi put kroz jastučiće, od prvog otiska do zadnjeg.
      const w8 = walk.current;
      if (w8) {
        fly.current = null;
        w8.distance += (dt / 1000) * (reduced ? 0 : 210);
        if (reduced && now - w8.lastStep > 2500) {
          w8.lastStep = now;
          w8.distance += 600;
        }
        let rest = w8.distance;
        let point = w8.path[w8.path.length - 1];
        for (let i = 1; i < w8.path.length; i++) {
          const a = w8.path[i - 1];
          const b = w8.path[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (rest <= len) {
            point = { x: a.x + ((b.x - a.x) * rest) / len, y: a.y + ((b.y - a.y) * rest) / len };
            break;
          }
          rest -= len;
        }
        const v = view.current;
        v.x = point.x;
        v.y = point.y;
        v.scale += (1.25 - v.scale) * 0.08;
        clamp();
        if (now - lastCaption > 700) {
          lastCaption = now;
          const near = (flowers ?? [])
            .map((f) => ({ name: f.name, d: Math.hypot(f.x - v.x, f.y - v.y) }))
            .filter((item) => item.d < 260)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .map((item) => item.name);
          setWalkCaption((previous) => (previous === near.join(", ") ? previous : near.join(", ")));
        }
        if (w8.distance >= w8.total) {
          walk.current = null;
          setWalking(false);
          setWalkCaption("");
        }
      }
      const zoomed = view.current.scale > minScale() * 1.6;
      if (zoomed !== zoomedRef.current) {
        zoomedRef.current = zoomed;
        setZoomedIn(zoomed);
      }
      const sway = !reduced && FLOWER_SIZE * view.current.scale >= 12;
      const blooming = bloom.current !== null && now - bloom.current.start < 1300;
      const animate = !reduced && now - lastAnimated >= 33;
      const redrawScene = dirty.current || ((sway || blooming) && animate) || walk.current !== null;
      if (redrawScene) {
        dirty.current = false;
        const { w, h, dpr } = size.current;
        if (sceneCanvas.width !== Math.round(w * dpr) || sceneCanvas.height !== Math.round(h * dpr)) {
          sceneCanvas.width = Math.round(w * dpr);
          sceneCanvas.height = Math.round(h * dpr);
        }
        drawScene(sceneCtx, now, sway);
        drawMinimap();
      }
      if (redrawScene || animate) {
        lastAnimated = now;
        main.setTransform(1, 0, 0, 1, 0, 0);
        main.clearRect(0, 0, canvas.width, canvas.height);
        main.drawImage(sceneCanvas, 0, 0);
        if (!reduced) drawParticles(now);
      }
      frame = window.requestAnimationFrame(tick);
    };
    dirty.current = true;
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(phaseTimer);
    };
  }, [flowers, grid, bounds, prints, maxNumber, mineNumbers, selected, clamp, filter, byNumber, minScale]);

  // Kartica prati odabrani cvijet.
  useEffect(() => {
    if (!selected) {
      return;
    }
    let frame = 0;
    const follow = () => {
      const { w, h } = size.current;
      const v = view.current;
      const x = (selected.x - v.x) * v.scale + w / 2;
      const y = (selected.y - v.y) * v.scale + h / 2;
      const cardW = Math.min(300, w - 24);
      const left = Math.max(12, Math.min(w - cardW - 12, x - cardW / 2));
      const above = y - FLOWER_SIZE * v.scale * 1.6 - 230;
      const top = above > 64 ? above : Math.min(h - 250, y + 44);
      setCardPos((previous) => (previous && Math.abs(previous.left - left) < 0.5 && Math.abs(previous.top - top) < 0.5 ? previous : { left, top }));
      frame = window.requestAnimationFrame(follow);
    };
    frame = window.requestAnimationFrame(follow);
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  useEffect(() => {
    const onPop = () => {
      if (pushedFull.current) {
        pushedFull.current = false;
        setFull(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!full) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      const target = pendingFocus.current;
      pendingFocus.current = null;
      if (target) focus(target);
      else if (!walk.current) showAll();
    }, 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !claimOpen) exitFull();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [full, claimOpen, exitFull, focus, showAll]);

  // Pomicanje, zumiranje i dodir.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pinch: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const stopWalk = useCallback(() => {
    if (walk.current) {
      walk.current = null;
      setWalking(false);
      setWalkCaption("");
    }
  }, []);

  const startWalk = () => {
    // Put kroz jastučiće svih otisaka koji imaju cvjetove: veliki jastučić, pa prsti slijeva nadesno.
    const path: Array<{ x: number; y: number }> = [];
    for (const print of prints) {
      if (print.empty && path.length > 0) break;
      for (const outline of print.pads) {
        const cx = outline.reduce((sum, point) => sum + point.x, 0) / outline.length;
        const cy = outline.reduce((sum, point) => sum + point.y, 0) / outline.length;
        path.push({ x: cx, y: cy });
      }
    }
    let total = 0;
    for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (path.length < 2) return;
    setSelected(null);
    if (!interactive) enterFull(null);
    walk.current = { path, total, distance: 0, lastStep: 0 };
    setWalking(true);
  };

  const onMinimap = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { m, ox, oy } = minimapTransform.current;
    const x = (event.nativeEvent.offsetX - ox) / m;
    const y = (event.nativeEvent.offsetY - oy) / m;
    stopWalk();
    fly.current = { x, y, scale: Math.max(view.current.scale, minScale() * 2.5) };
  };

  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const v = view.current;
      const { w, h } = size.current;
      const wx = (sx - w / 2) / v.scale + v.x;
      const wy = (sy - h / 2) / v.scale + v.y;
      fly.current = null;
      v.scale = Math.min(MAX_SCALE, Math.max(minScale(), v.scale * factor));
      v.x = wx - (sx - w / 2) / v.scale;
      v.y = wy - (sy - h / 2) / v.scale;
      clamp();
    },
    [clamp, minScale],
  );

  const zoomInCenter = useCallback(() => {
    stopWalk();
    zoomAt(size.current.w / 2, size.current.h / 2, 1.5);
  }, [zoomAt, stopWalk]);
  const zoomOutCenter = useCallback(() => {
    stopWalk();
    zoomAt(size.current.w / 2, size.current.h / 2, 1 / 1.5);
  }, [zoomAt, stopWalk]);

  const hitTest = useCallback(
    (sx: number, sy: number): Flower | null => {
      const v = view.current;
      const { w, h } = size.current;
      const wx = (sx - w / 2) / v.scale + v.x;
      const wy = (sy - h / 2) / v.scale + v.y;
      const fpx = Math.max(FLOWER_SIZE * v.scale, minFlowerPx(flowers?.length ?? 0));
      const radius = Math.max(FLOWER_SIZE * 0.8, 14 / v.scale, (fpx * 0.7) / v.scale);
      let best: Flower | null = null;
      let bestDistance = Infinity;
      const gx = Math.floor(wx / CELL);
      const gy = Math.floor(wy / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const f of grid.get(`${gx + dx}:${gy + dy}`) ?? []) {
            // Glava cvijeta je iznad točke sadnje kad je cvijet dovoljno velik.
            const headY = fpx >= 5 ? f.y - (fpx * 0.9) / v.scale : f.y;
            const d = Math.hypot(f.x - wx, headY - wy);
            if (d < radius && d < bestDistance) {
              best = f;
              bestDistance = d;
            }
          }
        }
      }
      return best;
    },
    [grid, flowers],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) {
      gesture.current = { x: event.clientX, y: event.clientY, vx: 0, vy: 0, moved: false, pinch: 0, scale: 0 };
      return;
    }
    stopWalk();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
    const points = [...pointers.current.values()];
    gesture.current = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      vx: view.current.x,
      vy: view.current.y,
      moved: false,
      pinch: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
      scale: view.current.scale,
    };
    fly.current = null;
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) {
      const g = gesture.current;
      if (g && Math.abs(event.clientX - g.x) + Math.abs(event.clientY - g.y) > 8) g.moved = true;
      return;
    }
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
    const g = gesture.current;
    const points = [...pointers.current.values()];
    if (points.length === 2 && g.pinch > 0) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const cx = (points[0].x + points[1].x) / 2;
      const cy = (points[0].y + points[1].y) / 2;
      const target = g.scale * (distance / g.pinch);
      zoomAt(cx, cy, target / view.current.scale);
      g.moved = true;
      return;
    }
    const dx = event.nativeEvent.offsetX - g.x;
    const dy = event.nativeEvent.offsetY - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) g.moved = true;
    if (g.moved) {
      view.current.x = g.vx - dx / view.current.scale;
      view.current.y = g.vy - dy / view.current.scale;
      clamp();
    }
  };
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) {
      // Na mobitelu je livada u stranici samo pregled: dodir je otvara preko cijelog zaslona.
      const g = gesture.current;
      gesture.current = null;
      if (g && !g.moved && event.type === "pointerup") {
        enterFull(hitTest(event.nativeEvent.offsetX, event.nativeEvent.offsetY));
      }
      return;
    }
    pointers.current.delete(event.pointerId);
    const g = gesture.current;
    if (g && !g.moved && pointers.current.size === 0) {
      const x = event.nativeEvent.offsetX;
      const y = event.nativeEvent.offsetY;
      const hit = hitTest(x, y);
      const now = Date.now();
      if (hit) {
        focus(hit);
      } else if (now - lastTap.current < 320) {
        zoomAt(x, y, 2);
      } else {
        setSelected(null);
      }
      lastTap.current = now;
    }
    if (pointers.current.size === 0) gesture.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopWalk();
      zoomAt(event.offsetX, event.offsetY, Math.exp(-event.deltaY * 0.0015));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomAt, flowers, interactive, stopWalk]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    stopWalk();
    const step = 80 / view.current.scale;
    const { w, h } = size.current;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => (view.current.x -= step),
      ArrowRight: () => (view.current.x += step),
      ArrowUp: () => (view.current.y -= step),
      ArrowDown: () => (view.current.y += step),
      "+": () => zoomAt(w / 2, h / 2, 1.4),
      "=": () => zoomAt(w / 2, h / 2, 1.4),
      "-": () => zoomAt(w / 2, h / 2, 1 / 1.4),
      Escape: () => setSelected(null),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
      clamp();
    }
  };

  // Pretraga po imenu ili broju.
  const results = useMemo(() => {
    const q = query.trim();
    if (!flowers || q === "") return null;
    const number = Number(q.replace(/^#/, "").replace(/\./g, ""));
    if (Number.isInteger(number) && number > 0) {
      const hit = byNumber.get(number);
      return { list: hit ? [hit] : [], total: hit ? 1 : 0 };
    }
    const needle = plainSearch(q);
    const all = flowers.filter((flower) => flower.search.includes(needle));
    return { list: all.slice(0, 8), total: all.length };
  }, [query, flowers, byNumber]);

  // Susjedi odabranog cvijeta: tri najbliža, da se osjeti da nije sam na livadi.
  const neighbours = useMemo(() => {
    if (!selected) return [];
    const gx = Math.floor(selected.x / CELL);
    const gy = Math.floor(selected.y / CELL);
    const near: Array<{ flower: Flower; d: number }> = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const f of grid.get(`${gx + dx}:${gy + dy}`) ?? []) {
          if (f.number !== selected.number) near.push({ flower: f, d: Math.hypot(f.x - selected.x, f.y - selected.y) });
        }
      }
    }
    return near
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((item) => item.flower.name);
  }, [selected, grid]);

  const latest = useMemo(() => [...(flowers ?? [])].sort((a, b) => b.number - a.number).slice(0, 10), [flowers]);

  const realByNumber = useMemo(() => new Map((realFlowers ?? []).map((flower) => [flower.number, flower])), [realFlowers]);
  const myLatest = [...mine].reverse().map((number) => realByNumber.get(number)).find(Boolean);

  const copyLink = async (flower: Flower) => {
    const url = `${window.location.origin}/livada/trag/${flower.number}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.card.copied);
    } catch {
      setToast(fill(t.card.copyFailed, { url }));
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const startDemo = () => {
    setSelected(null);
    setQuery("");
    wantOverview.current = true;
    setDemo(true);
    if (window.matchMedia(SMALL_SCREEN).matches) enterFull(null);
  };
  const stopDemo = () => {
    setSelected(null);
    setQuery("");
    wantOverview.current = true;
    setDemo(false);
  };
  const openClaim = () => {
    if (demo) stopDemo();
    setClaimOpen(true);
  };

  const count = flowers?.length ?? 0;
  const currentPrint = Math.max(1, Math.ceil(maxNumber / PRINT_CAPACITY));
  const filledInPrint = (flowers ?? []).filter((flower) => Math.ceil(flower.number / PRINT_CAPACITY) === currentPrint).length;
  const selectedIsMine = selected ? mineNumbers.has(selected.number) : false;

  const searchBox: ReactNode = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="livada-trazi" className="sr-only">
        {t.search.label}
      </label>
      <input
        id="livada-trazi"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (!interactive) enterFull(null);
        }}
        placeholder={t.search.placeholder}
        autoComplete="off"
        className="min-h-12 w-full rounded-full border-2 border-line bg-white px-5 text-[16px] text-plum"
      />
      {results ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 flex flex-col gap-1 rounded-3xl bg-white p-2 shadow-[0_18px_40px_-18px_rgba(51,36,43,0.55)]">
          {results.list.length === 0 ? (
            <p className="px-3 py-2 text-[15px] text-plum-soft">{t.search.none}</p>
          ) : (
            results.list.map((flower) => (
              <button
                key={flower.number}
                type="button"
                onClick={() => {
                  setQuery("");
                  if (!interactive) enterFull(flower);
                  else focus(flower);
                }}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 text-left hover:bg-butter"
              >
                <span className="flex items-center gap-2 font-bold">
                  <span className="size-3 rounded-full" style={{ background: PETAL_COLORS[flower.petal] }} aria-hidden="true" />
                  {flower.name}
                </span>
                <span className="text-sm text-plum-soft">
                  {t.species[flower.species]} · {fill(t.card.number, { number: flower.number.toLocaleString("hr-HR") })}
                </span>
              </button>
            ))
          )}
          {results.total > results.list.length ? (
            <p className="px-3 pb-1 text-[13px] text-plum-soft">{fill(t.search.more, { shown: results.list.length, total: results.total })}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const myButton = myLatest ? (
    <button
      type="button"
      onClick={() => (interactive ? focus(myLatest) : enterFull(myLatest))}
      className="min-h-12 shrink-0 cursor-pointer rounded-full border-2 border-teal bg-mint px-5 font-bold text-teal-deep"
    >
      {fill(t.myTrail, { name: myLatest.name })}
    </button>
  ) : null;

  const roundButton = "flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-plum";

  return (
    <section aria-labelledby="velika-livada" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 id="velika-livada" className="font-display text-3xl font-extrabold leading-tight">
          {t.title}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed">{t.lead}</p>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {t.concept.map((item, index) => (
            <li key={item.title} className="flex gap-3 rounded-3xl bg-white p-4">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-butter font-display text-lg font-extrabold text-terracotta-deep"
              >
                {index + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-bold leading-snug">{item.title}</span>
                <span className="text-[15px] leading-snug text-plum-soft">
                  {fill(item.body, { capacity: PRINT_CAPACITY.toLocaleString("hr-HR") })}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {demo ? (
            <button type="button" onClick={stopDemo} className="min-h-11 cursor-pointer font-bold text-teal underline underline-offset-4">
              {t.demo.exit}
            </button>
          ) : (
            <button type="button" onClick={startDemo} className="min-h-11 cursor-pointer font-bold text-teal underline underline-offset-4">
              {t.demoOpen}
            </button>
          )}
        </div>
      </div>

      {!full ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          {searchBox}
          {myButton}
        </div>
      ) : null}

      <div
        className={
          full
            ? "fixed inset-0 z-50 bg-butter"
            : "relative overflow-hidden rounded-[28px] bg-butter shadow-[0_18px_40px_-24px_rgba(51,36,43,0.5)]"
        }
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={t.canvasLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={`block w-full font-sans outline-none focus-visible:ring-4 focus-visible:ring-teal ${
            full ? "h-dvh" : "h-[56vh] sm:h-[min(70vh,620px)]"
          } ${interactive ? "cursor-grab touch-none" : "cursor-pointer touch-pan-y"}`}
        />
        {!flowers ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-semibold text-plum-soft" role="status">
            {failed ? t.loadError : t.loading}
          </p>
        ) : null}
        {missing !== null && !demo ? (
          <p role="status" className="absolute inset-x-3 top-32 z-10 mx-auto max-w-sm rounded-2xl bg-white/95 p-3 text-center text-[15px] font-semibold">
            {fill(t.missingTrail, { number: missing })}
            <button type="button" onClick={() => setMissing(null)} className="ml-2 min-h-11 font-bold text-teal underline">
              {t.card.close}
            </button>
          </p>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
          {full ? (
            <div className="pointer-events-auto flex items-start gap-2">
              {searchBox}
              <button type="button" onClick={exitFull} className="min-h-12 shrink-0 cursor-pointer rounded-full bg-plum px-5 font-bold text-white">
                {t.full.close}
              </button>
            </div>
          ) : null}
          {demo ? (
            <p className="pointer-events-auto flex flex-wrap items-center gap-x-2 self-start rounded-2xl bg-plum px-3.5 py-1 text-[13px] font-semibold text-white">
              {fill(t.demo.banner, { count: t.demo.count.toLocaleString("hr-HR") })}
              <button type="button" onClick={stopDemo} className="min-h-11 cursor-pointer font-bold text-butter underline underline-offset-4">
                {t.demo.exitShort}
              </button>
            </p>
          ) : null}
          <p className="pointer-events-auto self-start rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold">
            {fill(t.count, { count: count.toLocaleString("hr-HR") })}
            {flowers && interactive ? (
              <span className="font-semibold text-plum-soft">
                {" · "}
                {fill(t.progress, {
                  print: currentPrint,
                  filled: Math.max(0, filledInPrint).toLocaleString("hr-HR"),
                  capacity: PRINT_CAPACITY.toLocaleString("hr-HR"),
                })}
              </span>
            ) : null}
          </p>
          {interactive && flowers && count > 0 ? (
            <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]" role="group" aria-label={t.filtersLabel}>
              <button
                type="button"
                onClick={() => (walking ? stopWalk() : startWalk())}
                className="min-h-11 shrink-0 cursor-pointer rounded-full bg-teal px-4 text-[13px] font-bold text-white"
              >
                {walking ? t.walk.stop : t.walk.start}
              </button>
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`min-h-11 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-bold ${filter === key ? "bg-plum text-white" : "bg-white/90 text-plum"}`}
                >
                  {t.filters[key]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {interactive && zoomedIn && !walking ? (
          <canvas
            ref={minimapRef}
            role="img"
            aria-label={t.minimap}
            onPointerDown={onMinimap}
            className="absolute bottom-20 left-3 z-10 h-28 w-28 cursor-pointer rounded-2xl shadow-[0_10px_24px_-14px_rgba(51,36,43,0.6)] sm:h-36 sm:w-36"
          />
        ) : null}
        {walking && walkCaption ? (
          <p role="status" className="absolute inset-x-3 bottom-20 z-10 mx-auto max-w-sm rounded-2xl bg-white/95 px-4 py-2 text-center text-[15px] font-semibold">
            {fill(t.walk.passing, { names: walkCaption })}
          </p>
        ) : null}

        {interactive ? (
          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
            <button type="button" aria-label={t.zoomIn} onClick={zoomInCenter} className={roundButton}>
              <span aria-hidden="true">+</span>
            </button>
            <button type="button" aria-label={t.zoomOut} onClick={zoomOutCenter} className={roundButton}>
              <span aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              aria-label={t.zoomAll}
              title={t.zoomAll}
              onClick={() => {
                stopWalk();
                showAll();
              }}
              className={roundButton}
            >
              <FitIcon size={20} />
            </button>
          </div>
        ) : null}
        {interactive && !full ? (
          <button
            type="button"
            onClick={() => enterFull(null)}
            className="absolute right-3 top-3 z-10 hidden min-h-11 cursor-pointer rounded-full bg-white/90 px-4 text-sm font-bold text-plum sm:block"
          >
            {t.full.open}
          </button>
        ) : null}

        {!interactive && flowers ? (
          <button
            type="button"
            onClick={() => enterFull(null)}
            className="absolute left-1/2 top-1/2 min-h-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/95 px-5 font-bold text-plum shadow-[0_12px_24px_-14px_rgba(51,36,43,0.6)]"
          >
            {t.full.tapHint}
          </button>
        ) : null}

        {selected && cardPos && interactive ? (
          <div
            role="dialog"
            aria-label={selected.name}
            style={{ left: cardPos.left, top: cardPos.top }}
            className="absolute z-20 flex w-[min(300px,calc(100%-24px))] flex-col gap-1.5 rounded-3xl bg-white p-4 pr-12 shadow-[0_18px_40px_-18px_rgba(51,36,43,0.55)]"
          >
            <button
              type="button"
              aria-label={t.card.close}
              onClick={() => setSelected(null)}
              className="absolute right-1 top-1 flex size-11 cursor-pointer items-center justify-center text-2xl text-plum-soft"
            >
              <span aria-hidden="true">×</span>
            </button>
            {selectedIsMine ? (
              <span className="self-start rounded-full bg-teal px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{t.card.mine}</span>
            ) : null}
            <span className="font-display text-2xl font-extrabold leading-tight [overflow-wrap:anywhere]">{selected.name}</span>
            <span className="text-sm text-plum-soft">
              {t.species[selected.species]} · {fill(t.card.number, { number: selected.number.toLocaleString("hr-HR") })}
            </span>
            <span className="text-sm font-semibold text-teal-deep">{placeLabel(selected.number)}</span>
            <span className="text-sm text-plum-soft">{fill(t.card.added, { date: formatPetDate(selected.day, "day") ?? selected.day })}</span>
            {neighbours.length > 0 ? (
              <span className="text-sm text-plum-soft">{fill(t.card.neighbours, { names: neighbours.join(", ") })}</span>
            ) : null}
            {!demo ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.slug ? (
                  <Link
                    href={`/spomen/${selected.slug}` as Route}
                    className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-4 text-sm font-bold text-white no-underline hover:bg-terracotta-deep"
                  >
                    {t.card.openMemorial}
                  </Link>
                ) : null}
                {selectedIsMine && !selected.slug ? (
                  <Link
                    href={"/izradi?iz=livada" as Route}
                    className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-4 text-sm font-bold text-white no-underline hover:bg-terracotta-deep"
                  >
                    {t.card.makeMemorial}
                  </Link>
                ) : null}
                <Link
                  href={`/livada/trag/${selected.number}` as Route}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-teal bg-mint px-4 text-sm font-bold text-teal-deep no-underline"
                >
                  {t.card.page}
                </Link>
                <button
                  type="button"
                  onClick={() => copyLink(selected)}
                  className="min-h-11 cursor-pointer rounded-full border-2 border-plum bg-white px-4 text-sm font-bold text-plum hover:bg-butter"
                >
                  {t.card.copyLink}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {toast ? (
          <p role="status" className="absolute left-1/2 top-16 z-30 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full bg-teal px-5 py-2 text-[15px] font-bold text-white">
            {toast}
          </p>
        ) : null}

        <div className="absolute inset-x-3 bottom-4 flex justify-center">
          <button
            type="button"
            onClick={openClaim}
            className="min-h-13 cursor-pointer rounded-full bg-terracotta px-6 text-[16px] font-bold text-white shadow-[0_12px_24px_-12px_rgba(168,58,24,0.8)] hover:bg-terracotta-deep"
          >
            {t.claim.open}
          </button>
        </div>

        {claimOpen ? <ClaimSheet onClose={() => setClaimOpen(false)} /> : null}
      </div>

      {latest.length > 0 && !full ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-xl font-extrabold">{t.latestTitle}</h3>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {latest.map((flower) => (
              <button
                key={flower.number}
                type="button"
                onClick={() => {
                  if (!interactive) enterFull(flower);
                  else {
                    canvasRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                    focus(flower);
                  }
                }}
                className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-white px-4 text-[15px] font-bold"
              >
                <span className="size-3 rounded-full" style={{ background: PETAL_COLORS[flower.petal] }} aria-hidden="true" />
                {flower.name}
                <span className="font-medium text-plum-soft">{t.species[flower.species]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ClaimSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<MeadowSpecies>("pas");
  const [petal, setPetal] = useState<MeadowPetal>("terakota");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [anniversary, setAnniversary] = useState(false);
  const [dedication, setDedication] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const startedAt = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    nameInput.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (step === 2) emailInput.current?.focus();
  }, [step]);

  const next = () => {
    const check = checkFlowerName(name);
    if (!check.ok) {
      setError(t.claim.errors[check.reason]);
      nameInput.current?.focus();
      return;
    }
    setError(null);
    setStep(2);
  };

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError(t.claim.errors.email);
      emailInput.current?.focus();
      return;
    }
    if (!consent) {
      setError(t.claim.errors.consent);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/livada/tragovi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          species,
          petal,
          email: email.trim(),
          consent: true,
          newsletter,
          anniversary,
          dedication: dedication.trim(),
          elapsedMs: Date.now() - startedAt.current,
          website: "",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; days?: number; error?: string };
      if (response.ok && data.status === "sent") {
        setDays(data.days ?? 7);
        setStep(3);
        return;
      }
      const key = data.error && data.error in t.claim.errors ? (data.error as keyof typeof t.claim.errors) : "failed";
      setError(t.claim.errors[key]);
    } catch {
      setError(t.claim.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const steps = (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2].map((item) => (
        <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-terracotta" : "bg-line"}`} />
      ))}
    </div>
  );
  const errorLine = error ? (
    <p role="alert" className="text-sm font-medium text-danger">
      {error}
    </p>
  ) : null;
  const quiet = "min-h-11 cursor-pointer font-semibold text-plum-soft underline underline-offset-4";
  const primary = "min-h-13 cursor-pointer rounded-full bg-terracotta font-bold text-white hover:bg-terracotta-deep disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-plum/35 p-3 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trag-naslov"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col gap-3.5 overflow-auto rounded-[28px] bg-vanilla p-5 sm:p-6"
      >
        {step < 3 ? steps : null}
        {step === 1 ? (
          <>
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">{fill(t.claim.stepOf, { step: 1 })}</span>
            <h3 id="trag-naslov" className="font-display text-2xl font-extrabold">
              {t.claim.nameTitle}
            </h3>
            <label htmlFor="trag-ime" className="flex flex-col gap-1.5 font-bold">
              {t.claim.nameLabel}
              <input
                ref={nameInput}
                id="trag-ime"
                value={name}
                maxLength={30}
                autoComplete="off"
                placeholder={t.claim.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") next();
                }}
                className="min-h-13 rounded-2xl border-2 border-line bg-white px-4 font-medium text-plum"
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-bold">{t.claim.speciesLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {MEADOW_SPECIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={species === key}
                    onClick={() => setSpecies(key)}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 font-semibold ${species === key ? "border-teal bg-mint" : "border-line bg-white"}`}
                  >
                    <span className="size-3.5 rounded-full" style={{ background: SPECIES_COLORS[key] }} aria-hidden="true" />
                    {t.species[key]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-bold">{t.claim.petalLabel}</legend>
              <p className="-mt-1 text-[14px] text-plum-soft">{t.claim.petalHint}</p>
              <div className="flex flex-wrap gap-2">
                {MEADOW_PETALS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={petal === key}
                    aria-label={t.petals[key]}
                    onClick={() => setPetal(key)}
                    className={`flex size-11 cursor-pointer items-center justify-center rounded-full border-2 ${petal === key ? "border-teal bg-mint" : "border-line bg-white"}`}
                  >
                    <span className="size-6 rounded-full border border-plum/20" style={{ background: PETAL_COLORS[key] }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </fieldset>
            {errorLine}
            <button type="button" onClick={next} className={primary}>
              {t.claim.next}
            </button>
            <button type="button" onClick={onClose} className={quiet}>
              {t.claim.cancel}
            </button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">{fill(t.claim.stepOf, { step: 2 })}</span>
            <h3 id="trag-naslov" className="font-display text-2xl font-extrabold">
              {t.claim.emailTitle}
            </h3>
            <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-semibold [overflow-wrap:anywhere]">
              <span className="size-3.5 shrink-0 rounded-full border border-plum/20" style={{ background: PETAL_COLORS[petal] }} aria-hidden="true" />
              {fill(t.claim.summary, { name: name.trim(), species: t.species[species], petal: t.petals[petal] })}
            </p>
            <p className="text-[15px] leading-relaxed">{t.claim.emailBody}</p>
            <label htmlFor="trag-email" className="flex flex-col gap-1.5 text-[15px] font-bold">
              {t.claim.emailLabel}
              <input
                ref={emailInput}
                id="trag-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send();
                }}
                placeholder={t.claim.emailPlaceholder}
                className="min-h-12 rounded-2xl border-2 border-line bg-white px-4 font-medium text-plum"
              />
            </label>
            <label htmlFor="trag-posveta" className="flex flex-col gap-1.5 text-[15px] font-bold">
              {t.claim.dedicationLabel}
              <textarea
                id="trag-posveta"
                value={dedication}
                maxLength={80}
                rows={2}
                onChange={(event) => setDedication(event.target.value)}
                placeholder={t.claim.dedicationPlaceholder}
                className="min-h-12 resize-none rounded-2xl border-2 border-line bg-white px-4 py-2.5 font-medium text-plum"
              />
              <span className="text-[13px] font-normal text-plum-soft">
                {t.claim.dedicationHint} {[...dedication.trim()].length}/80
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-[14px] leading-snug text-plum-soft">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-terracotta" />
              {t.claim.consent}
            </label>
            <label className="flex items-start gap-2.5 text-[14px] leading-snug text-plum-soft">
              <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-terracotta" />
              {t.claim.newsletter}
            </label>
            <label className="flex items-start gap-2.5 text-[14px] leading-snug text-plum-soft">
              <input type="checkbox" checked={anniversary} onChange={(event) => setAnniversary(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-terracotta" />
              {t.claim.anniversary}
            </label>
            {errorLine}
            <button type="button" disabled={busy} onClick={send} className={primary}>
              {busy ? t.claim.sending : t.claim.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className={quiet}
            >
              {t.claim.back}
            </button>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-teal-deep">{t.claim.sentEyebrow}</span>
            <h3 id="trag-naslov" className="font-display text-2xl font-extrabold">
              {t.claim.sentTitle}
            </h3>
            <p className="text-[16px] leading-relaxed [overflow-wrap:anywhere]">{fill(t.claim.sentBody, { email: email.trim(), days })}</p>
            <p className="text-[14px] text-plum-soft">{t.claim.sentSpam}</p>
            <button type="button" onClick={onClose} className={primary}>
              {t.claim.sentClose}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
