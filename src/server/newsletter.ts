import "server-only";
import { newsletter as t } from "@/messages/hr/newsletter";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { createAdminClient } from "@/server/supabase/admin";

/**
 * Newsletter s dvostrukom potvrdom. Servisni ključ se ovdje koristi jer je riječ o javnom unosu
 * (AGENTS.md); javne uloge nemaju pravo na tablicu. Odgovor nikad ne otkriva je li adresa već prijavljena.
 */

export const NEWSLETTER_EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const TOKEN = /^[0-9a-f]{48}$/;

export function normalizeSource(source: unknown): string | null {
  if (typeof source !== "string") {
    return null;
  }
  const clean = source.trim().toLowerCase();
  return /^(popup|podnozje|naslovnica|clanak:[a-z0-9-]{1,100})$/.test(clean) ? clean : null;
}

async function sendConfirmation(email: string, token: string): Promise<void> {
  const url = `${env.siteUrl}/newsletter/potvrda?t=${token}`;
  const { html, text } = renderEmail({
    heading: t.email_.heading,
    paragraphs: [t.email_.paragraph],
    button: { label: t.email_.button, url },
    footnote: t.email_.footnote,
  });
  await sendEmail({ to: email, subject: t.email_.subject, html, text });
}

/** Nova prijava ili ponovna prijava odjavljene adrese. Potvrđenoj adresi ne šalje se ništa. */
export async function subscribe(email: string, source: string | null): Promise<void> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { data: existing, error } = await admin
    .from("newsletter_subscribers")
    .select("id, status, confirm_token, confirmation_sent_at")
    .eq("email_normalized", normalized)
    .maybeSingle();
  if (error) {
    throw new Error(`newsletter: čitanje prijave: ${error.message}`);
  }

  if (!existing) {
    const { data, error: insertError } = await admin
      .from("newsletter_subscribers")
      .insert({ email: email.trim(), source, consent_text: t.consent })
      .select("id, confirm_token")
      .single();
    if (insertError) {
      throw new Error(`newsletter: upis prijave: ${insertError.message}`);
    }
    await sendConfirmation(email.trim(), data.confirm_token);
    await admin.from("newsletter_subscribers").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", data.id);
    return;
  }

  if (existing.status === "confirmed") {
    return;
  }
  // Odjavljena ili nepotvrđena adresa: nova privola i nova potvrda, najviše jednom u deset minuta.
  const lastSent = existing.confirmation_sent_at ? Date.parse(existing.confirmation_sent_at) : 0;
  if (existing.status === "pending" && Date.now() - lastSent < 10 * 60 * 1000) {
    return;
  }
  const { error: updateError } = await admin
    .from("newsletter_subscribers")
    .update({
      status: "pending",
      source,
      consent_text: t.consent,
      consented_at: new Date().toISOString(),
      confirmation_sent_at: new Date().toISOString(),
      unsubscribed_at: null,
    })
    .eq("id", existing.id);
  if (updateError) {
    throw new Error(`newsletter: obnova prijave: ${updateError.message}`);
  }
  await sendConfirmation(email.trim(), existing.confirm_token);
}

/** Potvrda prijave gumbom s poveznice iz e-maila. Vraća false za nepoznatu ili već iskorištenu poveznicu. */
export async function confirmSubscription(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) {
    return false;
  }
  const { data, error } = await createAdminClient()
    .from("newsletter_subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("confirm_token", token)
    .eq("status", "pending")
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Odjava gumbom s poveznice iz svakog newslettera. Ponovljena odjava je također uspjeh. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) {
    return false;
  }
  const { data, error } = await createAdminClient()
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}
