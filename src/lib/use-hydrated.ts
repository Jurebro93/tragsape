import { useSyncExternalStore } from "react";

function subscribe() {
  return () => undefined;
}

/**
 * True tek kad je komponenta oživjela u pregledniku. Gumbi koji ovise o JavaScriptu ostaju
 * onemogućeni do tada, da rani dodir na sporoj mreži ne pošalje obrazac običnim putem
 * (pri čemu bi tekst poruke završio u adresi) ili se izgubi bez povratne informacije.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
