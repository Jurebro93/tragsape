import { ImageResponse } from "next/og";
import { CARD_SIZES, coverDataUrl, loadCardFonts, renderCard } from "@/server/og/card";
import { getPublicMemorialBySlug } from "@/server/memorials/access";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = "Spomen-stranica ljubimca na Tragu šape";

/** Slika za dijeljenje poveznice. Postoji samo za javne, objavljene memorijale. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await getPublicMemorialBySlug(slug);
  if (!view) {
    return new Response(null, { status: 404 });
  }
  const [fonts, photo] = await Promise.all([loadCardFonts(), coverDataUrl(view)]);
  return new ImageResponse(renderCard(view, photo, "og"), { ...size, fonts });
}
