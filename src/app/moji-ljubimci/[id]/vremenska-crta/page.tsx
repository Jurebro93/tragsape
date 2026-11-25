import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmDelete } from "@/components/owner/confirm-delete";
import { OwnerHeader, PaidNote } from "@/components/owner/page-parts";
import { TimelineForm } from "@/components/owner/timeline-form";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { formatPetDate, type DatePrecision } from "@/lib/format";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { deleteTimelineEventAction, saveTimelineEventAction } from "./actions";

const t = owner.timeline;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

async function Timeline({ params }: Pick<PageProps<"/moji-ljubimci/[id]/vremenska-crta">, "params">) {
  const { id } = await params;
  const base = `/moji-ljubimci/${id}/vremenska-crta`;
  const { memorial, paid } = await requireOwnerPage(id, base);
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("id, event_date, date_precision, title, body")
    .eq("memorial_id", id)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(200);
  const events = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <OwnerHeader memorialId={id} petName={memorial.name} title={t.title} intro={t.intro} />
      {paid ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">{t.add}</h2>
          <TimelineForm action={saveTimelineEventAction.bind(null, id, null)} />
        </Card>
      ) : (
        <>
          <PaidNote memorialId={id}>{owner.paidNote.timeline}</PaidNote>
          {events.length > 0 ? <p className="text-[15px] text-plum-soft">{t.freeExisting}</p> : null}
        </>
      )}
      {events.length === 0 ? (
        paid ? (
          <p className="text-plum-soft">{t.empty}</p>
        ) : null
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="flex flex-col gap-1.5">
                {event.event_date ? (
                  <span className="text-sm font-bold text-terracotta-deep">
                    {formatPetDate(event.event_date, event.date_precision as DatePrecision)}
                  </span>
                ) : null}
                <h2 className="font-sans text-[17px] font-bold tracking-normal [overflow-wrap:anywhere]">{event.title}</h2>
                {event.body ? (
                  <p className="whitespace-pre-line text-[15px] [overflow-wrap:anywhere]">{event.body}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  {paid ? (
                    <Link href={`${base}/${event.id}` as Route} className="flex min-h-11 items-center font-bold">
                      {t.edit}
                    </Link>
                  ) : null}
                  <ConfirmDelete
                    action={deleteTimelineEventAction.bind(null, id, event.id)}
                    question={t.deleteConfirm}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function TimelinePage(props: PageProps<"/moji-ljubimci/[id]/vremenska-crta">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Timeline params={props.params} />
      </Suspense>
    </PageShell>
  );
}
