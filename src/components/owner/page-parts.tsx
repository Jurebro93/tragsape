import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { account } from "@/messages/hr/account";
import { owner } from "@/messages/hr/owner";

/** Zaglavlje stranice uz jedan spomen: put natrag, ime ljubimca i naslov. */
export function OwnerHeader({
  memorialId,
  petName,
  title,
  intro,
  back,
}: {
  memorialId: string;
  petName: string;
  title: string;
  intro?: string;
  /** Zadano vodi na upravljanje spomenom; podstranice vode na svoj popis. */
  back?: { href: string; label: string };
}) {
  const target = back ?? { href: `/moji-ljubimci/${memorialId}`, label: owner.back };
  return (
    <div className="flex flex-col gap-2">
      <Link href={target.href as Route} className="min-h-11 content-center text-[15px] font-semibold">
        ← {target.label}
      </Link>
      <p className="text-[15px] font-semibold text-plum-soft [overflow-wrap:anywhere]">{petName || account.untitled}</p>
      <h1 className="text-4xl font-extrabold">{title}</h1>
      {intro ? <p className="text-plum-soft">{intro}</p> : null}
    </div>
  );
}

/** Mirna napomena na besplatnom spomenu: što dolazi s Memorijalom i gdje ga pogledati. */
export function PaidNote({ memorialId, children }: { memorialId: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 bg-butter">
      <p className="font-medium">{children}</p>
      <ButtonLink href={`/izradi/${memorialId}/pregled` as Route} variant="secondary" size="md">
        {owner.paidNote.action}
      </ButtonLink>
    </Card>
  );
}
