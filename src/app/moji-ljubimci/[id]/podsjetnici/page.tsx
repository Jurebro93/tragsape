import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { OwnerHeader, PaidNote } from "@/components/owner/page-parts";
import {
  AdoptionDateForm,
  EnableRemindersForm,
  ReminderPrefsForm,
  type ReminderOption,
} from "@/components/owner/reminder-forms";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/text";
import { toDateParts } from "@/lib/validation";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { enableRemindersAction, saveAdoptionDateAction, saveRemindersAction } from "./actions";

const t = owner.reminders;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

const dayAndMonth = new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "long", timeZone: "UTC" });

/** „14. ožujka" iz datuma u bazi; e-mail stiže svake godine na taj dan. */
function yearlyDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dayAndMonth.format(new Date(Date.UTC(year, month - 1, day)));
}

/** Napomena uz prekidač: kada stiže e-mail ili koji datum još treba upisati. */
function note(date: string | null, exact: boolean, missing: ReactNode): ReactNode {
  if (!date || !exact) {
    return missing;
  }
  const when = fill(t.when, { date: yearlyDay(date) });
  return date.endsWith("-02-29") ? `${when} ${t.leap}` : when;
}

async function Reminders({ params }: Pick<PageProps<"/moji-ljubimci/[id]/podsjetnici">, "params">) {
  const { id } = await params;
  const { viewer, memorial, paid } = await requireOwnerPage(id, `/moji-ljubimci/${id}/podsjetnici`);
  const header = <OwnerHeader memorialId={id} petName={memorial.name} title={t.title} intro={t.intro} />;
  if (!paid) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <PaidNote memorialId={id}>{owner.paidNote.reminders}</PaidNote>
      </div>
    );
  }
  const supabase = await createSessionClient();
  const { data: prefs } = await supabase
    .from("reminder_prefs")
    .select("birthday, adoption, anniversary")
    .eq("memorial_id", id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  const missingPetDate = (
    <>
      {t.missing}{" "}
      <Link href={`/izradi/${id}/ljubimac` as Route} className="font-semibold">
        {t.missingPetLink}
      </Link>
      .
    </>
  );
  const options: ReminderOption[] = [
    {
      kind: "birthday",
      enabled: prefs?.birthday ?? false,
      note: note(memorial.birthDate, memorial.birthPrecision === "day", missingPetDate),
    },
    {
      kind: "adoption",
      enabled: prefs?.adoption ?? false,
      note: note(memorial.adoptionDate, true, `${t.missing} ${t.missingAdoption}`),
    },
    {
      kind: "anniversary",
      enabled: prefs?.anniversary ?? false,
      note: note(memorial.deathDate, memorial.deathPrecision === "day", missingPetDate),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {header}
      {memorial.status !== "published" ? (
        <p className="rounded-2xl bg-butter px-4 py-3 text-[15px] font-medium">{t.notPublished}</p>
      ) : null}
      {prefs ? (
        <Card className="flex flex-col gap-4">
          <ReminderPrefsForm action={saveRemindersAction.bind(null, id)} options={options} />
          <p className="text-sm text-plum-soft">{t.off}</p>
          <p className="text-sm text-plum-soft">{t.own}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">{t.optIn.title}</h2>
          <p>{t.optIn.body}</p>
          <ul className="flex flex-col gap-2">
            {options.map((option) => (
              <li key={option.kind} className="flex flex-col rounded-2xl border-2 border-line p-3.5">
                <span className="font-bold">{t.kinds[option.kind]}</span>
                <span className="text-sm text-plum-soft">{option.note}</span>
              </li>
            ))}
          </ul>
          <EnableRemindersForm action={enableRemindersAction.bind(null, id)} />
          <p className="text-sm text-plum-soft">{t.own}</p>
        </Card>
      )}
      <Card>
        <AdoptionDateForm
          action={saveAdoptionDateAction.bind(null, id)}
          initial={toDateParts(memorial.adoptionDate, "day")}
        />
      </Card>
    </div>
  );
}

export default function RemindersPage(props: PageProps<"/moji-ljubimci/[id]/podsjetnici">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Reminders params={props.params} />
      </Suspense>
    </PageShell>
  );
}
