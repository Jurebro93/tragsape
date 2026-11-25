import { zagrebDay } from "@/lib/time";
import { getViewer } from "@/server/auth";
import { buildAccountExport } from "@/server/owner/export";

/**
 * „Preuzmi svoje podatke": JSON datoteka sa svime što korisnik posjeduje, pročitano njegovom
 * sesijom. Bez prijave vodi na prijavu.
 */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    const signIn = new URL("/prijava", request.url);
    signIn.searchParams.set("dalje", "/moji-ljubimci/racun");
    return Response.redirect(signIn, 303);
  }
  let body: string;
  try {
    body = JSON.stringify(await buildAccountExport(viewer), null, 2);
  } catch (error) {
    console.error("[racun] izvoz podataka nije uspio", error);
    return new Response(null, { status: 500 });
  }
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trag-sape-podaci-${zagrebDay()}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
