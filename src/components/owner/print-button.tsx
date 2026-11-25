"use client";

import { Button } from "@/components/ui/button";

/** Otvara dijalog za ispis preglednika. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button size="md" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

/**
 * Stilovi koji vrijede samo dok je stranica za ispis vidljiva. Next posjećenu stranicu skriva,
 * a ne uklanja, pa bi obična `<style>` oznaka nastavila vrijediti i na sljedećoj stranici;
 * zato se list isključuje (`media="not all"`) čim se stranica sakrije.
 */
export function PrintStyles({ css }: { css: string }) {
  return (
    <style
      ref={(style) => {
        if (style) {
          style.media = "";
        }
        return () => {
          if (style) {
            style.media = "not all";
          }
        };
      }}
    >
      {css}
    </style>
  );
}
