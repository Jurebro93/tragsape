/** Teme stranice memorijala. Boje i fontovi svake teme su u `src/app/globals.css`. */
export const THEMES = [
  { key: "suncano-jutro", label: "Sunčano jutro", note: "Vedro i toplo.", swatches: ["#FFE7A8", "#C2451F", "#1F6F6B"] },
  { key: "livada", label: "Livada", note: "Mirno i prirodno.", swatches: ["#E4ECDD", "#3F6B4E", "#F2C566"] },
  { key: "album", label: "Album", note: "Osobno i tiho.", swatches: ["#E3EAF2", "#1D2A44", "#B0452F"] },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export const DEFAULT_THEME: ThemeKey = "suncano-jutro";

export function toThemeKey(value: string | null | undefined): ThemeKey {
  return THEMES.find((theme) => theme.key === value)?.key ?? DEFAULT_THEME;
}
