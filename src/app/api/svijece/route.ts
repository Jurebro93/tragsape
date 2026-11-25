import { revalidateTag } from "next/cache";
import { connection, NextResponse } from "next/server";
import { zagrebDay, zagrebDayStart } from "@/lib/time";
import { dailyIpHash, dailyVisitorHash, findPublicTarget, withinRateLimit } from "@/server/public/visitor";
import { createAdminClient } from "@/server/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

async function candleState(memorialId: string, visitorHash: string) {
  const admin = createAdminClient();
  const day = zagrebDay();
  const [{ data: memorial }, { count: today }, { data: mine }] = await Promise.all([
    admin.from("memorials").select("candle_count").eq("id", memorialId).maybeSingle(),
    admin
      .from("candles")
      .select("memorial_id", { count: "exact", head: true })
      .eq("memorial_id", memorialId)
      .gte("created_at", zagrebDayStart().toISOString()),
    admin
      .from("candles")
      .select("memorial_id")
      .eq("memorial_id", memorialId)
      .eq("day", day)
      .eq("visitor_hash", visitorHash)
      .limit(1),
  ]);
  return { total: memorial?.candle_count ?? 0, today: today ?? 0, lit: (mine?.length ?? 0) > 0 };
}

/** Stanje svijeća za jednog posjetitelja: ukupno, danas i je li danas već zapalio svoju. */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const memorialId = url.searchParams.get("m") ?? "";
  if (!UUID.test(memorialId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const target = await findPublicTarget(memorialId, url.searchParams.get("k"));
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(await candleState(target.id, dailyVisitorHash(request)), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

/** Besplatna dnevna svijeća: jedna po posjetitelju, danu i memorijalu. Samo se broji. */
export async function POST(request: Request) {
  let body: { memorialId?: unknown; shareKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const memorialId = typeof body.memorialId === "string" ? body.memorialId : "";
  const shareKey = typeof body.shareKey === "string" ? body.shareKey : null;
  if (!UUID.test(memorialId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!(await withinRateLimit(`svijece:${dailyIpHash(request)}`, 3600, 60))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const target = await findPublicTarget(memorialId, shareKey);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const visitorHash = dailyVisitorHash(request);
  const { error } = await createAdminClient()
    .from("candles")
    .upsert(
      { memorial_id: target.id, day: zagrebDay(), visitor_hash: visitorHash },
      { onConflict: "memorial_id,day,visitor_hash", ignoreDuplicates: true },
    );
  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  revalidateTag(`memorial:${target.id}`, "max");
  return NextResponse.json(await candleState(target.id, visitorHash));
}
