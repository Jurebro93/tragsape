"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailSchema } from "@/lib/validation";
import { auth as messages } from "@/messages/hr/auth";
import { getViewer, safeNextPath } from "@/server/auth";
import { env } from "@/server/env";
import { createSessionClient } from "@/server/supabase/session";

const CLAIM_COOKIE = "ts-preuzimanje";

export type EmailCodeState = {
  step: "email" | "code";
  email: string;
  /** Vrsta potvrde: obična prijava ili dodjela e-maila anonimnom nacrtu. */
  mode: "email" | "email_change";
  error: string | null;
};

function friendlyAuthError(error: { code?: string; status?: number; message?: string }): string {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return messages.errors.rate;
  }
  if (error.code === "validation_failed" || error.code === "email_address_invalid") {
    return messages.errors.email;
  }
  return messages.errors.generic;
}

/** Šalje kod na e-mail. Odgovor je isti postoji li račun ili ne. */
export async function requestCodeAction(_previous: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) {
    return { step: "email", email: String(formData.get("email") ?? ""), mode: "email", error: messages.errors.email };
  }
  const email = parsed.data;
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const redirectTo = `${env.siteUrl}${next}`;
  const supabase = await createSessionClient();
  const viewer = await getViewer();

  if (viewer?.isAnonymous) {
    // Nacrt već postoji pod anonimnim korisnikom: e-mail se dodjeljuje tom istom korisniku.
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    if (!error) {
      return { step: "code", email, mode: "email_change", error: null };
    }
    if (error.code !== "email_exists") {
      return { step: "email", email, mode: "email", error: friendlyAuthError(error) };
    }
    // E-mail već ima račun. Nacrt se prenosi na njega nakon prijave, uz jednokratan token
    // koji imaju samo ovaj preglednik (kolačić) i primatelj e-maila (poveznica).
    const { data: token } = await supabase.rpc("create_draft_claim");
    let claimRedirect = redirectTo;
    if (typeof token === "string" && token !== "") {
      (await cookies()).set(CLAIM_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60,
        path: "/",
      });
      claimRedirect += `${redirectTo.includes("?") ? "&" : "?"}preuzmi=${token}`;
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: claimRedirect },
    });
    if (otpError) {
      return { step: "email", email, mode: "email", error: friendlyAuthError(otpError) };
    }
    return { step: "code", email, mode: "email", error: null };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) {
    return { step: "email", email, mode: "email", error: friendlyAuthError(error) };
  }
  return { step: "code", email, mode: "email", error: null };
}

/** Prenosi nacrte anonimnog korisnika ako postoji token; tiho preskače ako ga nema. */
async function claimDrafts(token: string | null | undefined) {
  const cookieStore = await cookies();
  const claim = token ?? cookieStore.get(CLAIM_COOKIE)?.value;
  if (!claim) {
    return;
  }
  const supabase = await createSessionClient();
  await supabase.rpc("claim_drafts", { p_token: claim });
  cookieStore.delete(CLAIM_COOKIE);
}

export async function verifyCodeAction(_previous: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  const email = String(formData.get("email") ?? "");
  const mode = formData.get("mode") === "email_change" ? "email_change" : "email";
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (code.length !== 6) {
    return { step: "code", email, mode, error: messages.errors.code };
  }
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: mode });
  if (error) {
    return { step: "code", email, mode, error: messages.errors.code };
  }
  await claimDrafts(null);
  redirect(next);
}

/** Potvrda poveznicom iz e-maila. Traži klik na gumb, pa je skeneri pošte ne mogu potrošiti. */
export async function confirmLinkAction(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = formData.get("type") === "email_change" ? "email_change" : "email";
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const claim = String(formData.get("claim") ?? "") || null;
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    redirect("/prijava?greska=poveznica");
  }
  await claimDrafts(claim);
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/");
}
