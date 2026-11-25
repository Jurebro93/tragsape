"use client";

import { Fragment, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Next posjećene stranice ne uklanja nego ih skriva (React Activity), zajedno sa stanjem
 * obrazaca: upisanim tekstom, otvorenim potvrdama i porukama „Spremljeno". Ovaj hook vraća ključ
 * koji se promijeni kad se stranica sakrije dok je „naoružan", pa se obrazac pod tim ključem
 * sljedeći put prikaže iznova, s vrijednostima s poslužitelja.
 *
 * `initiallyArmed = true`: obrazac se uvijek vraća na početak (kratki obrasci i potvrde).
 * `initiallyArmed = false`: nedovršen tekst ostaje sačuvan dok se obrazac izričito ne naoruža,
 * nakon spremanja ili odustajanja.
 */
export function useResetWhenHidden(initiallyArmed: boolean): [version: number, arm: (armed: boolean) => void] {
  const armed = useRef(initiallyArmed);
  const [version, setVersion] = useState(0);
  useLayoutEffect(
    () => () => {
      if (armed.current) {
        armed.current = initiallyArmed;
        setVersion((value) => value + 1);
      }
    },
    [initiallyArmed],
  );
  const arm = useCallback((value: boolean) => {
    armed.current = value;
  }, []);
  return [version, arm];
}

/** Sadržaj koji se nakon svakog odlaska sa stranice prikazuje iznova. */
export function ResetWhenHidden({ children }: { children: ReactNode }) {
  const [version] = useResetWhenHidden(true);
  return <Fragment key={version}>{children}</Fragment>;
}
