/** Spaja nazive klasa i preskače prazne vrijednosti. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
