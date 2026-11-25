/* eslint-disable @next/next/no-img-element -- QR kod je SVG stvoren na poslužitelju, ugrađen kao data-adresa */
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PawIcon } from "@/components/icons";
import { PrintButton, PrintStyles } from "@/components/owner/print-button";
import { formatLifespan } from "@/lib/format";
import { account } from "@/messages/hr/account";
import { common } from "@/messages/hr/common";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { qrSvg, resolveQrTarget, svgDataUri } from "@/server/owner/qr";

const t = owner.qr.print;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

/** Na papiru ostaje samo list s kodom: sve izvan njega (i obavijest o kolačićima) se skriva. */
const PRINT_CSS = `
@page { margin: 18mm; }
@media print {
  body > :not(.qr-print-root) { display: none !important; }
  body { background: #fff !important; }
}
`;

async function PrintSheet({ params }: Pick<PageProps<"/moji-ljubimci/[id]/qr/ispis">, "params">) {
  const { id } = await params;
  const { memorial, paid } = await requireOwnerPage(id, `/moji-ljubimci/${id}/qr/ispis`);
  const target = paid ? await resolveQrTarget(memorial) : null;
  if (!target) {
    notFound();
  }
  const image = svgDataUri(await qrSvg(target.url));
  const lifespan = formatLifespan(
    { date: memorial.birthDate, precision: memorial.birthPrecision },
    { date: memorial.deathDate, precision: memorial.deathPrecision },
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/moji-ljubimci/${id}/qr` as Route} className="flex min-h-11 items-center text-[15px] font-semibold">
          ← {t.back}
        </Link>
        <PrintButton label={t.action} />
      </div>
      <article className="flex flex-col items-center gap-5 rounded-3xl bg-white px-6 py-10 text-center print:rounded-none print:p-0">
        <h1 className="text-5xl font-extrabold leading-none [overflow-wrap:anywhere]">
          {memorial.name || account.untitled}
        </h1>
        {lifespan ? <p className="text-lg font-medium">{lifespan}</p> : null}
        <img
          src={image}
          alt={owner.qr.alt}
          width={320}
          height={320}
          className="w-full max-w-[320px] print:w-[80mm] print:max-w-none"
        />
        <p className="text-[15px]">{t.scan}</p>
        <p className="break-all text-[15px] font-semibold">{target.label}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-plum-soft">
          <PawIcon size={16} className="text-terracotta" />
          {common.brand}
        </p>
      </article>
    </>
  );
}

export default function QrPrintPage(props: PageProps<"/moji-ljubimci/[id]/qr/ispis">) {
  return (
    <main className="qr-print-root mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-5 pb-16 pt-4">
      <PrintStyles css={PRINT_CSS} />
      <Suspense fallback={<div className="min-h-96 rounded-3xl bg-white" />}>
        <PrintSheet params={props.params} />
      </Suspense>
    </main>
  );
}
