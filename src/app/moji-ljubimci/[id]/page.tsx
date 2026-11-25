import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { moderateEntryAction, moderateGestureAction, unpublishAction } from "@/app/moji-ljubimci/actions";
import { DeleteMemorialForm, GuestbookModeForm, VisibilityForm } from "@/components/account/manage-forms";
import { PageShell } from "@/components/site-chrome";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { FREE_PHOTO_LIMIT, PAID_PHOTO_LIMIT, isPaid } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { account } from "@/messages/hr/account";
import { gesture as gestureText } from "@/messages/hr/gesture";
import { memorial as memorialText } from "@/messages/hr/memorial";
import { requireMember } from "@/server/auth";
import { env } from "@/server/env";
import { getEditableMemorial } from "@/server/memorials/access";
import { createSessionClient } from "@/server/supabase/session";

export const metadata: Metadata = { title: account.manageTitle, robots: { index: false } };

async function Manage({ params }: Pick<PageProps<"/moji-ljubimci/[id]">, "params">) {
  const { id } = await params;
  await requireMember(`/moji-ljubimci/${id}`);
  const editable = await getEditableMemorial(id);
  if (!editable) {
    notFound();
  }
  const { memorial, photos, isOwner } = editable;
  const supabase = await createSessionClient();
  const { data: gestures } = await supabase
    .from("gestures")
    .select("id, kind, display_name, message, expires_at, status")
    .eq("memorial_id", id)
    .neq("status", "refunded")
    .order("created_at", { ascending: false })
    .limit(100);
  const [{ data: entries }, { data: shareKey }] = await Promise.all([
    supabase
      .from("guestbook_entries")
      .select("id, author_name, body, status, created_at")
      .eq("memorial_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    memorial.visibility === "unlisted"
      ? supabase.rpc("memorial_share_key", { p_id: id })
      : Promise.resolve({ data: null }),
  ]);
  const paid = isPaid(memorial.tier);
  const publicPath =
    memorial.status !== "published"
      ? null
      : memorial.visibility === "unlisted" && shareKey
        ? `/s/${shareKey}`
        : `/spomen/${memorial.slug}`;
  const photoCount = photos.filter((photo) => photo.kind === "photo").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link href="/moji-ljubimci" className="min-h-11 content-center text-[15px] font-semibold">
          ← {account.backToList}
        </Link>
        <h1 className="text-4xl font-extrabold [overflow-wrap:anywhere]">{memorial.name || account.untitled}</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={memorial.status === "published" ? "mint" : "butter"}>{account.status[memorial.status]}</Chip>
          <Chip tone="butter">{account.tier[memorial.tier]}</Chip>
          <Chip tone="butter">{account.visibility[memorial.visibility]}</Chip>
        </div>
        {publicPath ? (
          <ButtonLink href={publicPath as Route}>{account.view}</ButtonLink>
        ) : memorial.status === "draft" ? (
          <ButtonLink href={`/izradi/${id}/pregled` as Route}>{account.content.publish}</ButtonLink>
        ) : null}
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">{account.sections.content}</h2>
        <ButtonLink href={`/izradi/${id}/ljubimac` as Route} variant="secondary" size="md">
          {account.content.editPet}
        </ButtonLink>
        <ButtonLink href={`/izradi/${id}/prica` as Route} variant="secondary" size="md">
          {account.content.editStory}
        </ButtonLink>
        <p className="text-sm text-plum-soft">
          {fill(account.package.photos, { used: photoCount, limit: paid ? PAID_PHOTO_LIMIT : FREE_PHOTO_LIMIT })}
        </p>
      </Card>

      {memorial.status === "published" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">{account.shareCards.title}</h2>
          {memorial.visibility === "public" ? (
            <>
              <p className="text-plum-soft">{account.shareCards.body}</p>
              <a
                href={`/kartica/${memorial.slug}/story`}
                download
                className={buttonClass("secondary", "md")}
              >
                {account.shareCards.story}
              </a>
              <a
                href={`/kartica/${memorial.slug}/objava`}
                download
                className={buttonClass("secondary", "md")}
              >
                {account.shareCards.post}
              </a>
            </>
          ) : (
            <p className="text-plum-soft">{account.shareCards.onlyPublic}</p>
          )}
        </Card>
      ) : null}

      <Card className="flex scroll-mt-6 flex-col gap-4" id="poruke">
        <h2 className="text-2xl font-extrabold">{account.sections.messages}</h2>
        {(entries ?? []).length === 0 ? (
          <p className="text-plum-soft">{account.messages.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(entries ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{entry.author_name}</span>
                  <Chip
                    tone={entry.status === "approved" ? "mint" : "butter"}
                    className="px-2.5 py-0.5 text-[13px]"
                  >
                    {entry.status === "approved"
                      ? account.messages.approved
                      : entry.status === "hidden"
                        ? account.messages.hidden
                        : account.messages.pending}
                  </Chip>
                </div>
                <p className="whitespace-pre-line [overflow-wrap:anywhere]">{entry.body}</p>
                <p className="text-sm text-plum-soft">{formatDateTime(entry.created_at)}</p>
                <div className="flex gap-2">
                  {entry.status !== "approved" ? (
                    <form action={moderateEntryAction.bind(null, id, entry.id, "approved")}>
                      <Button type="submit" size="md">
                        {entry.status === "hidden" ? account.messages.show : account.messages.approve}
                      </Button>
                    </form>
                  ) : null}
                  {entry.status !== "hidden" ? (
                    <form action={moderateEntryAction.bind(null, id, entry.id, "hidden")}>
                      <Button type="submit" size="md" variant="secondary">
                        {account.messages.hide}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <GuestbookModeForm memorialId={id} mode={memorial.guestbookMode} />
      </Card>

      {(gestures ?? []).length > 0 ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">{gestureText.owner.title}</h2>
          <ul className="flex flex-col gap-3">
            {(gestures ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">
                    {item.display_name} · {memorialText.gestureKinds[item.kind as keyof typeof memorialText.gestureKinds]}
                  </span>
                  {item.status === "hidden" ? (
                    <Chip tone="butter" className="px-2.5 py-0.5 text-[13px]">
                      {gestureText.owner.hidden}
                    </Chip>
                  ) : null}
                </div>
                {item.message ? <p className="[overflow-wrap:anywhere]">{item.message}</p> : null}
                <p className="text-sm text-plum-soft">
                  {fill(gestureText.owner.expires, { date: formatDateTime(item.expires_at) })}
                </p>
                <form
                  action={moderateGestureAction.bind(null, id, item.id, item.status === "hidden" ? "active" : "hidden")}
                >
                  <Button type="submit" size="md" variant="secondary">
                    {item.status === "hidden" ? gestureText.owner.show : gestureText.owner.hide}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <p className="text-sm text-plum-soft">{gestureText.owner.note}</p>
        </Card>
      ) : null}

      {isOwner ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">{account.sections.privacy}</h2>
          {paid ? (
            <>
              <VisibilityForm memorialId={id} visibility={memorial.visibility} />
              {memorial.visibility === "unlisted" && shareKey && memorial.status === "published" ? (
                <div className="flex flex-col gap-1 rounded-2xl bg-mint p-4">
                  <span className="text-[15px] font-bold">{account.privacy.shareLink}</span>
                  <span className="break-all text-[15px]">{`${env.siteUrl}/s/${shareKey}`}</span>
                  <span className="text-sm text-plum-soft">{account.privacy.shareLinkHint}</span>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-plum-soft">{account.privacy.freeNote}</p>
          )}
          {memorial.status === "published" ? (
            <form action={unpublishAction.bind(null, id)} className="flex flex-col gap-1.5">
              <Button type="submit" variant="quiet" className="self-start">
                {account.privacy.unpublish}
              </Button>
              <p className="text-sm text-plum-soft">{account.privacy.unpublishHint}</p>
            </form>
          ) : null}
        </Card>
      ) : null}

      {isOwner ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">{account.sections.package}</h2>
          <p>{fill(account.package.current, { tier: account.tier[memorial.tier] })}</p>
          {memorial.tier === "free" ? (
            <ButtonLink href={`/izradi/${id}/pregled` as Route} variant="secondary" size="md">
              {account.package.upgradeFree}
            </ButtonLink>
          ) : null}
        </Card>
      ) : null}

      {isOwner ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold">{account.sections.danger}</h2>
          <p className="text-plum-soft">{account.danger.body}</p>
          <DeleteMemorialForm memorialId={id} />
        </Card>
      ) : null}
    </div>
  );
}

export default function ManagePage(props: PageProps<"/moji-ljubimci/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Manage params={props.params} />
      </Suspense>
    </PageShell>
  );
}
