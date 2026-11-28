/** Provjera pitanja čitatelja; dijele je obrazac i poslužitelj. */

export type QuestionCheck = { ok: true; question: string } | { ok: false };

export function checkQuestion(input: unknown): QuestionCheck {
  const question = typeof input === "string" ? input.normalize("NFC").replace(/\s+/g, " ").trim() : "";
  const length = [...question].length;
  return length >= 10 && length <= 1000 ? { ok: true, question } : { ok: false };
}

/** Stranica s koje je pitanje poslano: samo putanja na ovoj stranici, bez upita i vanjskih adresa. */
export function normalizePage(input: unknown): string | null {
  if (typeof input !== "string" || !input.startsWith("/") || input.startsWith("//")) return null;
  return input.split(/[?#]/)[0].slice(0, 300);
}
