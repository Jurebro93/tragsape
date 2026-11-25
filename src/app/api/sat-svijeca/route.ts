import { connection, NextResponse } from "next/server";
import { zagrebDayStart } from "@/lib/time";
import { getEveningCandles } from "@/server/memorials/livada";

/** Svijeće upaljene večeras (od 18:00 po zagrebačkom vremenu) na javnim spomenima. */
export async function GET() {
  await connection();
  const since = new Date(zagrebDayStart().getTime() + 18 * 60 * 60 * 1000);
  const memorials = await getEveningCandles(since.toISOString());
  return NextResponse.json(
    { since: since.toISOString(), total: memorials.reduce((sum, item) => sum + item.candles, 0), memorials },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
