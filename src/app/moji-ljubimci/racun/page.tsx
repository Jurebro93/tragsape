import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteAccountForm } from "@/components/owner/account-forms";
import { PageShell } from "@/components/site-chrome";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { owner } from "@/messages/hr/owner";
import { requireMember } from "@/server/auth";
import { deleteAccountAction } from "./actions";

const t = owner.account;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

async function Account() {
  const viewer = await requireMember("/moji-ljubimci/racun");
  return (
    <>
      <Card className="flex flex-col gap-1">
        <span className="text-sm text-plum-soft">{t.email}</span>
        <span className="font-bold [overflow-wrap:anywhere]">{viewer.email}</span>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">{t.export.title}</h2>
        <p>{t.export.body}</p>
        <p className="text-sm text-plum-soft">{t.export.photos}</p>
        <a href="/moji-ljubimci/racun/izvoz" download className={buttonClass("secondary", "md")}>
          {t.export.action}
        </a>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">{t.delete.title}</h2>
        <p>{t.delete.body}</p>
        <p className="text-sm text-plum-soft">{t.delete.orders}</p>
        <DeleteAccountForm action={deleteAccountAction} />
      </Card>
    </>
  );
}

export default function AccountPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Link href="/moji-ljubimci" className="min-h-11 content-center text-[15px] font-semibold">
            ← {t.back}
          </Link>
          <h1 className="text-4xl font-extrabold">{t.title}</h1>
        </div>
        <Suspense fallback={<Card className="min-h-96" />}>
          <Account />
        </Suspense>
      </div>
    </PageShell>
  );
}
