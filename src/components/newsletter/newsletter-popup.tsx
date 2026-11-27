"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";
import { newsletter as t } from "@/messages/hr/newsletter";

/** Nakon koliko provedenog vremena na stranici se nudi prijava. */
const DELAY_MS = 30_000;
const SEEN_KEY = "ts-newsletter-ponuda";

/**
 * Stranice na kojima se prijava ne nudi: spomen ljubimca, izrada spomena, korisnički račun,
 * plaćanje, admin i sam newsletter. Ondje bi skočni prozor usred tuge ili posla bio neprimjeren.
 */
const EXCLUDED = ["/spomen", "/izradi", "/moji-ljubimci", "/prijava", "/admin", "/newsletter", "/kupnja", "/poklon", "/obitelj", "/livada/potvrda"];

function excluded(path: string): boolean {
  return EXCLUDED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Bez pohrane se ponuda samo može ponoviti u istom posjetu.
  }
}

/**
 * Skočni prozor s prijavom na newsletter nakon 30 sekundi na stranici. Pokazuje se najviše jednom po
 * posjetu (oznaka u sessionStorage nestaje zatvaranjem preglednika) i zatvara se tipkom Esc.
 */
export function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (alreadySeen()) {
      return;
    }
    let timer = 0;
    const tryOpen = () => {
      if (excluded(pathRef.current) || alreadySeen()) {
        return;
      }
      // Ne prekida posjetitelja koji nešto ispunjava (obrazac u dijalogu) ili je na livadi preko cijelog zaslona.
      if (document.querySelector('[aria-modal="true"]') || document.body.style.overflow === "hidden") {
        timer = window.setTimeout(tryOpen, 15_000);
        return;
      }
      markSeen();
      setOpen(true);
    };
    timer = window.setTimeout(tryOpen, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/40 p-3 sm:items-center sm:p-6" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-md flex-col gap-4 rounded-[32px] bg-vanilla p-6 shadow-[0_24px_60px_-20px_rgba(51,36,43,0.6)] sm:p-7"
      >
        <button
          type="button"
          aria-label={t.close}
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 flex size-11 cursor-pointer items-center justify-center rounded-full text-2xl text-plum-soft hover:bg-butter"
        >
          <span aria-hidden="true">×</span>
        </button>
        <span className="text-sm font-bold uppercase tracking-[0.08em] text-terracotta">{t.eyebrow}</span>
        <h2 id="newsletter-popup-title" className="pr-10 font-display text-2xl font-extrabold leading-tight">
          {t.popupTitle}
        </h2>
        <p className="leading-relaxed text-plum-soft">{t.lead}</p>
        <NewsletterForm source="popup" autoFocus />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 cursor-pointer self-center text-[15px] font-semibold text-plum-soft underline underline-offset-4"
        >
          {t.notNow}
        </button>
      </div>
    </div>
  );
}
