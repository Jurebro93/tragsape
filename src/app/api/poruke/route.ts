import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { fill } from "@/lib/text";
import { guestbookSchema } from "@/lib/validation";
import { renderEmail, sendEmail } from "@/server/email/send";
import { env } from "@/server/env";
import {
  dailyIpHash,
  findPublicTarget,
  passesTurnstile,
  withinRateLimit,
} from "@/server/public/visitor";
import { createAdminClient } from "@/server/supabase/admin";

const MIN_FILL_MS = 3000;

/**
 * Nova poruka u knjizi sjećanja. Posjetitelj ne piše izravno u bazu: ovdje se provjeravaju
 * zamka, vrijeme ispunjavanja, učestalost i pristup memorijalu, a vlasnik kojem ide obavijest
 * čita se iz pohranjenog vlasništva, nikad iz zahtjeva.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = guestbookSchema.safeParse(json);
  if (!parsed.success) {
    // Ispunjena zamka izgleda kao uspjeh, da robot ne nauči što ga je zaustavilo.
    const honeypot = parsed.error.issues.some((issue) => issue.path[0] === "website");
    if (honeypot) {
      return NextResponse.json({ status: "pending" });
    }
    return NextResponse.json({ error: "invalid", message: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const input = parsed.data;
  if (input.elapsedMs < MIN_FILL_MS) {
    return NextResponse.json({ status: "pending" });
  }
  const ipHash = dailyIpHash(request);
  const allowed =
    (await withinRateLimit(`poruke:${ipHash}`, 3600, 6)) &&
    (await withinRateLimit(`poruke-m:${input.memorialId}`, 3600, 40));
  if (!allowed) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const token = (json as { turnstileToken?: unknown }).turnstileToken;
  if (!(await passesTurnstile(typeof token === "string" ? token : null, request))) {
    return NextResponse.json({ error: "captcha" }, { status: 400 });
  }

  const target = await findPublicTarget(input.memorialId, input.shareKey);
  if (!target || target.guestbookMode === "off") {
    return NextResponse.json({ error: "closed" }, { status: 404 });
  }

  const status = target.guestbookMode === "open" ? "approved" : "pending";
  const admin = createAdminClient();
  const { error } = await admin.from("guestbook_entries").insert({
    memorial_id: target.id,
    author_name: input.name,
    author_email: input.email ? input.email : null,
    body: input.message,
    status,
    ip_hash: ipHash,
  });
  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  if (status === "approved") {
    revalidateTag(`memorial:${target.id}`, "max");
  }

  const { data: owner } = await admin.auth.admin.getUserById(target.ownerId);
  if (owner?.user?.email) {
    const name = target.name || "bez imena";
    const mail = renderEmail({
      heading: status === "pending" ? "Nova poruka čeka tvoje odobrenje" : "Nova poruka u knjizi sjećanja",
      paragraphs: [
        fill("Na spomenu „{name}” stigla je poruka. Piše {author}:", { author: input.name, name }),
        `„${input.message}”`,
        status === "pending"
          ? "Poruka se neće prikazati dok je ne odobriš."
          : "Poruka je već objavljena. Ako ti ne odgovara, možeš je sakriti.",
      ],
      button: { label: "Otvori poruke", url: `${env.siteUrl}/moji-ljubimci/${target.id}#poruke` },
      footnote: "Ovu obavijest dobivaš jer si vlasnik spomena na Tragu šape.",
    });
    await sendEmail({
      to: owner.user.email,
      subject: status === "pending" ? "Nova poruka čeka odobrenje" : "Nova poruka u knjizi sjećanja",
      ...mail,
    });
  }

  return NextResponse.json({ status });
}
