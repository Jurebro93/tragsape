import { ImageResponse } from "next/og";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { CARD_SIZES, loadCardFonts, renderArticleCard } from "@/server/og/card";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = common.social.alt;

/** Slika za dijeljenje stranice zdravlja, u istom predlošku kao članci. */
export default async function Image() {
  const fonts = await loadCardFonts();
  return new ImageResponse(renderArticleCard({ title: content.guide.hubs.pages["zdravlje-macaka"].title, topic: content.guide.title }), { ...size, fonts });
}
