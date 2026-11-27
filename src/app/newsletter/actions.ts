"use server";

import { confirmSubscription, unsubscribe } from "@/server/newsletter";

export type TokenState = { status: "idle" | "done" | "invalid" };

/** Potvrda ili odjava tek na klik gumba: skener pošte koji otvori poveznicu ne mijenja ništa. */
export async function confirmAction(_state: TokenState, formData: FormData): Promise<TokenState> {
  const token = String(formData.get("t") ?? "");
  return { status: (await confirmSubscription(token)) ? "done" : "invalid" };
}

export async function unsubscribeAction(_state: TokenState, formData: FormData): Promise<TokenState> {
  const token = String(formData.get("t") ?? "");
  return { status: (await unsubscribe(token)) ? "done" : "invalid" };
}
