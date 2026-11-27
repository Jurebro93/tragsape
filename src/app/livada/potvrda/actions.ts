"use server";

import { updateTag } from "next/cache";
import { MEADOW_TAG, confirmFlower } from "@/server/meadow";

export type MeadowConfirmState =
  | { status: "idle" }
  | { status: "invalid" }
  | { status: "done"; number: number; name: string };

/** Potvrda tek na klik gumba: skener pošte koji otvori poveznicu ne potvrđuje ništa. */
export async function confirmFlowerAction(_state: MeadowConfirmState, formData: FormData): Promise<MeadowConfirmState> {
  const token = String(formData.get("t") ?? "");
  const result = await confirmFlower(token);
  if (!result) {
    return { status: "invalid" };
  }
  if (result.newlyConfirmed) {
    updateTag(MEADOW_TAG);
  }
  return { status: "done", number: result.number, name: result.name };
}
