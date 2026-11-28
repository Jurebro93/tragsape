import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, EmptyState, FilterTabs, LoadingBlock, PageHeader, Section } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { fill } from "@/lib/text";
import { requests } from "@/messages/hr/requests";
import { REQUEST_STATUSES, loadTopicRequests, type RequestStatus } from "@/server/admin/topic-requests";
import { setRequestStatusAction } from "./actions";
import { AnswerForm } from "./answer-form";

const t = requests.admin;

export const metadata: Metadata = { title: t.title };

async function List({ searchParams }: Pick<PageProps<"/admin/pitanja">, "searchParams">) {
  const params = await searchParams;
  const raw = Array.isArray(params.stanje) ? params.stanje[0] : params.stanje;
  const status: RequestStatus = (REQUEST_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as RequestStatus) : "new";
  const rows = await loadTopicRequests(status);
  return (
    <>
      <FilterTabs
        items={REQUEST_STATUSES.map((item) => ({ href: `/admin/pitanja?stanje=${item}`, label: t.filters[item], current: item === status }))}
      />
      <Section title={t.filters[status]}>
        {rows.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
                <span className="flex flex-wrap items-center gap-2 text-sm text-plum-soft">
                  <Badge tone={row.status === "answered" ? "good" : row.status === "rejected" ? "neutral" : "warn"}>{t.statuses[row.status]}</Badge>
                  {formatDateTime(row.createdAt)} · {row.email}
                  {row.page ? ` · ${t.page}: ${row.page}` : ""}
                  {row.notifiedAt ? ` · ${fill(t.notified, { date: formatDateTime(row.notifiedAt) })}` : ""}
                </span>
                <p className="whitespace-pre-line text-[16px] leading-relaxed">{row.question}</p>
                {row.articleSlug ? <a href={`/vodic/${row.articleSlug}`} className="font-bold text-teal">/vodic/{row.articleSlug}</a> : null}
                {row.status !== "answered" ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      {(["planned", "rejected"] as const)
                        .filter((next) => next !== row.status)
                        .map((next) => (
                          <form key={next} action={setRequestStatusAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="status" value={next} />
                            <button type="submit" className="min-h-11 font-bold text-teal underline">
                              {next === "planned" ? t.plan : t.reject}
                            </button>
                          </form>
                        ))}
                    </div>
                    <AnswerForm id={row.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function AdminRequestsPage(props: PageProps<"/admin/pitanja">) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock className="h-40" />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
