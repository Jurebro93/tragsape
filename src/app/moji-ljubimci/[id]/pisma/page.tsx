import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmDelete } from "@/components/owner/confirm-delete";
import { OwnerHeader, PaidNote } from "@/components/owner/page-parts";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatPetDate } from "@/lib/format";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { deleteLetterAction, removeSharedLetterAction } from "./actions";

const t = owner.letters;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

async function Letters({ params }: Pick<PageProps<"/moji-ljubimci/[id]/pisma">, "params">) {
  const { id } = await params;
  const base = `/moji-ljubimci/${id}/pisma`;
  const { viewer, memorial, paid, isOwner } = await requireOwnerPage(id, base);
  const supabase = await createSessionClient();
  // Samo vlastita pisma: tuđa privatna RLS ionako ne vraća, a tuđa javna stoje na stranici spomena.
  const { data } = await supabase
    .from("letters")
    .select("id, written_on, title, body, visibility")
    .eq("memorial_id", id)
    .eq("author_id", viewer.id)
    .order("written_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  const letters = data ?? [];
  // Javna pisma suradnika vlasnik smije ukloniti sa svog spomena; njihova privatna ne vidi.
  const { data: sharedData } = isOwner
    ? await supabase
        .from("letters")
        .select("id, written_on, title, body")
        .eq("memorial_id", id)
        .eq("visibility", "public")
        .neq("author_id", viewer.id)
        .order("written_on", { ascending: false })
        .limit(200)
    : { data: [] };
  const shared = sharedData ?? [];

  return (
    <div className="flex flex-col gap-5">
      <OwnerHeader memorialId={id} petName={memorial.name} title={t.title} intro={t.intro} />
      {paid ? (
        <>
          <ButtonLink href={`${base}/novo` as Route}>{t.add}</ButtonLink>
          <Card className="flex flex-col gap-2 bg-mint">
            <h2 className="font-sans text-[15px] font-bold tracking-normal">{t.who.title}</h2>
            <p className="text-[15px]">{t.who.private}</p>
            <p className="text-[15px]">{t.who.public}</p>
          </Card>
        </>
      ) : (
        <>
          <PaidNote memorialId={id}>{owner.paidNote.letters}</PaidNote>
          {letters.length > 0 ? <p className="text-[15px] text-plum-soft">{t.freeExisting}</p> : null}
        </>
      )}
      {letters.length === 0 ? (
        paid ? (
          <p className="text-plum-soft">{t.empty}</p>
        ) : null
      ) : (
        <ul className="flex flex-col gap-3">
          {letters.map((letter) => (
            <li key={letter.id}>
              <Card className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-terracotta-deep">{formatPetDate(letter.written_on)}</span>
                  <Chip tone={letter.visibility === "public" ? "mint" : "butter"} className="px-2.5! py-0.5! text-[13px]!">
                    {letter.visibility === "public" ? t.chip.public : t.chip.private}
                  </Chip>
                </div>
                <h2 className="text-xl font-extrabold [overflow-wrap:anywhere]">{letter.title ?? t.untitled}</h2>
                <p className={cn("whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]", paid && "line-clamp-6")}>
                  {letter.body}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  {paid ? (
                    <Link href={`${base}/${letter.id}` as Route} className="flex min-h-11 items-center font-bold">
                      {t.edit}
                    </Link>
                  ) : null}
                  <ConfirmDelete action={deleteLetterAction.bind(null, id, letter.id)} question={t.deleteConfirm} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {shared.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold">{t.shared.title}</h2>
            <p className="text-[15px] text-plum-soft">{t.shared.intro}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {shared.map((letter) => (
              <li key={letter.id}>
                <Card className="flex flex-col gap-2.5">
                  <span className="text-sm font-bold text-terracotta-deep">{formatPetDate(letter.written_on)}</span>
                  <h3 className="text-xl font-extrabold [overflow-wrap:anywhere]">{letter.title ?? t.untitled}</h3>
                  <p className="line-clamp-6 whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]">{letter.body}</p>
                  <ConfirmDelete
                    action={removeSharedLetterAction.bind(null, id, letter.id)}
                    question={t.shared.confirm}
                    label={t.shared.remove}
                  />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function LettersPage(props: PageProps<"/moji-ljubimci/[id]/pisma">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Letters params={props.params} />
      </Suspense>
    </PageShell>
  );
}
