"use client";

import type { Route } from "next";
import Link from "next/link";
import type { WorkflowState } from "@/app/admin/clanci/actions";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/content/limits";
import type { ArticleStatus } from "@/lib/content/types";
import { allowedIntents, vetReviewMissing, type ReviewState, type WorkflowIntent } from "@/lib/content/workflow";
import { fill, plural } from "@/lib/text";
import { content } from "@/messages/hr/content";

/**
 * Stanje članka i sljedeći dopušteni koraci. Uvijek pokazuje što je od pregleda i odobrenja
 * upisano, a uz nedostupnu objavu piše zašto je nedostupna. Koraci se odnose na spremljenu
 * verziju teksta, pa su isključeni dok ima nespremljenih izmjena.
 */

const t = content.admin.workflow;

export type WorkflowDates = {
  vetReviewedAt: string | null;
  ownerApprovedAt: string | null;
  publishedAt: string | null;
};

export type WorkflowArticle = {
  id: string | null;
  slug: string;
  status: ArticleStatus;
  needsVetReview: boolean;
  vetReviewedBy: string | null;
  vetReviewedAt: string | null;
  ownerApprovedAt: string | null;
  publishedAt: string | null;
  /** Broj spremljenih izvora. */
  sourceCount: number;
};

const statusTone: Record<ArticleStatus, "butter" | "mint" | "teal"> = {
  draft: "butter",
  in_review: "butter",
  approved: "mint",
  published: "teal",
  archived: "butter",
};

function Check({ label, value, done }: { label: string; value: string; done: boolean | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{label}</dt>
      <dd className={cn("text-[15px] leading-snug", done === false ? "font-bold text-terracotta-deep" : "text-plum")}>
        {value}
      </dd>
    </div>
  );
}

/** Zašto se u ovom stanju ne može objaviti; null kad je objava dostupna ili članak već jest objavljen. */
function publishExplanation(state: ReviewState): string | null {
  switch (state.status) {
    case "draft":
      return t.why.publishDraft;
    case "in_review":
      return vetReviewMissing(state) ? t.why.publishNeedsVet : t.why.publishNeedsOwner;
    case "approved":
      if (vetReviewMissing(state)) {
        return t.why.publishVetOnly;
      }
      return state.ownerApprovedAt === null ? t.why.publishNeedsOwner : null;
    case "archived":
      return t.why.publishArchived;
    case "published":
      return null;
  }
}

export type WorkflowControl = {
  state: WorkflowState;
  action: (formData: FormData) => void;
  pending: boolean;
  /** Smije li se prikazati poruka zadnjeg koraka (ne smije ako je nakon njega bilo spremanja). */
  showMessage: boolean;
};

export function WorkflowPanel({
  article,
  dates,
  dirty,
  control,
}: {
  article: WorkflowArticle;
  dates: WorkflowDates;
  /** Ima li uređivač nespremljenih izmjena. */
  dirty: boolean;
  control: WorkflowControl;
}) {
  const { state, action, pending } = control;
  const review: ReviewState = {
    status: article.status,
    needsVetReview: article.needsVetReview,
    vetReviewedAt: article.vetReviewedAt,
    ownerApprovedAt: article.ownerApprovedAt,
  };
  const isNew = article.id === null;
  const intents = isNew ? [] : allowedIntents(review);
  const blocked = dirty || pending;
  const vetMissing = vetReviewMissing(review);
  const publishWhy = isNew ? null : publishExplanation(review);

  const step = (intent: WorkflowIntent, variant: "primary" | "secondary" = "primary") => (
    <Button type="submit" name="intent" value={intent} size="md" variant={variant} disabled={blocked} className="w-full">
      {t.actions[intent]}
    </Button>
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold">{t.title}</h2>
        <Chip tone={statusTone[article.status]}>{content.admin.status[article.status]}</Chip>
      </div>

      {isNew ? (
        <p className="text-[15px] text-plum-soft">{t.notSaved}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          <Check
            label={t.checks.vet}
            done={article.needsVetReview ? !vetMissing : null}
            value={
              !article.needsVetReview
                ? t.checks.vetNotNeeded
                : vetMissing
                  ? t.checks.vetMissing
                  : fill(t.checks.vetDone, {
                      name: article.vetReviewedBy ?? "",
                      date: dates.vetReviewedAt ?? "",
                    })
            }
          />
          <Check
            label={t.checks.owner}
            done={article.ownerApprovedAt !== null}
            value={
              article.ownerApprovedAt === null
                ? t.checks.ownerMissing
                : fill(t.checks.ownerDone, { date: dates.ownerApprovedAt ?? "" })
            }
          />
          <Check
            label={t.checks.sources}
            done={article.sourceCount === 0 ? false : null}
            value={
              article.sourceCount === 0
                ? t.checks.sourcesNone
                : plural(article.sourceCount, t.checks.sourcesCount)
            }
          />
          <Check
            label={t.checks.published}
            done={null}
            value={
              article.publishedAt === null
                ? t.checks.publishedNever
                : fill(article.status === "published" ? t.checks.publishedNow : t.checks.publishedBefore, {
                    date: dates.publishedAt ?? "",
                  })
            }
          />
        </dl>
      )}

      {!isNew ? (
        <div className="flex flex-col gap-3 border-t-2 border-line pt-4">
          {dirty ? (
            <p className="rounded-2xl bg-butter p-3 text-[15px] font-semibold" role="status">
              {t.why.unsaved}
            </p>
          ) : null}

          {intents.includes("vet_review") ? (
            <form action={action} className="flex flex-col gap-3">
              <Field
                label={t.vetName}
                htmlFor="pregled-veterinar"
                hint={vetMissing ? t.vetNameHint : `${t.vetAgain} ${t.vetNameHint}`}
              >
                <Input
                  id="pregled-veterinar"
                  name="vet_name"
                  maxLength={LIMITS.vetName}
                  placeholder={t.vetNamePlaceholder}
                  autoComplete="off"
                  required
                />
              </Field>
              {step("vet_review", vetMissing ? "primary" : "secondary")}
            </form>
          ) : null}

          <form action={action} className="flex flex-col gap-3">
            {intents.includes("submit_review") ? step("submit_review") : null}

            {article.status === "in_review" || intents.includes("approve") ? (
              <>
                <Button
                  type="submit"
                  name="intent"
                  value="approve"
                  size="md"
                  disabled={blocked || !intents.includes("approve")}
                  className="w-full"
                >
                  {t.actions.approve}
                </Button>
                {!intents.includes("approve") ? (
                  <p className="text-sm text-plum-soft">{t.why.approveNeedsVet}</p>
                ) : null}
              </>
            ) : null}

            {article.status === "published" ? (
              <>
                {step("unpublish", "secondary")}
                <p className="text-sm text-plum-soft">{t.why.unpublish}</p>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  name="intent"
                  value="publish"
                  size="md"
                  variant={article.status === "approved" ? "primary" : "secondary"}
                  disabled={blocked || !intents.includes("publish")}
                  className="w-full"
                >
                  {t.actions.publish}
                </Button>
                {publishWhy ? <p className="text-sm text-plum-soft">{publishWhy}</p> : null}
              </>
            )}

            {intents.includes("to_draft") ? step("to_draft", "secondary") : null}
          </form>

          {!control.showMessage ? null : state.error ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {state.error}
            </p>
          ) : state.done ? (
            <p className="text-sm font-medium text-teal" role="status">
              {state.done}
            </p>
          ) : null}

          {article.status === "published" ? (
            <Link href={`/vodic/${article.slug}` as Route} target="_blank" className="flex min-h-11 items-center font-bold">
              {t.openPublic}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
