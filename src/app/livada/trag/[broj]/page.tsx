import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { CopyTrailLink } from "@/components/livada/copy-trail-link";
import { TrailPaw } from "@/components/livada/trail-paw";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { formatPetDate } from "@/lib/format";
import { flowerPlace } from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow } from "@/messages/hr/meadow";
import { getPublicTrail } from "@/server/meadow";

const t = meadow.trail;

function parseNumber(value: string): number {
  return /^\d{1,12}$/.test(value) ? Number(value) : 0;
}

/** Stranica traga se dijeli poveznicom, ali ne indeksira: ljudi je šalju obitelji, a tražilicama nije namijenjena. */
export async function generateMetadata({ params }: PageProps<"/livada/trag/[broj]">): Promise<Metadata> {
  const { broj } = await params;
  const trail = await getPublicTrail(parseNumber(broj));
  return {
    title: trail ? fill(t.metaTitle, { name: trail.name }) : meadow.title,
    description: t.metaDescription,
    robots: { index: false, follow: false },
  };
}

async function Content({ params }: Pick<PageProps<"/livada/trag/[broj]">, "params">) {
  const { broj } = await params;
  const trail = await getPublicTrail(parseNumber(broj));
  if (!trail) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-5 px-5 pb-16 pt-10">
        <p className="text-lg">{t.notFound}</p>
        <ButtonLink href="/livada">{t.back}</ButtonLink>
      </main>
    );
  }
  const place = flowerPlace(trail.number);
  const placeText = fill(meadow.place.label, { print: place.print, pad: meadow.place.pads[place.pad] });
  return (
    <>
      <div className="rounded-b-[40px] bg-butter">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pb-10 pt-6">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">
            {fill(t.eyebrow, { number: trail.number.toLocaleString("hr-HR") })}
          </span>
          <h1 className="text-4xl font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-5xl">{fill(t.title, { name: trail.name })}</h1>
          <p className="text-lg">
            {meadow.species[trail.species]} · {placeText}. {fill(t.since, { date: formatPetDate(trail.day, "day") ?? trail.day })}
          </p>
          {trail.dedication ? (
            <blockquote className="mt-1 max-w-xl rounded-3xl bg-white px-5 py-4 font-display text-xl font-bold leading-snug">
              „{trail.dedication}”
            </blockquote>
          ) : null}
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 pb-16 pt-8">
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-white p-5">
          <TrailPaw number={trail.number} petal={trail.petal} label={t.mapLabel} />
          <span className="font-semibold text-teal-deep">{placeText}</span>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ButtonLink href={`/livada?trag=${trail.number}` as Route}>{t.open}</ButtonLink>
          {trail.memorialSlug ? (
            <ButtonLink href={`/spomen/${trail.memorialSlug}` as Route} variant="secondary">
              {t.memorial}
            </ButtonLink>
          ) : null}
          <CopyTrailLink />
        </div>
        <ButtonLink href={"/livada" as Route} variant="quiet">
          {t.leave}
        </ButtonLink>
      </main>
    </>
  );
}

export default function TrailPage(props: PageProps<"/livada/trag/[broj]">) {
  return (
    <>
      <SiteHeader tone="butter" />
      <Suspense fallback={<div className="min-h-96 rounded-b-[40px] bg-butter" />}>
        <Content params={props.params} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
