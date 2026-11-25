import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmDelete } from "@/components/owner/confirm-delete";
import { MEMBERS_MAX } from "@/components/owner/limits";
import { InviteForm, ResendInviteForm } from "@/components/owner/member-forms";
import { OwnerHeader, PaidNote } from "@/components/owner/page-parts";
import { PageShell } from "@/components/site-chrome";
import { Card, Chip } from "@/components/ui/card";
import { fill } from "@/lib/text";
import { owner } from "@/messages/hr/owner";
import { requireOwnerPage } from "@/server/owner/context";
import { createSessionClient } from "@/server/supabase/session";
import { inviteMemberAction, removeMemberAction } from "./actions";

const t = owner.members;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

async function Members({ params }: Pick<PageProps<"/moji-ljubimci/[id]/suradnici">, "params">) {
  const { id } = await params;
  const { memorial, paid, isOwner } = await requireOwnerPage(id, `/moji-ljubimci/${id}/suradnici`);
  const header = <OwnerHeader memorialId={id} petName={memorial.name} title={t.title} intro={t.intro} />;
  if (!isOwner) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <p>{t.ownerOnly}</p>
        </Card>
      </div>
    );
  }
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("memorial_members")
    .select("invited_email, accepted_at, created_at")
    .eq("memorial_id", id)
    .order("created_at", { ascending: true });
  const members = data ?? [];
  const invite = inviteMemberAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      {header}
      <Card className="flex flex-col gap-2 bg-mint">
        <p className="text-[15px]">{t.can}</p>
        <p className="text-[15px]">{t.cannot}</p>
      </Card>
      {paid ? (
        <Card>
          <InviteForm action={invite} />
        </Card>
      ) : (
        <PaidNote memorialId={id}>{owner.paidNote.members}</PaidNote>
      )}
      {paid || members.length > 0 ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-extrabold">{t.listTitle}</h2>
            <span className="text-sm text-plum-soft">{fill(t.count, { n: members.length, max: MEMBERS_MAX })}</span>
          </div>
          {members.length === 0 ? (
            <p className="text-plum-soft">{t.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {members.map((member) => (
                <li key={member.invited_email} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold [overflow-wrap:anywhere]">{member.invited_email}</span>
                    <Chip tone={member.accepted_at ? "mint" : "butter"} className="px-2.5 py-0.5 text-[13px]">
                      {member.accepted_at ? t.status.accepted : t.status.pending}
                    </Chip>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    {paid && !member.accepted_at ? (
                      <ResendInviteForm action={invite} email={member.invited_email} />
                    ) : null}
                    <ConfirmDelete
                      action={removeMemberAction.bind(null, id, member.invited_email)}
                      question={fill(t.removeConfirm, { email: member.invited_email })}
                      label={t.remove}
                      yes={t.removeYes}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

export default function MembersPage(props: PageProps<"/moji-ljubimci/[id]/suradnici">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Members params={props.params} />
      </Suspense>
    </PageShell>
  );
}
