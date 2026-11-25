import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { marketing } from "@/messages/hr/marketing";
import { getProducts, getSettings, type ProductKey } from "@/server/catalog";

const t = marketing.pricing;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/cjenik" },
};

const gestureKeys = ["gesture_7d", "gesture_30d", "gesture_365d"] as const satisfies readonly ProductKey[];

const sectionTitle = "font-display text-2xl font-extrabold leading-tight sm:text-3xl";

function Tier({
  name,
  price,
  priceNote,
  lead,
  features,
  note,
  cta,
  ctaVariant,
}: {
  name: string;
  price: string;
  priceNote: string;
  lead: string;
  features: readonly string[];
  note: string;
  cta: string;
  ctaVariant: "primary" | "secondary";
}) {
  return (
    <Card className="flex h-full flex-col gap-5 sm:p-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl font-extrabold leading-tight">{name}</h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-4xl font-extrabold">{price}</span>
          <span className="text-[15px] text-plum-soft">{priceNote}</span>
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="font-semibold">{lead}</p>
        <ul className="flex flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 leading-snug">
              <CheckIcon size={20} className="mt-0.5 shrink-0 text-teal" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-1">
        <p className="text-[15px] text-plum-soft">{note}</p>
        <ButtonLink href="/izradi" carry variant={ctaVariant} className="w-full">
          {cta}
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function PricingPage() {
  // Cijene, popust i iznos donacije žive u bazi; ovdje se samo prikazuju.
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);

  const gestures = gestureKeys.flatMap((key) => {
    const product = products[key];
    return product ? [{ key, label: t.gestures.durations[key], price: formatEuro(product.unitAmountCents) }] : [];
  });
  const donationAmount =
    settings.donationPerMemorialCents > 0 ? formatEuro(settings.donationPerMemorialCents) : null;

  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <div className="rounded-b-[40px] bg-butter">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 pb-10 pt-6 sm:pb-12 sm:pt-10">
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] sm:text-5xl">{t.title}</h1>
            <p className="max-w-xl text-lg leading-relaxed">{t.intro}</p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-5 pb-16 pt-10">
          <section aria-labelledby="paketi-title" className="flex flex-col gap-4">
            <h2 id="paketi-title" className="sr-only">
              {t.tiersTitle}
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <Tier
                name={t.tiers.free.name}
                price={formatEuro(0)}
                priceNote={t.tiers.free.priceNote}
                lead={t.tiers.free.lead}
                features={t.tiers.free.features}
                note={t.tiers.free.note}
                cta={t.tiers.free.cta}
                ctaVariant="primary"
              />
              {products.memorial ? (
                <Tier
                  name={t.tiers.memorial.name}
                  price={formatEuro(products.memorial.unitAmountCents)}
                  priceNote={t.oneOff}
                  lead={t.tiers.memorial.lead}
                  features={t.tiers.memorial.features}
                  note={t.payAfterPreview}
                  cta={t.tiers.memorial.cta}
                  ctaVariant="secondary"
                />
              ) : null}
              {products.memorial_portrait ? (
                <Tier
                  name={t.tiers.portrait.name}
                  price={formatEuro(products.memorial_portrait.unitAmountCents)}
                  priceNote={t.oneOff}
                  lead={t.tiers.portrait.lead}
                  features={t.tiers.portrait.features}
                  note={t.payAfterPreview}
                  cta={t.tiers.portrait.cta}
                  ctaVariant="secondary"
                />
              ) : null}
            </div>
            <p className="text-[15px] text-plum-soft">{t.rollout}</p>
          </section>

          <section aria-labelledby="geste-title" className="flex flex-col gap-4">
            <h2 id="geste-title" className={sectionTitle}>
              {t.gestures.title}
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed">{t.gestures.body}</p>
            {gestures.length > 0 ? (
              <dl className="grid grid-cols-3 gap-3 sm:max-w-xl">
                {gestures.map((gesture) => (
                  <div key={gesture.key} className="flex flex-col gap-1 rounded-3xl bg-white p-4">
                    <dt className="text-[15px] leading-snug text-plum-soft">{gesture.label}</dt>
                    <dd className="font-display text-xl font-extrabold sm:text-2xl">{gesture.price}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="max-w-2xl leading-relaxed text-plum-soft">{t.gestures.freeCandle}</p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby="poklon-title">
              <Card className="flex h-full flex-col items-start gap-3 sm:p-6">
                <h2 id="poklon-title" className={sectionTitle}>
                  {t.gift.title}
                </h2>
                <p className="leading-relaxed text-plum-soft">{t.gift.body}</p>
                <ButtonLink href="/poklon" carry variant="quiet" className="mt-auto">
                  {t.gift.cta}
                  <ArrowRightIcon size={18} />
                </ButtonLink>
              </Card>
            </section>

            {settings.repeatDiscountPct > 0 ? (
              <section aria-labelledby="popust-title">
                <Card className="flex h-full flex-col items-start gap-3 sm:p-6">
                  <h2 id="popust-title" className={sectionTitle}>
                    {t.repeat.title}
                  </h2>
                  <p className="leading-relaxed text-plum-soft">
                    {fill(t.repeat.body, { pct: settings.repeatDiscountPct })}
                  </p>
                </Card>
              </section>
            ) : null}
          </div>

          {donationAmount ? (
            <section
              aria-labelledby="donacija-title"
              className="flex flex-col items-start gap-3 rounded-3xl bg-mint p-5 sm:p-8"
            >
              <h2 id="donacija-title" className={sectionTitle}>
                {t.donation.title}
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed">
                {fill(t.donation.body, { amount: donationAmount })}{" "}
                {settings.shelter
                  ? fill(t.donation.shelterSet, { shelter: settings.shelter.name })
                  : t.donation.shelterPending}
              </p>
              <ButtonLink href="/donacije" variant="quiet">
                {t.donation.cta}
                <ArrowRightIcon size={18} />
              </ButtonLink>
            </section>
          ) : null}

          <section aria-labelledby="pitanja-title" className="flex flex-col gap-4">
            <h2 id="pitanja-title" className={sectionTitle}>
              {t.faq.title}
            </h2>
            <div className="flex flex-col gap-3">
              {t.faq.items.map((item) => (
                <Card key={item.question} className="flex flex-col items-start gap-2 sm:p-6">
                  <h3 className="font-display text-xl font-extrabold leading-snug">{item.question}</h3>
                  <p className="leading-relaxed text-plum-soft">{item.answer}</p>
                  {item.link ? (
                    <Link
                      href={item.link.href}
                      className="inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:text-teal-deep"
                    >
                      {item.link.label}
                    </Link>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
