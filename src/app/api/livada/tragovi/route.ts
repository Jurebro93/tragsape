import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { checkFlowerName, isMeadowPetal, isMeadowSpecies } from "@/lib/meadow";
import { createFlower, listMeadowRows, MEADOW_TAG } from "@/server/meadow";
import { dailyIpHash, withinRateLimit } from "@/server/public/visitor";

const MIN_FILL_MS = 1500;

/** Svi vidljivi cvjetovi. Predmemorirano; novi trag osvježava popis. */
export async function GET() {
  const rows = await listMeadowRows();
  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } },
  );
}

/** Novi trag bez računa: ime, vrsta i boja. Zamka, vrijeme ispunjavanja i ograničenje po IP sažetku. */
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
  const ipHash = dailyIpHash(request);
  if (!(await withinRateLimit(`livada:${ipHash}`, 3600, 6))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  try {
    const flower = await createFlower({ name: name.name, species: body.species, petal: body.petal, ipHash });
    revalidateTag(MEADOW_TAG, "max");
    return NextResponse.json({ ...flower, name: name.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
