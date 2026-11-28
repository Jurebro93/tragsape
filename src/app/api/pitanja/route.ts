import { NextResponse } from "next/server";
import { checkQuestion, normalizePage } from "@/lib/requests";
import { NEWSLETTER_EMAIL } from "@/server/newsletter";
import { dailyIpHash, withinRateLimit } from "@/server/public/visitor";
import { createTopicRequest } from "@/server/topic-requests";

const MIN_FILL_MS = 2500;

/** Pitanje čitatelja: tema koju nije našao. Zamka, vrijeme ispunjavanja i ograničenje po IP sažetku. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  // Robot dobiva odgovor koji izgleda kao uspjeh, a ništa se ne sprema.
  if ((typeof body.website === "string" && body.website !== "") || elapsedMs < MIN_FILL_MS) {
    return NextResponse.json({ status: "sent" });
  }
  const question = checkQuestion(body.question);
  if (!question.ok) {
    return NextResponse.json({ error: "question" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!NEWSLETTER_EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent" }, { status: 400 });
  }
  const ipHash = dailyIpHash(request);
  if (!(await withinRateLimit(`pitanja:${ipHash}`, 3600, 5))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  try {
    await createTopicRequest({ question: question.question, email, page: normalizePage(body.page), newsletter: body.newsletter === true, ipHash });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ status: "sent" });
}
