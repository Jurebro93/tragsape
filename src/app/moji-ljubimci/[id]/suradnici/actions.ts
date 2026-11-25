"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/components/owner/types";
import { fill } from "@/lib/text";
import { emailSchema } from "@/lib/validation";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { getOwnerContext } from "@/server/owner/context";
import { inviteEmail } from "@/server/owner/emails";
import { createSessionClient } from "@/server/supabase/session";

const t = owner.members;

function inviteError(message: string | undefined): string {
  for (const code of ["paid_feature", "invalid_email", "member_limit"] as const) {
    if (message?.includes(code)) {
      return t.errors[code];
    }
  }
  return common.errors.generic;
}

/**
 * Poziva suradnika e-mailom ili ponovno šalje pozivnicu koja još nije prihvaćena. Token izdaje
 * baza (`invite_member`), koja i provjerava da poziva vlasnik plaćenog spomena.
 */
export async function inviteMemberAction(
  memorialId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await getOwnerContext(memorialId);
  if (!context || !context.isOwner) {
    return { error: common.errors.generic };
  }
  if (!context.paid) {
    return { error: t.errors.paid_feature };
  }
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) {
    return { error: t.errors.invalid_email };
  }
  const email = parsed.data;
  if (context.viewer.email?.toLowerCase() === email) {
    return { error: t.errors.ownEmail };
  }
  const supabase = await createSessionClient();
  // Baza prihvaćenom suradniku ne mijenja token, pa bi nova pozivnica vodila u prazno.
  const { data: existing } = await supabase
    .from("memorial_members")
    .select("invited_email, accepted_at")
    .eq("memorial_id", memorialId)
    .eq("invited_email", email)
    .maybeSingle();
  if (existing?.accepted_at) {
    return { error: t.errors.alreadyMember };
  }
  const { data: token, error } = await supabase.rpc("invite_member", { p_memorial_id: memorialId, p_email: email });
  if (error || !token) {
    return { error: inviteError(error?.message) };
  }
  // Pozivatelj se predstavlja imenom iz profila; e-mail adresom samo ako imena nema.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", context.viewer.id)
    .maybeSingle();
  const inviter = profile?.display_name?.trim() || context.viewer.email || common.brand;
  await sendEmail(
    inviteEmail({
      to: email,
      inviter,
      petName: context.memorial.name,
      inviteUrl: `${env.siteUrl}/pozivnica/${token}`,
    }),
  );
  refresh();
  return { error: null, done: true, message: fill(t.sent, { email }) };
}

/** Uklanja suradnika ili povlači pozivnicu. Smije samo vlasnik; isto provjerava RLS. */
export async function removeMemberAction(
  memorialId: string,
  email: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const context = await getOwnerContext(memorialId);
  if (!context || !context.isOwner) {
    return { error: common.errors.generic };
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("memorial_members")
    .delete()
    .eq("memorial_id", memorialId)
    .eq("invited_email", email)
    .select("invited_email");
  if (error || !data || data.length === 0) {
    return { error: common.errors.generic };
  }
  refresh();
  return { error: null, done: true };
}
