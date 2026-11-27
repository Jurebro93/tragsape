import { NextResponse } from "next/server";
import { checkDedication, checkFlowerName, isMeadowPetal, isMeadowSpecies } from "@/lib/meadow";
import { createPendingFlower, listMeadowRows, PENDING_DAYS } from "@/server/meadow";
import { NEWSLETTER_EMAIL } from "@/server/newsletter";
import { dailyIpHash, withinRateLimit } from "@/server/public/visitor";

const MIN_FILL_MS = 1500;

/** Svi vidljivi cvjetovi. Predmemorirano; potvrda traga osvježava popis. */
export async function GET() {
  const rows = await listMeadowRows();
  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } },
  );
}

/**
 * Novi trag bez računa: ime, vrsta, boja i e-mail s privolom. Trag čeka potvrdu iz e-maila i tek tada
 * dobiva mjesto. Zamka, vrijeme ispunjavanja, ograničenje po IP sažetku i po adresi.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.website === "string" && body.website !== "") || elapsedMs < MIN_FILL_MS) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const name = checkFlowerName(typeof body.name === "string" ? body.name : "");
  if (!name.ok) {
    return NextResponse.json({ error: name.reason }, { status: 400 });
  }
  if (!isMeadowSpecies(body.species) || !isMeadowPetal(body.petal)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!NEWSLETTER_EMAIL.test(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent" }, { status: 400 });
  }
  const dedication = checkDedication(body.dedication);
  if (!dedication.ok) {
    return NextResponse.json({ error: dedication.reason }, { status: 400 });
  }
  const ipHash = dailyIpHash(request);
  if (!(await withinRateLimit(`livada:${ipHash}`, 3600, 6))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  try {
    const result = await createPendingFlower({
      name: name.name,
      species: body.species,
      petal: body.petal,
      email,
      newsletter: body.newsletter === true,
      anniversary: body.anniversary === true,
      dedication: dedication.text,
      ipHash,
    });
    if (result === "limit") {
      return NextResponse.json({ error: "limit" }, { status: 429 });
    }
    return NextResponse.json({ status: "sent", days: PENDING_DAYS });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
