import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { formatEuro, formatPetDate } from "@/lib/format";
import { fill } from "@/lib/text";
import { marketing } from "@/messages/hr/marketing";
import { getDonationSummary } from "@/server/catalog";

const t = marketing.donations;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/donacije" },
};

const sectionTitle = "font-display text-2xl font-extrabold leading-tight sm:text-3xl";
const textLink = "inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:text-teal-deep";

export default async function DonationsPage() {
  // Zbroj i isplate dolaze iz baze; azil se imenuje samo ako ga je vlasnik unio.
  const summary = await getDonationSummary();

  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <div className="rounded-b-[40px] bg-butter">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pb-10 pt-6 sm:pb-12 sm:pt-10">
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] sm:text-5xl">{t.title}</h1>
            <p className="text-lg leading-relaxed">
              {summary.perMemorialCents > 0
                ? fill(t.intro, { amount: formatEuro(summary.perMemorialCents) })
                : t.introNoAmount}
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 pb-16 pt-10">
          <section aria-labelledby="stanje-title" className="flex flex-col gap-4">
            <h2 id="stanje-title" className="sr-only">
              {t.totalsTitle}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Card className="flex flex-col gap-1 sm:p-6">
                <dt className="text-plum-soft">{t.accrued}</dt>
                <dd className="font-display text-4xl font-extrabold">{formatEuro(summary.accruedCents)}</dd>
              </Card>
              <Card className="flex flex-col gap-1 sm:p-6">
                <dt className="text-plum-soft">{t.paidOut}</dt>
                <dd className="font-display text-4xl font-extrabold">{formatEuro(summary.paidOutCents)}</dd>
              </Card>
            </dl>
          </section>

          <section aria-labelledby="azil-title" className="flex flex-col gap-3 rounded-3xl bg-mint p-5 sm:p-8">
            <h2 id="azil-title" className={sectionTitle}>
              {t.shelterTitle}
            </h2>
            {summary.shelter ? (
              <div className="flex flex-col items-start">
                <p className="text-lg leading-relaxed">{t.shelterSet}</p>
                {summary.shelter.url ? (
                  <a href={summary.shelter.url} rel="noopener noreferrer" className={`${textLink} text-lg`}>
                    {summary.shelter.name}
                  </a>
                ) : (
                  <p className="text-lg font-bold">{summary.shelter.name}</p>
                )}
              </div>
            ) : (
              <p className="text-lg leading-relaxed">{t.shelterPending}</p>
            )}
          </section>

          <section aria-labelledby="isplate-title" className="flex flex-col gap-4">
            <h2 id="isplate-title" className={sectionTitle}>
              {t.payoutsTitle}
            </h2>
            {summary.payouts.length === 0 ? (
              <p className="text-lg leading-relaxed text-plum-soft">{t.payoutsEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {summary.payouts.map((payout) => (
                  <li key={payout.id}>
                    <Card className="flex flex-col gap-1 sm:p-6">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-display text-2xl font-extrabold">
                          {formatEuro(payout.amountCents)}
                        </span>
                        <time dateTime={payout.paidOn} className="text-plum-soft">
                          {formatPetDate(payout.paidOn, "day")}
                        </time>
                      </p>
                      {payout.shelterName ? <p className="font-semibold">{payout.shelterName}</p> : null}
                      {payout.note ? (
                        <p className="leading-relaxed text-plum-soft [overflow-wrap:anywhere]">{payout.note}</p>
                      ) : null}
                      {payout.proofUrl ? (
                        <a href={payout.proofUrl} rel="noopener noreferrer" className={textLink}>
                          {t.proof}
                        </a>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="racun-title" className="flex flex-col gap-3">
            <h2 id="racun-title" className={sectionTitle}>
              {t.howTitle}
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-lg leading-relaxed">
              {t.how.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
