"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPetDate } from "@/lib/format";
import {
  MEADOW_PETALS,
  MEADOW_SPECIES,
  PETAL_COLORS,
  SCENE_COLORS,
  SPECIES_COLORS,
  checkFlowerName,
  flowerPosition,
  meadowBounds,
  type MeadowPetal,
  type MeadowRow,
  type MeadowSpecies,
} from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow as t } from "@/messages/hr/meadow";

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

type Mine = { number: number; token: string };

const MINE_KEY = "ts-livada-moji-tragovi";
const FLOWER_SIZE = 26;
const CELL = 120;
const MAX_SCALE = 2.6;

function plainSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

function readMine(): Mine[] {
  try {
    const raw = window.localStorage.getItem(MINE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Mine => typeof item?.number === "number" && typeof item?.token === "string")
      : [];
  } catch {
    return [];
  }
}

function writeMine(list: Mine[]): void {
  try {
    window.localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    // Bez pohrane „Moj trag” radi samo do zatvaranja stranice; poveznica iz e-maila radi uvijek.
  }
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

/** Velika livada: svaki ljubimac je cvijet; mjesto određuje redni broj traga. */
export function BigMeadow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [flowers, setFlowers] = useState<Flower[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Flower | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);
  const [query, setQuery] = useState("");
  const [claimOpen, setClaimOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);

  const view = useRef({ x: 0, y: 0, scale: 1 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const fly = useRef<{ x: number; y: number; scale: number } | null>(null);
  const dirty = useRef(true);
  const fontFamily = useRef("system-ui, sans-serif");

  const byNumber = useMemo(() => new Map((flowers ?? []).map((flower) => [flower.number, flower])), [flowers]);
  const maxNumber = useMemo(() => (flowers ?? []).reduce((max, flower) => Math.max(max, flower.number), 0), [flowers]);
  const bounds = useMemo(() => meadowBounds(maxNumber), [maxNumber]);
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
  const mineNumbers = useMemo(() => new Set(mine.map((item) => item.number)), [mine]);

  // Učitavanje cvjetova i vlastitih tragova iz preglednika.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/livada/tragovi")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { rows: MeadowRow[] }) => {
        if (!cancelled) {
          setMine(readMine());
          setFlowers(data.rows.map(toFlower));
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

  const showAll = useCallback(() => {
    fly.current = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, scale: minScale() };
  }, [bounds, minScale]);

  const focus = useCallback((flower: Flower, open = true) => {
    // Cvijet dolazi malo ispod sredine, da kartica stane iznad njega i ne prekrije ime.
    const scale = Math.min(MAX_SCALE, Math.max(1.8, view.current.scale));
    fly.current = { x: flower.x, y: flower.y - Math.min(170, size.current.h * 0.28) / scale, scale };
    if (open) setSelected(flower);
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
      view.current = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, scale: minScale() };
      clamp();
      const wanted = Number(new URLSearchParams(window.location.search).get("trag"));
      const target = Number.isInteger(wanted) ? byNumber.get(wanted) : undefined;
      if (target) window.setTimeout(() => focus(target), 300);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [flowers, bounds, byNumber, clamp, focus, minScale]);

  // Crtanje: samo kad se nešto promijenilo, i samo cvjetovi u vidnom polju.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flowers) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const { w, h, dpr } = size.current;
      const v = view.current;
      const sx = (x: number) => (x - v.x) * v.scale + w / 2;
      const sy = (y: number) => (y - v.y) * v.scale + h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Nebo, sunce i obzor iznad livade.
      const horizonY = sy(bounds.minY + 230);
      const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizonY));
      sky.addColorStop(0, SCENE_COLORS.skyTop);
      sky.addColorStop(1, SCENE_COLORS.sky);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const ground = ctx.createLinearGradient(0, horizonY, 0, sy(bounds.maxY));
      ground.addColorStop(0, SCENE_COLORS.hill);
      ground.addColorStop(0.35, SCENE_COLORS.ground);
      ground.addColorStop(1, SCENE_COLORS.groundDeep);
      ctx.fillStyle = ground;
      ctx.fillRect(0, Math.max(0, horizonY), w, h);
      const sunX = sx(bounds.maxX * 0.55);
      const sunR = 110 * v.scale;
      ctx.fillStyle = SCENE_COLORS.sun;
      ctx.beginPath();
      ctx.arc(sunX, horizonY - sunR * 0.35, sunR, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = SCENE_COLORS.sunRing;
      ctx.lineWidth = 2;
      for (const k of [1.45, 1.95]) {
        ctx.beginPath();
        ctx.arc(sunX, horizonY - sunR * 0.35, sunR * k, Math.PI, 0);
        ctx.stroke();
      }
      ctx.strokeStyle = SCENE_COLORS.horizon;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      // Vidljive ćelije.
      const pad = FLOWER_SIZE * 2;
      const x0 = Math.floor((v.x - w / 2 / v.scale - pad) / CELL);
      const x1 = Math.floor((v.x + w / 2 / v.scale + pad) / CELL);
      const y0 = Math.floor((v.y - h / 2 / v.scale - pad) / CELL);
      const y1 = Math.floor((v.y + h / 2 / v.scale + pad) / CELL);
      const px = FLOWER_SIZE * v.scale;
      const visible: Flower[] = [];
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const list = grid.get(`${gx}:${gy}`);
          if (list) visible.push(...list);
        }
      }
      visible.sort((a, b) => a.y - b.y);

      for (const f of visible) {
        const cx = sx(f.x);
        const cy = sy(f.y);
        const isMine = mineNumbers.has(f.number);
        const isSelected = selected?.number === f.number;
        if (px < 5) {
          // Izdaleka: točkica u boji cvijeta.
          ctx.fillStyle = f.petal === "bijela" ? SCENE_COLORS.label : PETAL_COLORS[f.petal];
          const r = Math.max(1.2, px * 0.35) * (isMine || isSelected ? 2.2 : 1);
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
        const r = px * 0.32;
        const stem = px * 0.9;
        const headY = cy - stem;
        if (isMine || isSelected) {
          const glow = ctx.createRadialGradient(cx, headY, 0, cx, headY, r * 5);
          glow.addColorStop(0, SCENE_COLORS.glow);
          glow.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(cx, headY, r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = SCENE_COLORS.stem;
        ctx.lineWidth = Math.max(1, px * 0.07);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + r * 0.3, cy - stem * 0.5, cx, headY);
        ctx.stroke();
        ctx.fillStyle = PETAL_COLORS[f.petal];
        const turn = (f.number * 0.7) % (Math.PI * 2);
        for (let k = 0; k < 5; k++) {
          const a = turn + (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * r * 0.78, headY + Math.sin(a) * r * 0.78, r * 0.62, 0, Math.PI * 2);
          ctx.fill();
          if (f.petal === "bijela") {
            ctx.strokeStyle = SCENE_COLORS.outline;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.fillStyle = SPECIES_COLORS[f.species];
        ctx.beginPath();
        ctx.arc(cx, headY, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        if (isMine) {
          ctx.strokeStyle = SCENE_COLORS.mineRing;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, headY, r * 1.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (px >= 30 || isMine || isSelected) {
          const fontSize = Math.round(Math.min(18, Math.max(11, px * 0.36)));
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
    };

    const tick = () => {
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
      if (dirty.current) {
        dirty.current = false;
        draw();
      }
      frame = window.requestAnimationFrame(tick);
    };
    dirty.current = true;
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [flowers, grid, bounds, mineNumbers, selected, clamp]);

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
      const above = y - FLOWER_SIZE * v.scale * 1.6 - 200;
      const top = above > 64 ? above : Math.min(h - 220, y + 44);
      setCardPos((previous) => (previous && Math.abs(previous.left - left) < 0.5 && Math.abs(previous.top - top) < 0.5 ? previous : { left, top }));
      frame = window.requestAnimationFrame(follow);
    };
    frame = window.requestAnimationFrame(follow);
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  // Pomicanje, zumiranje i dodir.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pinch: number; scale: number } | null>(null);
  const lastTap = useRef(0);

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

  const zoomInCenter = useCallback(() => zoomAt(size.current.w / 2, size.current.h / 2, 1.5), [zoomAt]);
  const zoomOutCenter = useCallback(() => zoomAt(size.current.w / 2, size.current.h / 2, 1 / 1.5), [zoomAt]);

  const hitTest = useCallback(
    (sx: number, sy: number): Flower | null => {
      const v = view.current;
      const { w, h } = size.current;
      const wx = (sx - w / 2) / v.scale + v.x;
      const wy = (sy - h / 2) / v.scale + v.y;
      const radius = Math.max(FLOWER_SIZE * 0.8, 14 / v.scale);
      let best: Flower | null = null;
      let bestDistance = Infinity;
      const gx = Math.floor(wx / CELL);
      const gy = Math.floor(wy / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const f of grid.get(`${gx + dx}:${gy + dy}`) ?? []) {
            // Glava cvijeta je iznad točke sadnje kad je cvijet dovoljno velik.
            const headY = FLOWER_SIZE * v.scale >= 5 ? f.y - FLOWER_SIZE * 0.9 : f.y;
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
    [grid],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.offsetX, event.offsetY, Math.exp(-event.deltaY * 0.0015));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomAt, flowers]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
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

  const myLatest = mine.length > 0 ? byNumber.get(mine[mine.length - 1].number) : undefined;

  const copyLink = async (flower: Flower) => {
    const url = `${window.location.origin}/livada?trag=${flower.number}`;
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

  const onPlanted = (flower: Flower, token: string) => {
    setFlowers((previous) => [...(previous ?? []).filter((item) => item.number !== flower.number), flower]);
    const nextMine = [...readMine().filter((item) => item.number !== flower.number), { number: flower.number, token }];
    writeMine(nextMine);
    setMine(nextMine);
    window.setTimeout(() => focus(flower), 60);
  };

  const count = flowers?.length ?? 0;
  const selectedIsMine = selected ? mineNumbers.has(selected.number) : false;
  const selectedToken = selected ? mine.find((item) => item.number === selected.number)?.token : undefined;

  return (
    <section aria-labelledby="velika-livada" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="velika-livada" className="font-display text-3xl font-extrabold leading-tight">
          {t.title}
        </h2>
        <p className="max-w-2xl leading-relaxed text-plum-soft">{t.lead}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="livada-trazi" className="sr-only">
            {t.search.label}
          </label>
          <input
            id="livada-trazi"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
                      focus(flower);
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
                <p className="px-3 pb-1 text-[13px] text-plum-soft">
                  {fill(t.search.more, { shown: results.list.length, total: results.total })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {myLatest ? (
          <button
            type="button"
            onClick={() => focus(myLatest)}
            className="min-h-12 cursor-pointer rounded-full border-2 border-teal bg-mint px-5 font-bold text-teal-deep"
          >
            {t.myTrail}
          </button>
        ) : null}
      </div>

      <div ref={stageRef} className="relative overflow-hidden rounded-[28px] bg-butter shadow-[0_18px_40px_-24px_rgba(51,36,43,0.5)]">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={t.canvasLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="block h-[min(70vh,620px)] w-full cursor-grab touch-none font-sans outline-none focus-visible:ring-4 focus-visible:ring-teal"
        />
        {!flowers ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-semibold text-plum-soft" role="status">
            {failed ? t.loadError : t.loading}
          </p>
        ) : null}
        {flowers && count === 0 ? (
          <p className="absolute inset-x-6 top-1/3 text-center font-display text-xl font-extrabold">{t.empty}</p>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="pointer-events-auto rounded-full bg-white/90 px-4 py-2 text-sm font-bold">
            {fill(t.count, { count: count.toLocaleString("hr-HR") })}
          </span>
          <span className="pointer-events-auto flex gap-1.5">
            <button
              type="button"
              aria-label={t.zoomIn}
              onClick={zoomInCenter}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-plum"
            >
              <span aria-hidden="true">+</span>
            </button>
            <button
              type="button"
              aria-label={t.zoomOut}
              onClick={zoomOutCenter}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-plum"
            >
              <span aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              onClick={showAll}
              className="min-h-11 cursor-pointer rounded-full bg-white/90 px-4 text-sm font-bold text-plum"
            >
              {t.zoomAll}
            </button>
          </span>
        </div>

        {selected && cardPos ? (
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
            <span className="text-sm text-plum-soft">{fill(t.card.added, { date: formatPetDate(selected.day, "day") ?? selected.day })}</span>
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
              <button
                type="button"
                onClick={() => copyLink(selected)}
                className="min-h-11 cursor-pointer rounded-full border-2 border-plum bg-white px-4 text-sm font-bold text-plum hover:bg-butter"
              >
                {t.card.copyLink}
              </button>
            </div>
            {selectedIsMine && selectedToken ? <SaveEmail number={selected.number} token={selectedToken} compact /> : null}
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
            onClick={() => setClaimOpen(true)}
            className="min-h-13 cursor-pointer rounded-full bg-terracotta px-6 text-[16px] font-bold text-white shadow-[0_12px_24px_-12px_rgba(168,58,24,0.8)] hover:bg-terracotta-deep"
          >
            {t.claim.open}
          </button>
        </div>

        {claimOpen ? <ClaimSheet onClose={() => setClaimOpen(false)} onPlanted={onPlanted} /> : null}
      </div>
    </section>
  );
}

function ClaimSheet({ onClose, onPlanted }: { onClose: () => void; onPlanted: (flower: Flower, token: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<MeadowSpecies>("pas");
  const [petal, setPetal] = useState<MeadowPetal>("terakota");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [planted, setPlanted] = useState<{ number: number; token: string; name: string } | null>(null);
  const startedAt = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    nameInput.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const plant = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/livada/tragovi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, species, petal, elapsedMs: Date.now() - startedAt.current, website: "" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        number?: number;
        claimToken?: string;
        createdAt?: string;
        name?: string;
        error?: keyof typeof t.claim.errors;
      };
      if (!response.ok || !data.number || !data.claimToken) {
        setError(t.claim.errors[data.error && data.error in t.claim.errors ? data.error : "failed"]);
        return;
      }
      const flowerName = data.name ?? name.trim();
      const { x, y } = flowerPosition(data.number);
      onPlanted(
        {
          number: data.number,
          name: flowerName,
          species,
          petal,
          slug: "",
          day: (data.createdAt ?? new Date().toISOString()).slice(0, 10),
          x,
          y,
          search: plainSearch(flowerName),
        },
        data.claimToken,
      );
      setPlanted({ number: data.number, token: data.claimToken, name: flowerName });
      setStep(3);
    } catch {
      setError(t.claim.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const steps = (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3].map((item) => (
        <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-terracotta" : "bg-line"}`} />
      ))}
    </div>
  );

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-plum/35 p-3 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trag-naslov"
        className="flex max-h-full w-full max-w-md flex-col gap-3.5 overflow-auto rounded-[28px] bg-vanilla p-5 sm:p-6"
      >
        {steps}
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
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <button type="button" onClick={next} className="min-h-13 cursor-pointer rounded-full bg-terracotta font-bold text-white hover:bg-terracotta-deep">
              {t.claim.next}
            </button>
            <button type="button" onClick={onClose} className="min-h-11 cursor-pointer font-semibold text-plum-soft underline underline-offset-4">
              {t.claim.cancel}
            </button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">{fill(t.claim.stepOf, { step: 2 })}</span>
            <h3 id="trag-naslov" className="font-display text-2xl font-extrabold">
              {t.claim.petalTitle}
            </h3>
            <p className="text-[15px] text-plum-soft">{t.claim.petalHint}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.claim.petalTitle}>
              {MEADOW_PETALS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={petal === key}
                  aria-label={t.petals[key]}
                  onClick={() => setPetal(key)}
                  className={`flex size-12 cursor-pointer items-center justify-center rounded-full border-2 ${petal === key ? "border-teal bg-mint" : "border-line bg-white"}`}
                >
                  <span className="size-6 rounded-full border border-plum/20" style={{ background: PETAL_COLORS[key] }} aria-hidden="true" />
                </button>
              ))}
            </div>
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={plant}
              className="min-h-13 cursor-pointer rounded-full bg-terracotta font-bold text-white hover:bg-terracotta-deep disabled:opacity-60"
            >
              {busy ? t.claim.sending : t.claim.submit}
            </button>
            <button type="button" onClick={() => setStep(1)} className="min-h-11 cursor-pointer font-semibold text-plum-soft underline underline-offset-4">
              {t.claim.back}
            </button>
          </>
        ) : null}
        {step === 3 && planted ? (
          <>
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-teal-deep">
              {fill(t.claim.doneEyebrow, { number: planted.number.toLocaleString("hr-HR") })}
            </span>
            <h3 id="trag-naslov" className="font-display text-2xl font-extrabold [overflow-wrap:anywhere]">
              {fill(t.claim.doneTitle, { name: planted.name })}
            </h3>
            <p className="text-[15px] leading-relaxed">{t.claim.doneBody}</p>
            <SaveEmail number={planted.number} token={planted.token} />
            <p className="text-[13px] text-plum-soft">{t.claim.linkHint}</p>
            <button type="button" onClick={onClose} className="min-h-11 cursor-pointer font-semibold text-plum-soft underline underline-offset-4">
              {t.claim.skip}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SaveEmail({ number, token, compact = false }: { number: number; token: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [state, setState] = useState<{ kind: "idle" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  if (state.kind === "saved") {
    return (
      <p role="status" className="rounded-2xl bg-mint px-4 py-3 text-[15px] font-medium">
        {t.claim.saved}
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-11 cursor-pointer self-start text-sm font-bold text-teal underline underline-offset-4">
        {t.card.save}
      </button>
    );
  }
  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState({ kind: "error", message: t.claim.errors.email });
      return;
    }
    if (!consent) {
      setState({ kind: "error", message: t.claim.errors.consent });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/livada/tragovi/spremi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, claimToken: token, email: email.trim(), consent: true, newsletter }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (response.ok && data.status === "saved") setState({ kind: "saved" });
      else if (data.error === "rate") setState({ kind: "error", message: t.claim.errors.rate });
      else if (data.error === "email") setState({ kind: "error", message: t.claim.errors.email });
      else setState({ kind: "error", message: t.claim.errors.failed });
    } catch {
      setState({ kind: "error", message: t.claim.errors.failed });
    } finally {
      setBusy(false);
    }
  };
  const id = `trag-email-${number}`;
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="flex flex-col gap-1.5 text-[15px] font-bold">
        {t.claim.emailLabel}
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.claim.emailPlaceholder}
          className="min-h-12 rounded-2xl border-2 border-line bg-white px-4 font-medium text-plum"
        />
      </label>
      <label className="flex items-start gap-2.5 text-[14px] leading-snug text-plum-soft">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-terracotta" />
        {t.claim.consent}
      </label>
      <label className="flex items-start gap-2.5 text-[14px] leading-snug text-plum-soft">
        <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-terracotta" />
        {t.claim.newsletter}
      </label>
      {state.kind === "error" ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="min-h-12 cursor-pointer rounded-full bg-terracotta px-5 font-bold text-white hover:bg-terracotta-deep disabled:opacity-60"
      >
        {t.claim.saveEmail}
      </button>
    </div>
  );
}
