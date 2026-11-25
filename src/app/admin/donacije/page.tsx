import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  deletePayoutAction,
  deleteShelterAction,
  removePayoutProofAction,
  saveDonationSettingsAction,
  savePayoutAction,
  saveShelterAction,
  uploadPayoutProofAction,
} from "@/app/admin/donacije/actions";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { ProofUploadForm } from "@/components/admin/proof-upload-form";
import {
  Badge,
  DataTable,
  EmptyState,
  LoadingBlock,
  NumTd,
  NumTh,
  PageHeader,
  RowLink,
  Section,
  Td,
  Th,
} from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatDateTime, formatEuro } from "@/lib/format";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";
import { loadDonations, type AdminPayout, type AdminShelter } from "@/server/admin/donations";
import { centsToEuroInput } from "@/server/admin/forms";
import { firstParam, type SearchParams } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth";

const t = adminPanel.donations;
const common = adminPanel.common;

export const metadata: Metadata = { title: t.title };

const cancelLink = "inline-flex min-h-11 items-center font-bold underline underline-offset-4";
const checkboxLabel = "flex min-h-11 cursor-pointer items-center gap-3 text-[15px]";
const checkbox = "size-6 shrink-0 accent-teal";
const formBox = "flex scroll-mt-6 flex-col gap-4 rounded-2xl border-2 border-line p-4";

function ShelterFields({ shelter }: { shelter: AdminShelter | null }) {
  const text = t.shelters.fields;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.name} htmlFor="shelter-name">
          <Input id="shelter-name" name="name" required maxLength={160} defaultValue={shelter?.name ?? ""} />
        </Field>
        <Field label={text.url} htmlFor="shelter-url" hint={text.urlHint} optional>
          <Input
            id="shelter-url"
            name="url"
            type="url"
            inputMode="url"
            maxLength={300}
            autoComplete="off"
            defaultValue={shelter?.url ?? ""}
          />
        </Field>
      </div>
      <label className={checkboxLabel}>
        <input type="checkbox" name="active" defaultChecked={shelter?.active ?? true} className={checkbox} />
        <span>{text.active}</span>
      </label>
    </>
  );
}

function PayoutFields({ payout, shelters }: { payout: AdminPayout | null; shelters: AdminShelter[] }) {
  const text = t.payouts.fields;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.shelter} htmlFor="payout-shelter">
          <Select id="payout-shelter" name="shelter_id" required defaultValue={payout?.shelterId ?? ""}>
            <option value="">{text.shelterPick}</option>
            {shelters.map((shelter) => (
              <option key={shelter.id} value={shelter.id}>
                {shelter.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={text.amount} htmlFor="payout-amount">
          <Input
            id="payout-amount"
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={payout ? centsToEuroInput(payout.amountCents) : ""}
          />
        </Field>
        <Field label={text.paidOn} htmlFor="payout-paid-on">
          <Input id="payout-paid-on" name="paid_on" type="date" required defaultValue={payout?.paidOn ?? ""} />
        </Field>
      </div>
      <Field label={text.note} htmlFor="payout-note" optional>
        <Textarea id="payout-note" name="note" maxLength={500} defaultValue={payout?.note ?? ""} />
      </Field>
      <label className={checkboxLabel}>
        <input type="checkbox" name="published" defaultChecked={payout?.published ?? false} className={checkbox} />
        <span>{text.published}</span>
      </label>
    </>
  );
}

async function DonationsData({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/donacije");
  const params = await searchParams;
  const { settings, shelters, payouts, totals } = await loadDonations();
  const editingShelter = shelters.find((shelter) => shelter.id === firstParam(params.azil)) ?? null;
  const editingPayout = payouts.find((payout) => payout.id === firstParam(params.isplata)) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-3 sm:grid-cols-3">
        {(
          [
            [t.totals.accrued, totals.accruedCents],
            [t.totals.paidPublished, totals.paidPublishedCents],
            [t.totals.paidAll, totals.paidAllCents],
          ] as const
        ).map(([name, cents]) => (
          <div key={name} className="rounded-2xl border-2 border-line bg-white p-4">
            <dt className="text-[15px] text-plum-soft">{name}</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{formatEuro(cents)}</dd>
          </div>
        ))}
      </dl>

      <Section title={t.settings.title} id="postavke">
        <ActionForm action={saveDonationSettingsAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.perMemorial} htmlFor="donation-per-memorial" hint={t.settings.perMemorialHint}>
              <Input
                id="donation-per-memorial"
                name="per_memorial"
                required
                inputMode="decimal"
                autoComplete="off"
                defaultValue={centsToEuroInput(settings.donationPerMemorialCents)}
              />
            </Field>
            <Field label={t.settings.shelter} htmlFor="donation-shelter" hint={t.settings.shelterHint}>
              <Select id="donation-shelter" name="shelter_id" defaultValue={settings.activeShelterId ?? ""}>
                <option value="">{t.settings.shelterNone}</option>
                {shelters.map((shelter) => (
                  <option key={shelter.id} value={shelter.id}>
                    {shelter.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </ActionForm>
      </Section>

      <Section title={t.shelters.title} id="azili">
        {shelters.length === 0 ? (
          <EmptyState>{t.shelters.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[560px]">
            <thead>
              <tr>
                <Th>{t.shelters.columns.name}</Th>
                <Th>{t.shelters.columns.url}</Th>
                <Th>{t.shelters.columns.active}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((shelter) => (
                <tr key={shelter.id}>
                  <Td className="font-bold [overflow-wrap:anywhere]">{shelter.name}</Td>
                  <Td className="[overflow-wrap:anywhere]">{shelter.url ?? common.none}</Td>
                  <Td>
                    <Badge tone={shelter.active ? "good" : "neutral"}>
                      {shelter.active ? common.yes : common.no}
                    </Badge>
                  </Td>
                  <Td>
                    <RowLink href={`/admin/donacije?azil=${shelter.id}#azil`}>{common.edit}</RowLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        <div id="azil" className={formBox}>
          <h3 className="text-xl font-extrabold [overflow-wrap:anywhere]">
            {editingShelter ? fill(t.shelters.editTitle, { name: editingShelter.name }) : t.shelters.newTitle}
          </h3>
          <ActionForm
            key={editingShelter?.id ?? "novi"}
            action={saveShelterAction.bind(null, editingShelter?.id ?? null)}
            submitLabel={editingShelter ? common.save : common.add}
            doneLabel={editingShelter ? common.saved : common.added}
            resetOnDone={!editingShelter}
            footer={
              editingShelter ? (
                <Link href="/admin/donacije#azili" className={cancelLink}>
                  {common.cancelEdit}
                </Link>
              ) : null
            }
          >
            <ShelterFields shelter={editingShelter} />
          </ActionForm>
          {editingShelter ? (
            <ActionButton
              action={deleteShelterAction.bind(null, editingShelter.id)}
              label={common.delete}
              confirm={t.shelters.deleteConfirm}
              danger
            />
          ) : null}
        </div>
      </Section>

      <Section title={t.payouts.title} id="isplate">
        {payouts.length === 0 ? (
          <EmptyState>{t.payouts.empty}</EmptyState>
        ) : (
          <DataTable className="min-w-[820px]">
            <thead>
              <tr>
                <Th>{t.payouts.columns.paidOn}</Th>
                <Th>{t.payouts.columns.shelter}</Th>
                <NumTh>{t.payouts.columns.amount}</NumTh>
                <Th>{t.payouts.columns.note}</Th>
                <Th>{t.payouts.columns.published}</Th>
                <Th>{t.payouts.columns.proof}</Th>
                <Th>{common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(payout.paidOn)}</Td>
                  <Td className="[overflow-wrap:anywhere]">{payout.shelterName ?? common.none}</Td>
                  <NumTd>{formatEuro(payout.amountCents)}</NumTd>
                  <Td className="max-w-72 [overflow-wrap:anywhere]">{payout.note ?? common.none}</Td>
                  <Td>
                    <Badge tone={payout.published ? "good" : "warn"}>
                      {payout.published ? common.yes : common.no}
                    </Badge>
                  </Td>
                  <Td>
                    {payout.proofUrl ? (
                      <RowLink href={payout.proofUrl} external>
                        {t.payouts.proof.open}
                      </RowLink>
                    ) : (
                      <span className="text-plum-soft">{t.payouts.proof.none}</span>
                    )}
                  </Td>
                  <Td>
                    <RowLink href={`/admin/donacije?isplata=${payout.id}#isplata`}>{common.edit}</RowLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        <div id="isplata" className={formBox}>
          <h3 className="text-xl font-extrabold">{editingPayout ? t.payouts.editTitle : t.payouts.newTitle}</h3>
          {shelters.length === 0 ? (
            <EmptyState>{t.payouts.needShelter}</EmptyState>
          ) : (
            <ActionForm
              key={editingPayout?.id ?? "nova"}
              action={savePayoutAction.bind(null, editingPayout?.id ?? null)}
              submitLabel={editingPayout ? common.save : common.add}
              doneLabel={editingPayout ? common.saved : common.added}
              footer={
                editingPayout ? (
                  <Link href="/admin/donacije#isplate" className={cancelLink}>
                    {common.cancelEdit}
                  </Link>
                ) : (
                  <span className="text-sm text-plum-soft">{t.payouts.afterCreate}</span>
                )
              }
            >
              <PayoutFields payout={editingPayout} shelters={shelters} />
            </ActionForm>
          )}

          {editingPayout ? (
            <div className="flex flex-col gap-3 border-t-2 border-line pt-4">
              <h4 className="font-display text-lg font-extrabold">{t.payouts.proof.title}</h4>
              {editingPayout.proofUrl ? (
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <RowLink href={editingPayout.proofUrl} external>
                    {t.payouts.proof.open}
                  </RowLink>
                  <ActionButton
                    action={removePayoutProofAction.bind(null, editingPayout.id)}
                    label={t.payouts.proof.remove}
                    confirm={t.payouts.proof.removeConfirm}
                  />
                </div>
              ) : (
                <p className="text-plum-soft">{t.payouts.proof.missing}</p>
              )}
              <ProofUploadForm action={uploadPayoutProofAction.bind(null, editingPayout.id)} />
              <ActionButton
                action={deletePayoutAction.bind(null, editingPayout.id)}
                label={common.delete}
                confirm={t.payouts.deleteConfirm}
                danger
              />
            </div>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

export default function AdminDonationsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingBlock />}>
        <DonationsData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
