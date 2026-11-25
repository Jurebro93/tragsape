"use client";

import { useSyncExternalStore } from "react";
import { ATTRIBUTION_KEYS } from "@/lib/attribution";

function subscribe() {
  return () => undefined;
}

/**
 * Izvor posjeta iz adrese (članak, alat, UTM) kao skrivena polja obrasca. Čita se u pregledniku,
 * pa stranica ostaje statična; ništa se ne sprema u kolačiće.
 */
export function AttributionFields() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  return (
    <>
      {ATTRIBUTION_KEYS.map((key) => {
        const value = params.get(key);
        return value ? <input key={key} type="hidden" name={key} value={value.slice(0, 120)} /> : null;
      })}
    </>
  );
}
