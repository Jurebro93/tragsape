"use server";

import type { TokenState } from "@/app/newsletter/actions";
import { stopAnniversary } from "@/server/meadow";

/** Odjava godišnjeg podsjetnika tek na klik gumba: skener pošte koji otvori poveznicu ne mijenja ništa. */
export async function stopAnniversaryAction(_state: TokenState, formData: FormData): Promise<TokenState> {
  const token = String(formData.get("t") ?? "");
  return { status: (await stopAnniversary(token)) ? "done" : "invalid" };
}
