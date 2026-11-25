import "server-only";
import { fill } from "@/lib/text";
import { owner } from "@/messages/hr/owner";
import { renderEmail, type EmailInput } from "@/server/email/send";
import type { ReminderKind } from "./reminder-dates";

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Adresa napisana u tekstu e-maila postaje poveznica. `renderEmail` prima samo običan tekst,
 * pa se ovdje zamjenjuje svako pojavljivanje adrese koje nije već unutar `href`.
 */
function linkify(html: string, url: string): string {
  const escaped = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const pattern = new RegExp(`(?<!href=")${escapeRegExp(escaped)}`, "g");
  return html.replace(pattern, `<a href="${escaped}" style="color:#1F6F6B">${escaped}</a>`);
}

/** Pozivnica suradniku: tko poziva, što suradnik smije i poveznica s jednokratnim tokenom. */
export function inviteEmail(input: {
  to: string;
  inviter: string;
  petName: string;
  inviteUrl: string;
}): EmailInput {
  const t = owner.inviteEmail;
  const inviter = singleLine(input.inviter);
  const petName = singleLine(input.petName);
  const { html, text } = renderEmail({
    heading: t.heading,
    paragraphs: [fill(t.intro, { inviter }), ...(petName ? [fill(t.pet, { name: petName })] : []), t.can],
    button: { label: t.cta, url: input.inviteUrl },
    footnote: t.footnote,
  });
  return { to: input.to, subject: fill(t.subject, { inviter }), html, text };
}

/** Podsjetnik na datum: kratko, s imenom ljubimca, poveznicom na spomen i načinom isključivanja. */
export function reminderEmail(input: {
  to: string;
  kind: ReminderKind;
  petName: string;
  memorialUrl: string;
  settingsUrl: string;
}): EmailInput {
  const t = owner.reminderEmail;
  const kind = t.kinds[input.kind];
  const name = singleLine(input.petName) || t.fallbackName;
  const { html, text } = renderEmail({
    heading: kind.heading,
    paragraphs: [fill(kind.line, { name }), t.open],
    button: { label: t.cta, url: input.memorialUrl },
    footnote: fill(t.footnote, { url: input.settingsUrl }),
  });
  return {
    to: input.to,
    subject: fill(kind.subject, { name }),
    html: linkify(html, input.settingsUrl),
    text,
  };
}
