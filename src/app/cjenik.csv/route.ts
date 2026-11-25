import { priceListFilename } from "@/lib/price-list";
import { getPriceLists } from "@/server/catalog";
import { env } from "@/server/env";

/**
 * Važeći cjenik za strojno čitanje, uvijek na istoj adresi (ZZP čl. 7. st. 9.; Pravilnik o načinu
 * objave cjenika proizvoda, NN 132/2026, čl. 6.): CSV, UTF-8, stupci odvojeni točkom sa zarezom.
 */
export async function GET(): Promise<Response> {
  const { current } = await getPriceLists();
  if (!current) {
    return new Response(null, { status: 404 });
  }
  const filename = priceListFilename({
    sellerTaxId: env.sellerTaxId,
    version: current.id,
    publishedAt: current.publishedAt,
  });
  return new Response(current.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
