/** Slova i brojke koje se ne mogu zamijeniti jedne s drugima (bez O/0, I/1, L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Prijedlog koda, npr. TRAG-7KQ2MX; baza svejedno provjerava oblik i jedinstvenost. */
export function suggestPromoCode(
  random: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length)),
): string {
  return `TRAG-${Array.from(random(6), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`;
}
