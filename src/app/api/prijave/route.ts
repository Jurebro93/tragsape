import { NextResponse } from "next/server";
import { reportSchema } from "@/lib/validation";
import { dailyIpHash, findPublicTarget, withinRateLimit } from "@/server/public/visitor";
import { createAdminClient } from "@/server/supabase/admin";

/** Prijava sadržaja. Sprema se za admina; posjetitelj dobiva samo potvrdu. */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    const honeypot = parsed.error.issues.some((issue) => issue.path[0] === "website");
    return honeypot ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const input = parsed.data;
  const ipHash = dailyIpHash(request);
  if (!(await withinRateLimit(`prijave:${ipHash}`, 3600, 10))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const shareKey = (json as { shareKey?: unknown }).shareKey;
  const target = await findPublicTarget(input.memorialId, typeof shareKey === "string" ? shareKey : null);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { error } = await createAdminClient().from("reports").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    memorial_id: target.id,
    reason: input.reason,
    details: input.details || null,
    reporter_email: input.email ? input.email : null,
    ip_hash: ipHash,
  });
  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
