import "server-only";
import { fill } from "@/lib/text";
import { requests as t } from "@/messages/hr/requests";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import { subscribe } from "@/server/newsletter";
import { createAdminClient } from "@/server/supabase/admin";

/** Novo pitanje čitatelja. Upis ide servisnim ključem jer javne uloge nemaju pravo na tablicu. */
export async function createTopicRequest(input: {
  question: string;
  email: string;
  page: string | null;
  newsletter: boolean;
  ipHash: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("topic_requests")
    .insert({ question: input.question, email: input.email, page: input.page, consent_text: t.consent, ip_hash: input.ipHash });
  if (error) {
    throw new Error(`Pitanje čitatelja nije spremljeno: ${error.message}`);
  }
  if (input.newsletter) {
    // Newsletter ima vlastitu potvrdu e-mailom; pitanje je spremljeno i ako ona ne uspije.
    await subscribe(input.email, "pitanje", t.newsletter).catch((failure) => {
      console.error("[pitanja] prijava na newsletter nije uspjela", failure);
    });
  }
}

/** E-mail čitatelju kad je članak o njegovu pitanju objavljen. */
export async function sendAnswerEmail(email: string, articleTitle: string, articleSlug: string): Promise<void> {
  const { html, text } = renderEmail({
    heading: t.email.heading,
    paragraphs: [fill(t.email.paragraph, { title: articleTitle })],
    button: { label: t.email.button, url: `${env.siteUrl}/vodic/${articleSlug}` },
    footnote: t.email.footnote,
  });
  await sendEmail({ to: email, subject: t.email.subject, html, text });
}
