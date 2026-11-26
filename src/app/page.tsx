import type { Metadata } from "next";
import { ExampleGrid } from "@/components/examples/example-card";
import { PetArt } from "@/components/examples/pet-art";
import {
  ArrowRightIcon,
  BallIcon,
  CameraIcon,
  CandleIcon,
  FlowerIcon,
  PawIcon,
  PawTrail,
  PenIcon,
  ShareIcon,
  TreatIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card, Chip, Eyebrow } from "@/components/ui/card";
import { EXAMPLE_PETS, examplePet } from "@/lib/examples";
import { formatEuro } from "@/lib/format";
import { fill, plural } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { livada } from "@/messages/hr/livada";
import { marketing } from "@/messages/hr/marketing";
import { getProducts, getSettings } from "@/server/catalog";

const t = marketing.home;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const gestureKinds = [
  { key: "candle", label: t.gestures.kinds.candle, Icon: CandleIcon },
  { key: "paw", label: t.gestures.kinds.paw, Icon: PawIcon },
  { key: "flower", label: t.gestures.kinds.flower, Icon: FlowerIcon },
  { key: "treat", label: t.gestures.kinds.treat, Icon: TreatIcon },
  { key: "ball", label: t.gestures.kinds.ball, Icon: BallIcon },
] as const;

const stepIcons = [PenIcon, CameraIcon, ShareIcon] as const;

const sectionTitle = "font-display text-3xl font-extrabold leading-tight sm:text-4xl";

/** Umanjeni spomen izmišljenog ljubimca: pokazuje što posjetitelj dobiva, bez ijedne rečenice opisa. */
function MemorialPreview() {
  const pet = examplePet("medo");
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[21rem] pb-6 pt-2">
      <div className="absolute -right-2 top-0 size-28 rounded-full bg-sun sm:-right-6 sm:size-36" />
      <div className="relative flex flex-col items-center gap-2.5 rounded-[2rem] bg-white px-5 pb-6 pt-6 text-center shadow-[0_18px_40px_-18px_rgba(51,36,43,0.45)]">
        <span className="absolute left-4 top-4 rounded-full bg-plum px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          {t.hero.previewLabel}
        </span>
        <span className="mt-4 size-36 overflow-hidden rounded-full shadow-[0_0_0_6px_var(--color-sun)]">
          <PetArt pet="medo" decorative />
        </span>
        <span className="mt-1 font-display text-4xl font-extrabold leading-none">{pet.name}</span>
        <Chip tone="teal" className="px-3 py-1 text-sm">
          {pet.kind}
        </Chip>
        <span className="text-[15px]">{pet.years}</span>
        <p className="font-display text-lg font-extrabold leading-snug">„{pet.dedication}”</p>
        <span className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-terracotta px-5 text-[15px] font-bold text-white">
          <CandleIcon size={18} />
          {t.hero.previewCandle}
        </span>
        <span className="text-sm text-plum-soft">{plural(pet.candles, livada.card.candles)}</span>
      </div>
      <div className="relative -mt-3 ml-auto mr-1 w-[80%] rounded-3xl rounded-tr-md bg-mint px-4 py-3 text-left shadow-[0_10px_24px_-14px_rgba(51,36,43,0.5)]">
        <p className="text-[15px] leading-snug">{t.hero.previewQuote}</p>
        <p className="mt-1 text-[13px] font-bold text-teal-deep">{t.hero.previewQuoteAuthor}</p>
      </div>
    </div>
  );
}

function Tiles({ items, tone }: { items: readonly string[]; tone: "butter" | "mint" }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Chip tone={tone}>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  // Cijene i postavke dolaze iz baze kroz predmemorirane čitače, pa stranica ostaje statična.
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);

  const memorialPrice = products.memorial ? formatEuro(products.memorial.unitAmountCents) : null;
  const memorialBase = products.memorial ? formatEuro(products.memorial.baseAmountCents) : null;
  const gesturePrice = products.gesture_7d ? formatEuro(products.gesture_7d.unitAmountCents) : null;
  const donationAmount =
    settings.donationPerMemorialCents > 0 ? formatEuro(settings.donationPerMemorialCents) : null;

  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <section aria-labelledby="hero-title" className="overflow-hidden rounded-b-[40px] bg-butter">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 pb-10 pt-6 md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:pb-16 md:pt-10">
            <div className="flex min-w-0 flex-col items-start gap-5">
              <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              <h1 id="hero-title" className="font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl">
                {t.hero.title}
              </h1>
              <p className="max-w-md text-lg leading-relaxed sm:text-xl">{t.hero.promise}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href="/izradi" carry className="w-full sm:w-auto">
                  {t.hero.primaryCta}
                </ButtonLink>
                <ButtonLink href="/primjer" carry variant="light" className="w-full sm:w-auto">
                  {t.hero.secondaryCta}
                </ButtonLink>
              </div>
              <p className="text-[15px] text-plum-soft">{t.hero.note}</p>
            </div>
            <MemorialPreview />
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 pb-16 pt-12 sm:gap-20 sm:pt-16">
          <section aria-labelledby="vrste-title" className="flex flex-col gap-5">
            <h2 id="vrste-title" className={sectionTitle}>
              {t.species.title}
            </h2>
            <ExampleGrid pets={EXAMPLE_PETS} />
            <p className="text-sm text-plum-soft">{t.species.note}</p>
          </section>

          <section aria-labelledby="koraci-title" className="flex flex-col gap-5">
            <h2 id="koraci-title" className={sectionTitle}>
              {t.steps.title}
            </h2>
            <ol role="list" className="grid gap-3 md:grid-cols-3">
              {t.steps.items.map((step, index) => {
                const Icon = stepIcons[index];
                return (
                  <li key={step.title}>
                    <Card className="flex h-full items-start gap-4 sm:p-6">
                      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-sun text-plum">
                        <Icon size={26} />
                        <span
                          aria-hidden="true"
                          className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-plum text-xs font-bold text-white"
                        >
                          {index + 1}
                        </span>
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="font-display text-xl font-extrabold leading-tight">{step.title}</span>
                        <span className="leading-snug text-plum-soft">{step.body}</span>
                      </span>
                    </Card>
                  </li>
                );
              })}
            </ol>
            <p className="rounded-3xl bg-mint px-5 py-4 font-semibold leading-snug">{t.steps.paymentNote}</p>
          </section>

          <section aria-labelledby="paketi-title" className="flex flex-col gap-5">
            <h2 id="paketi-title" className={sectionTitle}>
              {t.plans.title}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-4 sm:p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-extrabold">{t.plans.free.name}</h3>
                  <span className="font-display text-3xl font-extrabold">{t.plans.free.price}</span>
                </div>
                <Tiles items={t.plans.free.tiles} tone="butter" />
                <p className="mt-auto text-[15px] text-plum-soft">{t.plans.free.note}</p>
              </Card>
              {memorialPrice ? (
                <Card className="flex flex-col gap-4 border-2 border-teal sm:p-7">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl font-extrabold">{t.plans.memorial.name}</h3>
                    <span className="flex flex-col items-end">
                      <span className="font-display text-3xl font-extrabold">{memorialPrice}</span>
                      <span className="text-[13px] text-plum-soft">{t.plans.memorial.priceNote}</span>
                      {memorialBase ? (
                        <span className="text-[13px] text-plum-soft">
                          {fill(common.price.base, { amount: memorialBase })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <Tiles items={t.plans.memorial.tiles} tone="mint" />
                  <p className="mt-auto text-[15px] text-plum-soft">{t.plans.memorial.note}</p>
                </Card>
              ) : null}
            </div>
            <ButtonLink href="/cjenik" carry variant="quiet" className="self-start">
              {t.plans.cta}
              <ArrowRightIcon size={18} />
            </ButtonLink>
          </section>

          <section aria-labelledby="livada-title" className="grid items-center gap-6 rounded-[40px] bg-mint p-6 sm:p-10 md:grid-cols-2">
            <div className="flex flex-col items-start gap-3">
              <Eyebrow>{t.meadow.eyebrow}</Eyebrow>
              <h2 id="livada-title" className={sectionTitle}>
                {t.meadow.title}
              </h2>
              <p className="text-lg leading-relaxed">{t.meadow.body}</p>
              <ButtonLink href="/livada" variant="secondary" size="md">
                {t.meadow.cta}
              </ButtonLink>
            </div>
            <div aria-hidden="true" className="flex items-end justify-center gap-3">
              {EXAMPLE_PETS.map((pet, index) => (
                <span key={pet.key} className="flex flex-col items-center gap-2">
                  <CandleIcon size={22} className="text-terracotta" />
                  <span
                    className={`overflow-hidden rounded-full shadow-[0_0_0_4px_var(--color-sun)] ${index % 2 === 0 ? "size-20" : "size-16"}`}
                  >
                    <PetArt pet={pet.key} decorative />
                  </span>
                </span>
              ))}
            </div>
          </section>

          <section aria-labelledby="geste-title" className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Eyebrow>{t.gestures.eyebrow}</Eyebrow>
              <h2 id="geste-title" className={sectionTitle}>
                {t.gestures.title}
              </h2>
            </div>
            <ul className="grid grid-cols-5 gap-2 sm:max-w-xl sm:gap-3">
              {gestureKinds.map(({ key, label, Icon }) => (
                <li key={key} className="flex flex-col items-center gap-2 rounded-3xl bg-white px-1 py-4 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-butter text-terracotta">
                    <Icon size={24} />
                  </span>
                  <span className="text-[13px] font-bold sm:text-sm">{label}</span>
                </li>
              ))}
            </ul>
            <p className="max-w-2xl text-lg leading-relaxed">
              {t.gestures.body}
              {gesturePrice ? ` ${fill(t.gestures.price, { price: gesturePrice })}` : null}
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="flex h-full flex-col items-start gap-2 sm:p-6">
              <Eyebrow>{t.gift.eyebrow}</Eyebrow>
              <h2 className="font-display text-2xl font-extrabold leading-tight">{t.gift.title}</h2>
              <p className="text-plum-soft">{t.gift.body}</p>
              <ButtonLink href="/poklon" carry variant="quiet" className="mt-auto">
                {t.gift.cta}
                <ArrowRightIcon size={18} />
              </ButtonLink>
            </Card>
            {donationAmount ? (
              <Card className="flex h-full flex-col items-start gap-2 sm:p-6">
                <Eyebrow>{t.donation.eyebrow}</Eyebrow>
                <h2 className="font-display text-2xl font-extrabold leading-tight">{t.donation.title}</h2>
                <p className="text-plum-soft">
                  {fill(t.donation.body, { amount: donationAmount })}{" "}
                  {settings.shelter
                    ? fill(t.donation.shelterSet, { shelter: settings.shelter.name })
                    : t.donation.shelterPending}
                </p>
                <ButtonLink href="/donacije" variant="quiet" className="mt-auto">
                  {t.donation.cta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
              </Card>
            ) : null}
            <Card className="flex h-full flex-col items-start gap-2 sm:p-6">
              <Eyebrow>{t.guide.eyebrow}</Eyebrow>
              <h2 className="font-display text-2xl font-extrabold leading-tight">{t.guide.title}</h2>
              <p className="text-plum-soft">{t.guide.body}</p>
              <span className="mt-auto flex gap-4">
                <ButtonLink href="/vodic" variant="quiet">
                  {t.guide.guideCta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
                <ButtonLink href="/alati" variant="quiet">
                  {t.guide.toolsCta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
              </span>
            </Card>
          </div>

          <section
            aria-labelledby="zavrsni-title"
            className="flex flex-col items-center gap-4 rounded-[40px] bg-butter px-6 py-12 text-center"
          >
            <PawTrail className="h-auto w-40 text-terracotta" />
            <h2 id="zavrsni-title" className={sectionTitle}>
              {t.closing.title}
            </h2>
            <p className="max-w-md text-lg leading-relaxed">{t.closing.body}</p>
            <ButtonLink href="/izradi" carry className="w-full sm:w-auto">
              {t.closing.cta}
            </ButtonLink>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
