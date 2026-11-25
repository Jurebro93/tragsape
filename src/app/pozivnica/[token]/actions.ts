"use server";

import { redirect } from "next/navigation";
import type { AcceptInviteState } from "@/components/owner/accept-invite-form";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { getViewer } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

/**
 * Prihvaća pozivnicu. Radi samo kao POST s gumba, pa je skeneri pošte koji otvaraju poveznice
 * ne mogu potrošiti. Token provjerava i troši baza (`accept_member_invite`).
 */
export async function acceptInviteAction(
  token: string,
  _previous: AcceptInviteState,
  _formData: FormData,
): Promise<AcceptInviteState> {
  if (!TOKEN_PATTERN.test(token)) {
    return { error: owner.invite.errors.invalid };
  }
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    redirect(`/prijava?dalje=${encodeURIComponent(`/pozivnica/${token}`)}`);
  }
  const supabase = await createSessionClient();
  const { data: memorialId, error } = await supabase.rpc("accept_member_invite", { p_token: token });
  if (error || !memorialId) {
    for (const code of ["already_used", "not_found", "is_owner"] as const) {
      if (error?.message.includes(code)) {
        return { error: owner.invite.errors[code], code };
      }
    }
    return { error: common.errors.generic };
  }
  redirect(`/moji-ljubimci/${memorialId}`);
}
