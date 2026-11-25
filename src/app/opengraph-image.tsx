import { ImageResponse } from "next/og";
import { common } from "@/messages/hr/common";
import { CARD_SIZES, loadCardFonts, renderSiteCard } from "@/server/og/card";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = common.social.alt;

/** Zadana slika za dijeljenje: vrijedi za svaku stranicu koja nema vlastitu. */
export default async function Image() {
  const fonts = await loadCardFonts();
  return new ImageResponse(renderSiteCard({ title: common.tagline, subtitle: common.social.subtitle }), {
    ...size,
    fonts,
  });
}
