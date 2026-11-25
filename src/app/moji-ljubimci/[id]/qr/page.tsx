/* eslint-disable @next/next/no-img-element -- QR kod je SVG stvoren na poslužitelju, ugrađen kao data-adresa */
import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";
import { OwnerHeader, PaidNote } from "@/components/owner/page-parts";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { qrSvg, resolveQrTarget, svgDataUri } from "@/server/owner/qr";

const t = owner.qr;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

async function Qr({ params }: Pick<PageProps<"/moji-ljubimci/[id]/qr">, "params">) {
  const { id } = await params;
  const base = `/moji-ljubimci/${id}/qr`;
  const { memorial, paid } = await requireOwnerPage(id, base);
  const header = <OwnerHeader memorialId={id} petName={memorial.name} title={t.title} intro={t.intro} />;
  if (!paid) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <PaidNote memorialId={id}>{owner.paidNote.qr}</PaidNote>
      </div>
    );
  }
  if (memorial.status !== "published") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card className="flex flex-col gap-3">
          <p>{t.notPublished}</p>
          {memorial.status === "draft" ? (
            <ButtonLink href={`/izradi/${id}/pregled` as Route} variant="secondary" size="md">
              {t.toPublish}
            </ButtonLink>
          ) : null}
        </Card>
      </div>
    );
  }
  const target = await resolveQrTarget(memorial);
  if (!target) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <p role="alert">{t.unavailable}</p>
        </Card>
      </div>
    );
  }
  const image = svgDataUri(await qrSvg(target.url));

  return (
    <div className="flex flex-col gap-5">
      {header}
      <Card className="flex flex-col items-center gap-4">
        <img src={image} alt={t.alt} width={280} height={280} className="w-full max-w-[280px] rounded-2xl border-2 border-line" />
        <div className="flex w-full flex-col gap-0.5 text-center">
          <span className="text-sm text-plum-soft">{t.address}</span>
          <span className="break-all text-[15px] font-semibold">{target.label}</span>
        </div>
      </Card>
      <Card className={target.visibility === "public" ? "flex flex-col gap-2" : "flex flex-col gap-2 bg-butter"}>
        <p className="text-[15px] font-medium">{t.notes[target.visibility]}</p>
        {target.visibility === "unlisted" ? <p className="text-[15px]">{t.notes.unlistedChange}</p> : null}
        <p className="text-[15px] text-plum-soft">{t.notes.republish}</p>
      </Card>
      <Card className="flex flex-col gap-3">
        <a href={`${base}/preuzmi/svg`} download className={buttonClass("primary", "md")}>
          {t.downloadSvg}
        </a>
        <a href={`${base}/preuzmi/png`} download className={buttonClass("secondary", "md")}>
          {t.downloadPng}
        </a>
        <p className="text-sm text-plum-soft">{t.formats}</p>
        <ButtonLink href={`${base}/ispis` as Route} variant="secondary" size="md">
          {t.openPrint}
        </ButtonLink>
      </Card>
    </div>
  );
}

export default function QrPage(props: PageProps<"/moji-ljubimci/[id]/qr">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Qr params={props.params} />
      </Suspense>
    </PageShell>
  );
}
