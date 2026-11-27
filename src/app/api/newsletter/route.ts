import { NextResponse } from "next/server";
import { NEWSLETTER_EMAIL, normalizeSource, subscribe } from "@/server/newsletter";
import { dailyIpHash, withinRateLimit } from "@/server/public/visitor";

const MIN_FILL_MS = 2000;

/** Prijava na newsletter. Uvijek isti odgovor za novu i postojeću adresu. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  // Zamka za robote i prebrzo ispunjen obrazac: odgovor izgleda kao uspjeh, ali se ništa ne sprema.
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.website === "string" && body.website !== "") || elapsedMs < MIN_FILL_MS) {
    return NextResponse.json({ status: "pending" });
  }
  if (!NEWSLETTER_EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent" }, { status: 400 });
  }
  if (!(await withinRateLimit(`newsletter:${dailyIpHash(request)}`, 3600, 8))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  try {
    await subscribe(email, normalizeSource(body.source));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ status: "pending" });
}
