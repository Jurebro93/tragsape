import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Card, Chip } from "@/components/ui/card";
import type { Tier } from "@/lib/memorial";
import { owner } from "@/messages/hr/owner";

const t = owner.links;

function LinkRow({ href, label, body, chip }: { href: string; label: string; body: string; chip?: string }) {
  return (
    <Link
      href={href as Route}
      className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-line px-4 py-3 text-plum no-underline hover:bg-butter"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{label}</span>
          {chip ? (
            <Chip tone="butter" className="px-2.5! py-0.5! text-[13px]!">
              {chip}
            </Chip>
          ) : null}
        </span>
        <span className="text-sm text-plum-soft">{body}</span>
      </span>
      <ArrowRightIcon className="shrink-0 text-teal" />
    </Link>
  );
}

/**
 * Poveznice na stranice uz jedan spomen: pisma, vremenska crta, suradnici, QR kod i podsjetnici.
 * Na besplatnom spomenu poveznice ostaju, uz oznaku da dolaze s Memorijalom. Suradnici se
 * prikazuju samo vlasniku (`isOwner`, zadano da).
 */
export function ManageLinks({
  memorialId,
  tier,
  isOwner = true,
}: {
  memorialId: string;
  tier: Tier;
  isOwner?: boolean;
}) {
  const base = `/moji-ljubimci/${memorialId}`;
  const chip = tier === "free" ? t.paidChip : undefined;
  const items = [
    { href: `${base}/pisma`, ...t.letters },
    { href: `${base}/vremenska-crta`, ...t.timeline },
    ...(isOwner ? [{ href: `${base}/suradnici`, ...t.members }] : []),
    { href: `${base}/qr`, ...t.qr },
    { href: `${base}/podsjetnici`, ...t.reminders },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-2xl font-extrabold">{t.title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <LinkRow href={item.href} label={item.label} body={item.body} chip={chip} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Poveznica na račun (izvoz i brisanje podataka), za popis „Moji ljubimci". */
export function AccountLink() {
  return <LinkRow href="/moji-ljubimci/racun" label={t.account.label} body={t.account.body} />;
}
