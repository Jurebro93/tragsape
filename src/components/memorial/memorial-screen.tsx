/* eslint-disable @next/next/no-img-element -- slike poslužuje vlastita ruta koja provjerava pristup */
import type { Route } from "next";
import type { ReactNode } from "react";
import { BallIcon, CandleIcon, FlowerIcon, PawIcon, PawTrail, PenIcon, TreatIcon } from "@/components/icons";
import { CandleWidget } from "@/components/memorial/candle-widget";
import { GuestbookForm } from "@/components/memorial/guestbook-form";
import { PetPortrait } from "@/components/memorial/pet-portrait";
import { ReportButton } from "@/components/memorial/report-button";
import { ShareButton } from "@/components/memorial/share-button";
import { VideoEmbed } from "@/components/memorial/video-embed";
import { Logo } from "@/components/site-chrome";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Chip, Eyebrow } from "@/components/ui/card";
import { formatDateTime, formatLifespan, formatPetDate, formatYears, yearsBetween } from "@/lib/format";
import { isPaid, photoUrl, presentForTier, type GestureKind, type MemorialView } from "@/lib/memorial";
import { speciesLabel } from "@/lib/species";
import { DEFAULT_THEME, toThemeKey } from "@/lib/themes";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { gesture as gestureMessages } from "@/messages/hr/gesture";
import { memorial as messages } from "@/messages/hr/memorial";

const gestureIcons: Record<GestureKind, ReactNode> = {
  svijeca: <CandleIcon size={22} />,
  sapica: <PawIcon size={24} />,
  cvijet: <FlowerIcon size={22} />,
  poslastica: <TreatIcon size={22} />,
  loptica: <BallIcon size={22} />,
};

const gestureTones = ["bg-sun", "bg-mint", "bg-butter"];

function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[28px] font-extrabold leading-tight">
      {children}
    </h2>
  );
}

/**
 * Stranica memorijala. Ista komponenta služi javnoj stranici, pregledu prije objave i primjeru.
 * - `mode="preview"`: bez radnji posjetitelja; prikazuje kako će stranica izgledati.
 * - `mode="example"`: izmišljeni ljubimac, jasno označen.
 */
export function MemorialScreen({
  view: rawView,
  mode = "public",
  ownerBar,
  notice,
  illustration,
}: {
  view: MemorialView;
  mode?: "public" | "preview" | "example";
  ownerBar?: ReactNode;
  notice?: ReactNode;
  illustration?: ReactNode;
}) {
  const view = presentForTier(rawView);
  const { memorial, photos, guestbook, gestures, timeline, letters, shareKey } = view;
  const interactive = mode === "public";
  const cover = photos.find((photo) => photo.id === memorial.coverPhotoId) ?? photos[0] ?? null;
  const gallery = photos.filter((photo) => photo.id !== cover?.id);
  const lifespan = formatLifespan(
    { date: memorial.birthDate, precision: memorial.birthPrecision },
    { date: memorial.deathDate, precision: memorial.deathPrecision },
  );
  const years = yearsBetween(memorial.birthDate, memorial.deathDate);
  const kind = memorial.breed ?? speciesLabel(memorial.species);
  const favorites = [
    { label: messages.favorites.toy, value: memorial.favoriteToy },
    { label: messages.favorites.treat, value: memorial.favoriteTreat },
    { label: messages.favorites.place, value: memorial.favoritePlace },
  ].flatMap((item) => (item.value ? [{ label: item.label as string, value: item.value }] : []));
  const storyParagraphs = (memorial.storyMd ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const name = memorial.name || "Spomen";

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-vanilla text-plum"
      // Tema je dio plaćenog paketa; besplatni spomen uvijek koristi zadanu.
      data-theme={isPaid(memorial.tier) ? toThemeKey(memorial.theme) : DEFAULT_THEME}
    >
      <div className="rounded-b-[40px] bg-butter">
        <div className="mx-auto flex w-full max-w-xl flex-col">
          {mode === "preview" ? null : (
            <header className="flex items-center justify-between px-5 py-3">
              <Logo />
              {interactive ? <ShareButton name={name} /> : null}
            </header>
          )}
          {ownerBar}
          {notice}
          <section className="flex flex-col items-center px-6 pb-8 pt-3 text-center">
            {mode === "example" ? (
              <p className="rounded-full bg-vanilla px-3.5 py-1 text-[13px] font-semibold">{common.exampleBadge}</p>
            ) : null}
            <div className="mt-6">
              <PetPortrait photo={cover} name={name} shareKey={shareKey} illustration={illustration} />
            </div>
            <h1 className="mt-6 text-[64px] font-extrabold leading-[0.95] tracking-[-0.03em] [overflow-wrap:anywhere]">
              {name}
            </h1>
            {kind ? (
              <Chip tone="teal" className="mt-3 text-sm">
                {kind}
              </Chip>
            ) : null}
            {lifespan ? <p className="mt-2.5 font-medium">{lifespan}</p> : null}
            {years !== null && years > 0 ? (
              <p className="text-[15px] text-plum-soft">{fill(messages.yearsOfLife, { years: formatYears(years) })}</p>
            ) : null}
          </section>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-9 px-6 pb-10 pt-8">
        {memorial.dedication ? (
          <section className="flex flex-col gap-2.5">
            <Eyebrow>Posveta</Eyebrow>
            <blockquote className="font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] [overflow-wrap:anywhere]">
              „{memorial.dedication}”
            </blockquote>
          </section>
        ) : null}

        <section className="flex gap-2.5">
          <CandleWidget
            memorialId={memorial.id}
            shareKey={shareKey}
            initialTotal={memorial.candleCount}
            disabled={!interactive}
          />
          {memorial.guestbookMode === "off" ? null : (
            <div className="flex-1">
              <a href="#knjiga" className={buttonClass("secondary", "lg", "w-full px-3")}>
                <PenIcon />
                {messages.write}
              </a>
            </div>
          )}
        </section>

        {memorial.traits.length > 0 || favorites.length > 0 || memorial.nicknames.length > 0 || memorial.funnyHabits ? (
          <section className="flex flex-col gap-4">
            <SectionHeading>{messages.sections.character}</SectionHeading>
            {memorial.traits.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {memorial.traits.map((trait, index) => (
                  <li key={trait}>
                    <Chip tone={index % 2 === 0 ? "butter" : "mint"}>{trait}</Chip>
                  </li>
                ))}
              </ul>
            ) : null}
            {favorites.length > 0 || memorial.nicknames.length > 0 ? (
              <dl className="flex flex-col rounded-3xl bg-white px-5 py-1">
                {memorial.nicknames.length > 0 ? (
                  <div className="flex justify-between gap-4 border-b border-line py-3.5 text-[15px] last:border-b-0">
                    <dt className="text-plum-soft">{messages.favorites.nicknames}</dt>
                    <dd className="text-right font-bold">{memorial.nicknames.join(", ")}</dd>
                  </div>
                ) : null}
                {favorites.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between gap-4 border-b border-line py-3.5 text-[15px] last:border-b-0"
                  >
                    <dt className="text-plum-soft">{item.label}</dt>
                    <dd className="text-right font-bold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {memorial.funnyHabits ? (
              <div className="flex flex-col gap-1">
                <h3 className="font-sans text-[15px] font-bold tracking-normal">{messages.favorites.habits}</h3>
                <p className="whitespace-pre-line leading-relaxed">{memorial.funnyHabits}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {storyParagraphs.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionHeading>{messages.sections.story}</SectionHeading>
            {storyParagraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line text-[17px] leading-[1.6]">
                {paragraph}
              </p>
            ))}
          </section>
        ) : null}

        {memorial.videoUrl ? <VideoEmbed url={memorial.videoUrl} /> : null}

        {gallery.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading>{messages.sections.photos}</SectionHeading>
            <ul className="grid grid-cols-2 gap-2.5">
              {gallery.map((photo) => (
                <li key={photo.id} className="flex flex-col gap-1.5">
                  <a
                    href={photoUrl(photo.id, "full", shareKey)}
                    target="_blank"
                    rel="noopener"
                    className="relative block overflow-hidden rounded-3xl bg-mint"
                  >
                    <img
                      src={photoUrl(photo.id, "thumb", shareKey)}
                      srcSet={`${photoUrl(photo.id, "thumb", shareKey)} 480w, ${photoUrl(photo.id, "medium", shareKey)} 1200w`}
                      sizes="(min-width: 640px) 270px, 45vw"
                      alt={photo.caption ?? fill(messages.photoAlt, { name })}
                      loading="lazy"
                      className="aspect-square size-full object-cover"
                    />
                    {photo.kind === "ai_portrait" ? (
                      <span className="absolute left-2 top-2 rounded-full bg-plum px-2.5 py-1 text-xs font-bold text-white">
                        {messages.aiLabel}
                      </span>
                    ) : null}
                  </a>
                  {photo.caption ? (
                    <span className="px-1 text-sm text-plum-soft [overflow-wrap:anywhere]">{photo.caption}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {timeline.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading>{messages.sections.timeline}</SectionHeading>
            <ol className="flex flex-col">
              {timeline.map((event, index) => (
                <li key={event.id} className="flex gap-4">
                  <span className="flex flex-col items-center" aria-hidden="true">
                    <span className="mt-1.5 size-3.5 shrink-0 rounded-full bg-sun" />
                    {index < timeline.length - 1 ? <span className="w-0.5 flex-1 bg-line" /> : null}
                  </span>
                  <span className="flex flex-col gap-0.5 pb-5">
                    {event.date ? (
                      <span className="text-sm font-bold text-terracotta-deep">
                        {formatPetDate(event.date, event.precision)}
                      </span>
                    ) : null}
                    <span className="font-bold [overflow-wrap:anywhere]">{event.title}</span>
                    {event.body ? (
                      <span className="whitespace-pre-line text-[15px] text-plum/90">{event.body}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {letters.length > 0 ? (
          <section className="flex flex-col gap-4">
            <SectionHeading>{messages.sections.letters}</SectionHeading>
            <ul className="flex flex-col gap-2.5">
              {letters.map((letter) => (
                <li key={letter.id} className="flex flex-col gap-2 rounded-3xl bg-white p-5">
                  <span className="text-sm font-bold text-terracotta-deep">{formatPetDate(letter.writtenOn)}</span>
                  {letter.title ? (
                    <h3 className="text-xl font-extrabold [overflow-wrap:anywhere]">{letter.title}</h3>
                  ) : null}
                  <p className="whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]">{letter.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {gestures.length > 0 || (interactive && memorial.visibility !== "private") ? (
          <section className="flex flex-col gap-4">
            <SectionHeading>{messages.sections.gestures}</SectionHeading>
            <ul className="flex flex-col gap-2.5 empty:hidden">
              {gestures.map((gesture, index) => (
                <li key={gesture.id} className="flex items-start gap-3.5 rounded-3xl bg-white px-4 py-3.5">
                  <span
                    className={`flex size-[46px] shrink-0 items-center justify-center rounded-full text-plum ${gestureTones[index % gestureTones.length]}`}
                  >
                    {gestureIcons[gesture.kind]}
                  </span>
                  <span className="flex flex-col gap-0.5 text-[15px]">
                    <span className="font-bold">
                      {gesture.displayName} · {messages.gestureKinds[gesture.kind]}
                    </span>
                    {gesture.message ? <span className="text-plum/90">„{gesture.message}”</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {interactive && memorial.visibility !== "private" ? (
              <ButtonLink
                href={
                  `/gesta?m=${memorial.id}${shareKey ? `&k=${encodeURIComponent(shareKey)}` : ""}` as Route
                }
                variant="secondary"
                size="md"
              >
                {gestureMessages.open}
              </ButtonLink>
            ) : null}
          </section>
        ) : null}

        {memorial.guestbookMode === "off" ? null : (
          <section className="flex scroll-mt-6 flex-col gap-4" id="knjiga">
            <SectionHeading>{messages.sections.guestbook}</SectionHeading>
            {guestbook.length === 0 ? (
              <p className="text-plum-soft">
                {mode === "preview" ? messages.guestbook.previewNote : messages.guestbook.empty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {guestbook.map((entry, index) => (
                  <li
                    key={entry.id}
                    className={
                      index % 2 === 0
                        ? "rounded-[24px_24px_24px_6px] bg-butter p-[18px]"
                        : "rounded-[24px_24px_6px_24px] bg-mint p-[18px]"
                    }
                  >
                    <figure className="flex flex-col gap-2">
                      <blockquote className="whitespace-pre-line font-medium leading-relaxed [overflow-wrap:anywhere]">
                        {entry.body}
                      </blockquote>
                      <figcaption className="text-sm text-plum/80">
                        <strong className="font-bold text-plum">{entry.authorName}</strong> ·{" "}
                        {formatDateTime(entry.createdAt)}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            )}
            {interactive ? <GuestbookForm memorialId={memorial.id} shareKey={shareKey} /> : null}
          </section>
        )}

        {interactive ? (
          <div className="flex justify-center">
            <ReportButton memorialId={memorial.id} shareKey={shareKey} />
          </div>
        ) : null}
      </div>

      {mode === "preview" ? null : (
        <footer className="mt-auto rounded-t-[40px] bg-terracotta text-white">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-6 py-10 text-center">
            <PawTrail className="text-butter" />
            <p className="font-display text-[26px] font-extrabold leading-tight">{messages.footer.line}</p>
            <ButtonLink href="/izradi" variant="light">
              {messages.footer.cta}
            </ButtonLink>
            <p className="text-[13px]">{messages.footer.note}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
