"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { CalloutSummary } from "@/lib/content/callouts";
import { fill } from "@/lib/text";
import { content } from "@/messages/hr/content";

const t = content.article.callouts;
const ROTATE_MS = 9000;

/**
 * Traka „Jeste li znali?”: stoji ispod naslova članka, a pri spuštanju ostaje na vrhu zaslona.
 * Izmjenjuje zanimljivosti i savjete iz istog članka; klik vodi do okvira u tekstu.
 * Zatvaranje vrijedi do ponovnog otvaranja stranice; ništa se ne sprema.
 */
export function FactsBar({ items }: { items: CalloutSummary[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!open || paused || items.length < 2) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [open, paused, items.length]);

  if (!open || items.length === 0) {
    return null;
  }
  const item = items[index];
  const label = item.kind === "savjet" ? t.barIdea : t.cinjenica;
  const step = (delta: number) => {
    setPaused(true);
    setIndex((value) => (value + delta + items.length) % items.length);
  };

  return (
    <div
      role="region"
      aria-label={t.barLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      className="sticky top-2 z-30 flex items-start gap-2 rounded-3xl bg-plum p-3 pl-4 text-white shadow-[0_14px_30px_-16px_rgba(51,36,43,0.7)] sm:items-center sm:gap-3"
    >
      <a
        href={`#${item.id}`}
        aria-live="polite"
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-white no-underline"
      >
        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-sun">
          {label}
          {items.length > 1 ? (
            <span className="font-semibold normal-case tracking-normal text-white/70">
              {fill(t.barCount, { current: index + 1, total: items.length })}
            </span>
          ) : null}
        </span>
        <span className="line-clamp-2 text-[15px] leading-snug">{item.text}</span>
        <span className="sr-only">{t.barRead}</span>
      </a>
      <div className="flex shrink-0 items-center">
        {items.length > 1 ? (
          <>
            <BarButton label={t.barPrevious} onClick={() => step(-1)}>
              ‹
            </BarButton>
            <BarButton label={t.barNext} onClick={() => step(1)}>
              ›
            </BarButton>
          </>
        ) : null}
        <BarButton label={t.barClose} onClick={() => setOpen(false)}>
          ×
        </BarButton>
      </div>
    </div>
  );
}

function BarButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-white hover:bg-white/15",
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
