import { NextResponse } from "next/server";
import { meadow } from "@/messages/hr/meadow";
import { saveFlowerEmail } from "@/server/meadow";
import { NEWSLETTER_EMAIL, subscribe } from "@/server/newsletter";
import { dailyIpHash, withinRateLimit } from "@/server/public/visitor";

const TOKEN = /^[0-9a-f]{48}$/;

/** E-mail uz trag: poveznica na cvijet, a uz posebnu privolu i prijava na newsletter (s potvrdom). */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const number = typeof body.number === "number" ? body.number : 0;
  const token = typeof body.claimToken === "string" ? body.claimToken : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!Number.isInteger(number) || number < 1 || !TOKEN.test(token)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!NEWSLETTER_EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent" }, { status: 400 });
  }
  if (!(await withinRateLimit(`livada-email:${dailyIpHash(request)}`, 3600, 6))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  if (!(await saveFlowerEmail(number, token, email))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (body.newsletter === true) {
    await subscribe(email, "livada", meadow.claim.newsletter).catch((error) => console.error(error));
  }
  return NextResponse.json({ status: "saved" });
}
