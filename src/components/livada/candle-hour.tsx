"use client";

/* eslint-disable @next/next/no-img-element -- slike poslužuje vlastita ruta koja provjerava pristup */
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { CandleIcon } from "@/components/icons";
import { photoUrl } from "@/lib/memorial";
import { fill, plural } from "@/lib/text";
import { livada } from "@/messages/hr/livada";
import type { EveningCandle } from "@/server/memorials/livada";

const text = livada.candleHour;

/** Sat u Zagrebu (0–23) u ovom trenutku. */
function zagrebHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", hour: "2-digit", hourCycle: "h23" }).format(new Date()),
  );
}

type Evening = { total: number; memorials: EveningCandle[] };

/**
 * Sat svijeća: od 21:00 do 22:00 Livada pokazuje sve svijeće upaljene te večeri.
 * Izvan tog sata stoji samo kratka napomena. Odluka pada u pregledniku, pa stranica ostaje statična.
 */
export function CandleHour() {
  const [evening, setEvening] = useState<Evening | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("sat") === "svijeca";
    const check = () => {
      const now = forced || zagrebHour() === 21;
      setActive(now);
      return now;
    };
    let cancelled = false;
    const load = () => {
      if (!check()) {
        return;
      }
      fetch("/api/sat-svijeca")
        .then((response) => (response.ok ? response.json() : null))
        .then((data: Evening | null) => {
          if (data && !cancelled) {
            setEvening(data);
          }
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!active) {
    return (
      <p className="flex items-start gap-2.5 rounded-3xl bg-white px-5 py-4 text-[15px]">
        <CandleIcon className="mt-0.5 shrink-0 text-terracotta" />
        <span>{text.note}</span>
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-[32px] bg-plum px-5 py-6 text-white" aria-live="polite">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-[28px] font-extrabold">
          <CandleIcon size={26} className="text-sun" />
          {text.title}
        </h2>
        <p className="text-white/90">
          {evening && evening.total > 0
            ? fill(text.summary, {
                candles: plural(evening.total, livada.card.candles),
                pets: plural(evening.memorials.length, text.pets),
              })
            : text.none}
        </p>
      </div>
      {evening && evening.memorials.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {evening.memorials.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/spomen/${item.slug}` as Route}
                className="flex flex-col items-center gap-1.5 text-center text-white no-underline"
              >
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-white/10 shadow-[0_0_0_3px_var(--color-sun)]">
                  {item.coverPhotoId ? (
                    <img src={photoUrl(item.coverPhotoId, "thumb")} alt="" className="size-full object-cover" />
                  ) : (
                    <CandleIcon size={26} className="text-sun" />
                  )}
                </span>
                <span className="text-sm font-bold leading-tight [overflow-wrap:anywhere]">{item.name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-white/80">
                  <CandleIcon size={13} />
                  {item.candles}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
