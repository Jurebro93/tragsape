"use server";

import { requireAdmin } from "@/server/auth";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";

export type TestEmailState = { message: string | null };

/** Probni e-mail na adminovu adresu: provjera da obavijesti stvarno stižu s prave domene. */
export async function sendTestEmailAction(_previous: TestEmailState): Promise<TestEmailState> {
  const viewer = await requireAdmin("/admin/sustav");
  if (!viewer.email) {
    return { message: "Račun nema e-mail adresu." };
  }
  const mail = renderEmail({
    heading: "Probna poruka",
    paragraphs: [
      "Ovo je probna poruka s Traga šape. Ako je čitaš, obavijesti e-mailom rade.",
      `Poslano s adrese ${env.emailFrom} za stranicu ${env.siteUrl}.`,
    ],
  });
  await sendEmail({ to: viewer.email, subject: "Trag šape: probna poruka", ...mail });
  return {
    message: env.resendApiKey
      ? `Poruka je predana servisu za slanje na ${viewer.email}. Ako ne stigne, pogledaj dnevnik poslužitelja.`
      : "Servis za e-mail nije podešen, pa je poruka samo zapisana u dnevnik poslužitelja.",
  };
}
