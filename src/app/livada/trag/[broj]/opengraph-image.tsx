import { ImageResponse } from "next/og";
import { flowerPlace } from "@/lib/meadow";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { meadow } from "@/messages/hr/meadow";
import { getPublicTrail } from "@/server/meadow";
import { CARD_SIZES, loadCardFonts, renderArticleCard } from "@/server/og/card";

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = common.social.alt;

/** Slika za dijeljenje traga: ime i mjesto na livadi, u istom predlošku kao članci. Bez e-maila i posvete. */
export default async function Image({ params }: { params: Promise<{ broj: string }> }) {
  const { broj } = await params;
  const trail = /^\d{1,12}$/.test(broj) ? await getPublicTrail(Number(broj)) : null;
  if (!trail) {
    return new Response(null, { status: 404 });
  }
  const place = flowerPlace(trail.number);
  const fonts = await loadCardFonts();
  return new ImageResponse(
    renderArticleCard({
      title: fill(meadow.trail.title, { name: trail.name }),
      topic: `${fill(meadow.card.number, { number: trail.number.toLocaleString("hr-HR") })} · ${fill(meadow.place.label, { print: place.print, pad: meadow.place.pads[place.pad] })}`,
    }),
    { ...size, fonts },
  );
}
