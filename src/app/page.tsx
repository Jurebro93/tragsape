import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BallIcon,
  CandleIcon,
  CheckIcon,
  FlowerIcon,
  PawIcon,
  PawTrail,
  TreatIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card, Chip, Eyebrow } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
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

const sectionTitle = "font-display text-3xl font-extrabold leading-tight sm:text-4xl";

function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[17px] leading-snug">
          <CheckIcon size={22} className="mt-0.5 shrink-0 text-teal" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  // Cijene i postavke dolaze iz baze kroz predmemorirane čitače, pa stranica ostaje statična.
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);

  const memorialPrice = products.memorial ? formatEuro(products.memorial.unitAmountCents) : null;
  const gesturePrice = products.gesture_7d ? formatEuro(products.gesture_7d.unitAmountCents) : null;
  const donationAmount =
    settings.donationPerMemorialCents > 0 ? formatEuro(settings.donationPerMemorialCents) : null;

  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <section aria-labelledby="hero-title" className="rounded-b-[40px] bg-butter">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-10 px-5 pb-12 pt-6 sm:pb-16 sm:pt-10">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
              <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              <h1
                id="hero-title"
                className="font-display text-[2.5rem] font-extrabold leading-[1.05] sm:text-6xl"
              >
                {t.hero.title}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed sm:text-xl">{t.hero.promise}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href="/izradi" className="w-full sm:w-auto">
                  {t.hero.primaryCta}
                </ButtonLink>
                <ButtonLink href="/primjer" variant="light" className="w-full sm:w-auto">
                  {t.hero.secondaryCta}
                </ButtonLink>
              </div>
              <p className="text-[15px] text-plum-soft">{t.hero.note}</p>
            </div>
            <div aria-hidden="true" className="hidden shrink-0 md:block">
              <div className="flex size-56 items-center justify-center rounded-full bg-sun">
                <div className="flex size-36 items-center justify-center rounded-full bg-white">
                  <PawIcon size={72} className="text-terracotta" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 pb-16 pt-12 sm:gap-20 sm:pt-16">
          <section aria-labelledby="koraci-title" className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 id="koraci-title" className={sectionTitle}>
                {t.steps.title}
              </h2>
              <p className="text-lg text-plum-soft">{t.steps.intro}</p>
            </div>
            <ol role="list" className="grid gap-4 md:grid-cols-3">
              {t.steps.items.map((step, index) => (
                <li key={step.title}>
                  <Card className="flex h-full flex-col gap-3 sm:p-6">
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-full bg-sun font-display text-xl font-extrabold"
                    >
                      {index + 1}
                    </span>
                    <h3 className="font-display text-xl font-extrabold">{step.title}</h3>
                    <p className="leading-relaxed text-plum-soft">{step.body}</p>
                  </Card>
                </li>
              ))}
            </ol>
            <p className="rounded-3xl bg-mint px-5 py-4 text-[17px] font-semibold leading-snug">
              {t.steps.paymentNote}
            </p>
          </section>

          <section aria-labelledby="besplatno-title" className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
            <div className="flex flex-col gap-3">
              <Eyebrow>{t.free.eyebrow}</Eyebrow>
              <h2 id="besplatno-title" className={sectionTitle}>
                {t.free.title}
              </h2>
              <p className="text-lg text-plum-soft">{t.free.note}</p>
            </div>
            <Card className="sm:p-6">
              <CheckList items={t.free.items} />
            </Card>
          </section>

          <section aria-labelledby="memorijal-title">
            <Card className="grid gap-6 sm:p-8 md:grid-cols-2 md:gap-10">
              <div className="flex flex-col items-start gap-3">
                <Eyebrow>{t.memorial.eyebrow}</Eyebrow>
                <h2 id="memorijal-title" className={sectionTitle}>
                  {t.memorial.title}
                </h2>
                <p className="text-lg text-plum-soft">{t.memorial.body}</p>
                {memorialPrice ? (
                  <p className="text-lg font-semibold">{fill(t.memorial.price, { price: memorialPrice })}</p>
                ) : null}
                <ButtonLink href="/cjenik" variant="quiet">
                  {t.memorial.cta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
              </div>
              <CheckList items={t.memorial.items} />
            </Card>
          </section>

          <section aria-labelledby="geste-title" className="flex flex-col gap-4">
            <Eyebrow>{t.gestures.eyebrow}</Eyebrow>
            <h2 id="geste-title" className={sectionTitle}>
              {t.gestures.title}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {gestureKinds.map(({ key, label, Icon }) => (
                <li key={key}>
                  <Chip tone="mint" className="gap-2">
                    <Icon size={18} className="text-teal-deep" />
                    {label}
                  </Chip>
                </li>
              ))}
            </ul>
            <div className="flex max-w-2xl flex-col gap-3 text-lg leading-relaxed">
              <p>{t.gestures.candle}</p>
              <p>
                {t.gestures.paid}
                {gesturePrice ? ` ${fill(t.gestures.price, { price: gesturePrice })}` : null}
              </p>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby="poklon-title">
              <Card className="flex h-full flex-col items-start gap-3 sm:p-8">
                <Eyebrow>{t.gift.eyebrow}</Eyebrow>
                <h2 id="poklon-title" className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                  {t.gift.title}
                </h2>
                <p className="text-lg leading-relaxed text-plum-soft">{t.gift.body}</p>
                <ButtonLink href="/poklon" variant="quiet" className="mt-auto">
                  {t.gift.cta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
              </Card>
            </section>

            {donationAmount ? (
              <section aria-labelledby="donacija-title">
                <div className="flex h-full flex-col items-start gap-3 rounded-3xl bg-mint p-5 sm:p-8">
                  <Eyebrow>{t.donation.eyebrow}</Eyebrow>
                  <h2
                    id="donacija-title"
                    className="font-display text-2xl font-extrabold leading-tight sm:text-3xl"
                  >
                    {t.donation.title}
                  </h2>
                  <p className="text-lg leading-relaxed">
                    {fill(t.donation.body, { amount: donationAmount })}{" "}
                    {settings.shelter
                      ? fill(t.donation.shelterSet, { shelter: settings.shelter.name })
                      : t.donation.shelterPending}
                  </p>
                  <ButtonLink href="/donacije" variant="quiet" className="mt-auto">
                    {t.donation.cta}
                    <ArrowRightIcon size={18} />
                  </ButtonLink>
                </div>
              </section>
            ) : null}
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
            <ButtonLink href="/izradi" className="w-full sm:w-auto">
              {t.closing.cta}
            </ButtonLink>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
