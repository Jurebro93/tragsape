import type { Metadata } from "next";
import { Suspense } from "react";
import {
  dismissReportAction,
  resolveReportAction,
  setMemorialHiddenAction,
} from "@/app/admin/moderacija/actions";
import { ActionButton } from "@/components/admin/action-form";
import { gestureKindLabel } from "@/components/admin/gesture-parts";
import { MemorialStatusBadge } from "@/components/admin/order-parts";
import {
  Badge,
  DataTable,
  EmptyState,
  LoadingBlock,
  PageHeader,
  RowLink,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import { photoUrl } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import {
  REPORT_LIMIT,
  loadModeration,
  type ModerationMemorial,
  type ReportItem,
} from "@/server/admin/moderation";
import { firstParam, publicMemorialPath, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.moderation;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

function label<T extends Record<string, string>>(labels: T, key: string): string {
  return key in labels ? labels[key as keyof T] : key;
}

/** Ime spomena, stanje i poveznica na javnu stranicu (samo za objavljen i javan spomen). */
function MemorialSummary({ memorial }: { memorial: ModerationMemorial }) {
  const path = publicMemorialPath(memorial);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-bold [overflow-wrap:anywhere]">{memorial.name || common.untitled}</span>
      <MemorialStatusBadge status={memorial.status} />
      <span className="text-[15px] text-plum-soft">{label(common.tier, memorial.tier)}</span>
      {path ? (
        <RowLink href={path} external>
          {common.openPublic}
        </RowLink>
      ) : null}
    </span>
  );
}

const quote = "whitespace-pre-line rounded-2xl bg-vanilla px-4 py-3 [overflow-wrap:anywhere]";

function ReportCard({ report }: { report: ReportItem }) {
  const text = t.reports;
  const memorial = report.memorial;
  const targetMissing =
    (report.targetType === "guestbook_entry" && !report.entry) ||
    (report.targetType === "gesture" && !report.gesture) ||
    (report.targetType === "photo" && !report.photo);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warn">{label(text.reasons, report.reason)}</Badge>
        <Badge>{label(text.targets, report.targetType)}</Badge>
        <span className="text-[15px] text-plum-soft">
          {text.reported}: {formatDateTime(report.createdAt)}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <dt className="font-bold">{text.reporter}</dt>
          <dd className="[overflow-wrap:anywhere]">{report.reporterEmail ?? text.noReporter}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="font-bold">{text.details}</dt>
          <dd className="whitespace-pre-line [overflow-wrap:anywhere]">{report.details ?? text.noDetails}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-bold">{text.memorial}</span>
        {memorial ? <MemorialSummary memorial={memorial} /> : <p className="text-plum-soft">{text.memorialMissing}</p>}
      </div>

      {report.entry ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px]">
            <span className="font-bold">{text.entryBy}:</span> {report.entry.authorName} (
            {label(text.entryStatus, report.entry.status)})
          </span>
          <p className={quote}>{report.entry.body}</p>
        </div>
      ) : null}
      {report.gesture ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px]">
            <span className="font-bold">{text.gestureBy}:</span> {report.gesture.displayName} (
            {gestureKindLabel(report.gesture.kind)}, {label(adminPanel.gestures.status, report.gesture.status)})
          </span>
          <p className={quote}>{report.gesture.message ?? adminPanel.gestures.noMessage}</p>
        </div>
      ) : null}
      {report.photo ? (
        <div className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- vlastita ruta s provjerom pristupa */}
          <img
            src={photoUrl(report.photo.id, "thumb")}
            alt={text.photoAlt}
            className="size-32 rounded-2xl bg-vanilla object-cover"
          />
          {report.photo.caption ? <p className={quote}>{report.photo.caption}</p> : null}
        </div>
      ) : null}
      {targetMissing ? <p className="text-plum-soft">{text.targetMissing}</p> : null}

      <div className="flex flex-wrap items-start gap-2 border-t-2 border-line pt-3">
        {report.entry && report.entry.status !== "removed" ? (
          <ActionButton
            action={resolveReportAction.bind(null, report.id, "remove_entry")}
            label={text.actions.removeEntry}
            confirm={text.confirm.removeEntry}
            variant="primary"
          />
        ) : null}
        {report.gesture && report.gesture.status === "active" ? (
          <ActionButton
            action={resolveReportAction.bind(null, report.id, "hide_gesture")}
            label={text.actions.hideGesture}
            variant="primary"
          />
        ) : null}
        {memorial?.status === "published" ? (
          <ActionButton
            action={resolveReportAction.bind(null, report.id, "hide_memorial")}
            label={text.actions.hideMemorial}
            confirm={text.confirm.hideMemorial}
            variant={report.targetType === "memorial" || report.targetType === "photo" ? "primary" : "secondary"}
          />
        ) : null}
        {memorial?.status === "hidden" ? (
          <ActionButton
            action={resolveReportAction.bind(null, report.id, "restore_memorial")}
            label={text.actions.restoreMemorial}
          />
        ) : null}
        <ActionButton action={dismissReportAction.bind(null, report.id)} label={text.actions.dismiss} />
      </div>
    </li>
  );
}

async function ModerationData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/moderacija");
  const searchInput = firstParam((await searchParams).slug);
  const { reports, openReports, hidden, search } = await loadModeration(searchInput);

  return (
    <div className="flex flex-col gap-5">
      <Section title={t.reports.title} id="prijave">
        {reports.length === 0 ? (
          <EmptyState>{t.reports.empty}</EmptyState>
        ) : (
          <>
            {openReports > reports.length ? (
              <p className="text-[15px] text-plum-soft">{fill(t.reports.limit, { count: REPORT_LIMIT })}</p>
            ) : null}
            <ul className="flex flex-col gap-3">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title={t.search.title} id="trazi">
        <form action="/admin/moderacija#trazi" method="get" className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label={t.search.label} htmlFor="moderation-slug">
                <Input
                  id="moderation-slug"
                  name="slug"
                  required
                  maxLength={300}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  defaultValue={searchInput}
                  aria-describedby="moderation-slug-hint"
                />
              </Field>
            </div>
            <Button type="submit" size="md" variant="secondary">
              {t.search.submit}
            </Button>
          </div>
          <p id="moderation-slug-hint" className="text-sm text-plum-soft">
            {t.search.hint}
          </p>
        </form>
        {search === null ? null : search.results.length === 0 ? (
          <EmptyState>{t.search.notFound}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {search.results.map((memorial) => (
              <li key={memorial.id} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-4">
                <MemorialSummary memorial={memorial} />
                <span className="text-[15px] text-plum-soft [overflow-wrap:anywhere]">
                  /spomen/{memorial.slug} · {label(common.visibility, memorial.visibility)}
                </span>
                {memorial.status === "published" ? (
                  <ActionButton
                    action={setMemorialHiddenAction.bind(null, memorial.id, true)}
                    label={t.search.hide}
                    confirm={t.search.confirmHide}
                    variant="primary"
                  />
                ) : (
                  <ActionButton action={setMemorialHiddenAction.bind(null, memorial.id, false)} label={t.search.restore} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t.hidden.title} id="skriveni">
        {hidden.length === 0 ? (
          <EmptyState>{t.hidden.empty}</EmptyState>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t.hidden.columns.name}</Th>
                <Th>{t.hidden.columns.slug}</Th>
                <Th>{t.hidden.columns.tier}</Th>
                <Th>{t.hidden.columns.updated}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {hidden.map((memorial) => (
                <tr key={memorial.id}>
                  <Td className="font-bold [overflow-wrap:anywhere]">{memorial.name || common.untitled}</Td>
                  <Td className="[overflow-wrap:anywhere]">{memorial.slug}</Td>
                  <Td>{label(common.tier, memorial.tier)}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(memorial.updatedAt)}</Td>
                  <Td>
                    <ActionButton
                      action={setMemorialHiddenAction.bind(null, memorial.id, false)}
                      label={t.hidden.restore}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>
    </div>
  );
}

export default function AdminModerationPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <ModerationData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
