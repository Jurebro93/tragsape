import { priceListFilename } from "@/lib/price-list";
import { getPriceLists } from "@/server/catalog";
import { env } from "@/server/env";

/** Zamijenjeni cjenik; dostupan je 15 dana nakon zamjene, nakon toga ga baza više ne pokazuje. */
export async function GET(_request: Request, { params }: { params: Promise<{ verzija: string }> }): Promise<Response> {
  const { verzija } = await params;
  if (!/^\d{1,12}$/.test(verzija)) {
    return new Response(null, { status: 404 });
  }
  const { current, archived } = await getPriceLists();
  const version = [current, ...archived].find((item) => item !== null && item.id === Number(verzija));
  if (!version) {
    return new Response(null, { status: 404 });
  }
  const filename = priceListFilename({
    sellerTaxId: env.sellerTaxId,
    version: version.id,
    publishedAt: version.publishedAt,
  });
  return new Response(version.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
