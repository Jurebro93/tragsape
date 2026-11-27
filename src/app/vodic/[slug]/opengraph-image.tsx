import { ImageResponse } from "next/og";
import { common } from "@/messages/hr/common";
import { content } from "@/messages/hr/content";
import { getPublishedArticle } from "@/server/content/articles";
import { CARD_SIZES, loadCardFonts, renderArticleCard } from "@/server/og/card";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = common.social.alt;

/** Naslovna slika članka i slika za dijeljenje: tema i naslov. Postoji samo za objavljene članke. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) {
    return new Response(null, { status: 404 });
  }
  const fonts = await loadCardFonts();
  const topic = content.guide.clusters[article.cluster].name;
  return new ImageResponse(renderArticleCard({ title: article.title, topic }), { ...size, fonts });
}
