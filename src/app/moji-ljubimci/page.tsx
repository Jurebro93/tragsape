import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/prijava/actions";
import { PawIcon } from "@/components/icons";
import { FamilyForm } from "@/components/account/manage-forms";
import { AccountLink } from "@/components/owner/manage-links";
import { PageShell } from "@/components/site-chrome";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { photoUrl } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { account } from "@/messages/hr/account";
import { auth } from "@/messages/hr/auth";
import { livada } from "@/messages/hr/livada";
import { requireMember } from "@/server/auth";
import { listMyMemorials, listSharedMemorials } from "@/server/memorials/access";
import { createSessionClient } from "@/server/supabase/session";

export const metadata: Metadata = { title: account.title, robots: { index: false } };

const stepPaths = ["ljubimac", "prica", "pregled"];

async function MyMemorials() {
  const viewer = await requireMember("/moji-ljubimci");
  const [memorials, sharedMemorials] = await Promise.all([listMyMemorials(), listSharedMemorials()]);
  const supabase = await createSessionClient();
  const { data: family } = await supabase
    .from("families")
    .select("slug, title, intro, is_public")
    .eq("owner_id", viewer.id)
    .maybeSingle();
  const hasPublished = memorials.some((memorial) => memorial.status === "published");
  return (
    <div className="flex flex-col gap-5">
      {memorials.length === 0 ? (
        <Card className="flex flex-col gap-3 bg-butter">
          <h2 className="text-2xl font-extrabold">{account.empty.title}</h2>
          <p>{account.empty.body}</p>
          <ButtonLink href="/izradi">{account.empty.action}</ButtonLink>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {memorials.map((memorial) => {
            const isDraft = memorial.status === "draft";
            const href = isDraft
              ? `/izradi/${memorial.id}/${stepPaths[Math.min(memorial.draftStep, 3) - 1]}`
              : `/moji-ljubimci/${memorial.id}`;
            return (
              <li key={memorial.id}>
                <Card className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint text-teal">
                    {memorial.coverPhotoId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- vlastita ruta s provjerom pristupa
                      <img src={photoUrl(memorial.coverPhotoId, "thumb")} alt="" className="size-full object-cover" />
                    ) : (
                      <PawIcon size={30} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate font-display text-xl font-extrabold">
                      {memorial.name || account.untitled}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <Chip tone={isDraft ? "butter" : "mint"} className="px-2.5 py-0.5 text-[13px]">
                        {account.status[memorial.status]}
                      </Chip>
                      <Chip tone="butter" className="px-2.5 py-0.5 text-[13px]">
                        {account.tier[memorial.tier]}
                      </Chip>
                    </span>
                  </span>
                  <Link href={href as Route} className="flex min-h-11 shrink-0 items-center font-bold">
                    {isDraft ? account.continueDraft : account.manage}
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {memorials.length > 0 ? (
        <ButtonLink href="/izradi" variant="secondary">
          {account.newMemorial}
        </ButtonLink>
      ) : null}
      {sharedMemorials.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold">{account.shared.title}</h2>
            <p className="text-[15px] text-plum-soft">{account.shared.intro}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {sharedMemorials.map((memorial) => (
              <li key={memorial.id}>
                <Card className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint text-teal">
                    {memorial.coverPhotoId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- vlastita ruta s provjerom pristupa
                      <img src={photoUrl(memorial.coverPhotoId, "thumb")} alt="" className="size-full object-cover" />
                    ) : (
                      <PawIcon size={30} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate font-display text-xl font-extrabold">{memorial.name || account.untitled}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Chip tone="mint" className="px-2.5 py-0.5 text-[13px]">
                        {account.shared.chip}
                      </Chip>
                    </span>
                  </span>
                  <Link href={`/moji-ljubimci/${memorial.id}` as Route} className="flex min-h-11 shrink-0 items-center font-bold">
                    {account.shared.open}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hasPublished || family ? (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold">{livada.family.manage.title}</h2>
            <p className="text-plum-soft">{livada.family.manage.body}</p>
          </div>
          <FamilyForm
            family={
              family
                ? { slug: family.slug, title: family.title, intro: family.intro, isPublic: family.is_public }
                : null
            }
          />
          {family?.is_public ? (
            <ButtonLink href={`/obitelj/${family.slug}` as Route} variant="quiet" className="self-start">
              {livada.family.manage.open}
            </ButtonLink>
          ) : null}
        </Card>
      ) : null}
      <AccountLink />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-plum-soft">
        <span>{fill(account.signedInAs, { email: viewer.email ?? "" })}</span>
        <form action={signOutAction}>
          <Button type="submit" variant="quiet">
            {auth.signOut}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MyPetsPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">{account.title}</h1>
        <Suspense fallback={<Card className="min-h-40" />}>
          <MyMemorials />
        </Suspense>
      </div>
    </PageShell>
  );
}
