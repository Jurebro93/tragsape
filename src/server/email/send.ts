import "server-only";
import { env } from "@/server/env";

export type EmailInput = { to: string; subject: string; html: string; text: string };

/**
 * Šalje transakcijski e-mail. Nikad ne baca grešku: neuspjelo slanje se zapisuje,
 * a radnja koja ga je pokrenula (poruka, plaćanje) ostaje uspješna.
 * Redoslijed: Resend u produkciji, Mailpit lokalno, inače samo zapis u dnevnik.
 */
export async function sendEmail(input: EmailInput): Promise<void> {
  try {
    if (env.resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.emailFrom,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!response.ok) {
        console.error("[email] Resend je odbio poruku", response.status, await response.text());
      }
      return;
    }
    if (env.mailpitUrl) {
      const from = /<([^>]+)>/.exec(env.emailFrom)?.[1] ?? "pozdrav@tragsape.com";
      const response = await fetch(`${env.mailpitUrl}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: from, Name: "Trag šape" },
          To: [{ Email: input.to }],
          Subject: input.subject,
          HTML: input.html,
          Text: input.text,
        }),
      });
      if (!response.ok) {
        console.error("[email] Mailpit je odbio poruku", response.status);
      }
      return;
    }
    console.info(`[email] (nije poslano, nema servisa) ${input.to}: ${input.subject}`);
  } catch (error) {
    console.error("[email] slanje nije uspjelo", error);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Jednostavan omot u bojama brenda: naslov, odlomci i neobavezan gumb. */
export function renderEmail(input: {
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footnote?: string;
}): { html: string; text: string } {
  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(p)}</p>`)
    .join("");
  const button = input.button
    ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:14px 24px;border-radius:28px;background:#C2451F;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none">${escapeHtml(input.button.label)}</a></p>`
    : "";
  const footnote = input.footnote
    ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#6B5560">${escapeHtml(input.footnote)}</p>`
    : "";
  const html = `<!doctype html><html lang="hr"><body style="margin:0;padding:24px;background:#FFFAF0;font-family:Arial,Helvetica,sans-serif;color:#33242B"><div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:24px;padding:32px"><p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#A83A18">Trag šape</p><h1 style="margin:0 0 16px;font-size:24px;line-height:1.2">${escapeHtml(input.heading)}</h1>${paragraphs}${button}${footnote}</div></body></html>`;
  const text = [
    input.heading,
    "",
    ...input.paragraphs,
    input.button ? `${input.button.label}: ${input.button.url}` : "",
    input.footnote ?? "",
  ]
    .filter((line, index) => line !== "" || index === 1)
    .join("\n");
  return { html, text };
}
