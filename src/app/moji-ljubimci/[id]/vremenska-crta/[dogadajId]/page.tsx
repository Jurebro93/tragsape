import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/owner/page-parts";
import { TimelineForm } from "@/components/owner/timeline-form";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import type { DatePrecision } from "@/lib/format";
import { toDateParts } from "@/lib/validation";
import { owner } from "@/messages/hr/owner";
import { isUuid, requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { saveTimelineEventAction } from "../actions";

const t = owner.timeline;

export const metadata: Metadata = { title: t.editTitle, robots: { index: false } };

async function EditEvent({ params }: Pick<PageProps<"/moji-ljubimci/[id]/vremenska-crta/[dogadajId]">, "params">) {
  const { id, dogadajId } = await params;
  const list = `/moji-ljubimci/${id}/vremenska-crta`;
  const { memorial, paid } = await requireOwnerPage(id, `${list}/${dogadajId}`);
  if (!isUuid(dogadajId)) {
    notFound();
  }
  if (!paid) {
    redirect(list);
  }
  const supabase = await createSessionClient();
  const { data: event } = await supabase
    .from("timeline_events")
    .select("id, event_date, date_precision, title, body")
    .eq("id", dogadajId)
    .eq("memorial_id", id)
    .maybeSingle();
  if (!event) {
    notFound();
  }
  return (
    <div className="flex flex-col gap-5">
      <OwnerHeader
        memorialId={id}
        petName={memorial.name}
        title={t.editTitle}
        back={{ href: list, label: t.backToList }}
      />
      <Card>
        <TimelineForm
          action={saveTimelineEventAction.bind(null, id, event.id)}
          initial={{
            ...toDateParts(event.event_date, event.date_precision as DatePrecision),
            title: event.title,
            body: event.body ?? "",
          }}
          cancelHref={list}
        />
      </Card>
    </div>
  );
}

export default function EditEventPage(props: PageProps<"/moji-ljubimci/[id]/vremenska-crta/[dogadajId]">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <EditEvent params={props.params} />
      </Suspense>
    </PageShell>
  );
}
