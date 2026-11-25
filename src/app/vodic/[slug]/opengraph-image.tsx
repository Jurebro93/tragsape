import { ImageResponse } from "next/og";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { getPublishedArticle } from "@/server/content/articles";
import { CARD_SIZES, loadCardFonts, renderSiteCard } from "@/server/og/card";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = common.social.alt;

/** Slika za dijeljenje članka: naslov na kartici brenda. Postoji samo za objavljene članke. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) {
    return new Response(null, { status: 404 });
  }
  const fonts = await loadCardFonts();
  return new ImageResponse(renderSiteCard({ title: article.title, label: content.guide.title }), { ...size, fonts });
}
