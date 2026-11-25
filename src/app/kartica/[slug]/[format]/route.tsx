import { ImageResponse } from "next/og";
import { CARD_SIZES, coverDataUrl, loadCardFonts, renderCard, type CardFormat } from "@/server/og/card";
import { getPublicMemorialBySlug } from "@/server/memorials/access";

/**
 * Kartica za društvene mreže: `objava` (4:5) ili `story` (9:16). Samo za javne memorijale;
 * privatni i „samo s linkom" ovdje ne postoje.
 */
export async function GET(_request: Request, context: RouteContext<"/kartica/[slug]/[format]">) {
  const { slug, format } = await context.params;
  if (format !== "objava" && format !== "story") {
    return new Response(null, { status: 404 });
  }
  const view = await getPublicMemorialBySlug(slug);
  if (!view) {
    return new Response(null, { status: 404 });
  }
  const [fonts, photo] = await Promise.all([loadCardFonts(), coverDataUrl(view)]);
  const response = new ImageResponse(renderCard(view, photo, format as CardFormat), {
    ...CARD_SIZES[format as CardFormat],
    fonts,
  });
  response.headers.set("Content-Disposition", `inline; filename="trag-sape-${slug}-${format}.png"`);
  response.headers.set("Cache-Control", "public, max-age=3600");
  return response;
}
