/** „Moj trag”: brojevi vlastitih tragova u ovom pregledniku. Bez pohrane radi samo poveznica iz e-maila. */

const MINE_KEY = "ts-livada-moji-tragovi";

export function readMine(): number[] {
  try {
    const raw = window.localStorage.getItem(MINE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "number" ? item : typeof item?.number === "number" ? item.number : null))
      .filter((item): item is number => item !== null && Number.isInteger(item) && item > 0);
  } catch {
    return [];
  }
}

export function rememberMine(number: number): number[] {
  const next = [...readMine().filter((item) => item !== number), number].slice(-20);
  try {
    window.localStorage.setItem(MINE_KEY, JSON.stringify(next));
  } catch {
    // Pohrana nije dostupna (privatni prozor): trag se i dalje nalazi poveznicom iz e-maila.
  }
  return next;
}
