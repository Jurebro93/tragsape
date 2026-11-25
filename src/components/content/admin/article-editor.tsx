"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  saveArticleAction,
  transitionArticleAction,
  type SaveArticleState,
  type WorkflowState,
} from "@/app/admin/clanci/actions";
import {
  WorkflowPanel,
  type WorkflowControl,
  type WorkflowDates,
} from "@/components/content/admin/workflow-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LIMITS } from "@/lib/content/limits";
import { cleanText, reviewedContentChanged } from "@/lib/content/normalize";
import { slugify, suggestSlug } from "@/lib/content/slug";
import {
  CLUSTERS,
  CTA_SLOTS,
  ctaFieldName,
  type ArticleStatus,
  type Cluster,
  type CtaSlot,
} from "@/lib/content/types";
import type { SourceField } from "@/lib/content/validation";
import { editNeedsConfirmation, reviewAfterEdit, type ReviewState } from "@/lib/content/workflow";
import { fill } from "@/lib/text";
import { content } from "@/messages/hr/content";

/**
 * Uređivač članka. Polja su upravljana (stanje u komponenti), pa greška pri spremanju ne briše
 * ono što je upisano. Nakon uspješnog spremanja obrazac kreće iznova od spremljene verzije.
 */

const t = content.admin.editor;

export type EditorSource = {
  id: string;
  claim: string;
  title: string;
  url: string;
  publisher: string;
  accessedOn: string;
};

export type EditorArticle = {
  /** Null dok članak nije prvi put spremljen. */
  id: string | null;
  slug: string;
  cluster: Cluster | "";
  title: string;
  excerpt: string;
  bodyMd: string;
  seoTitle: string;
  seoDescription: string;
  status: ArticleStatus;
  needsVetReview: boolean;
  vetReviewedBy: string | null;
  vetReviewedAt: string | null;
  ownerApprovedAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  sources: EditorSource[];
  cta: Record<CtaSlot, string | null>;
};

export type EditorCtaOption = { key: string; heading: string; active: boolean };

type EditorProps = {
  article: EditorArticle;
  ctaOptions: readonly EditorCtaOption[];
  /** Današnji datum u Zagrebu (YYYY-MM-DD): zadani datum pristupa novog izvora. */
  today: string;
  /** Datumi tijeka objave, već oblikovani na poslužitelju. */
  dates: WorkflowDates;
};

const idle: SaveArticleState = { errors: {} };
const idleWorkflow: WorkflowState = { error: null };

export function ArticleEditor(props: EditorProps) {
  const [state, action, pending] = useActionState(saveArticleAction.bind(null, props.article.id), idle);
  // Stanje koraka objave živi ovdje, iznad obrasca, da poruka preživi ponovno punjenje polja.
  const [workflowState, workflowAction, workflowPending] = useActionState(
    transitionArticleAction.bind(null, props.article.id ?? ""),
    idleWorkflow,
  );
  const workflow: WorkflowControl = {
    state: workflowState,
    action: workflowAction,
    pending: workflowPending,
    showMessage: (workflowState.at ?? 0) >= (state.savedAt ?? 0),
  };
  // Novi ključ nakon spremanja: polja se ponovno pune onim što je baza stvarno spremila.
  const revision = `${props.article.updatedAt ?? "novi"}:${state.savedAt ?? 0}`;
  return (
    <EditorForm key={revision} {...props} state={state} action={action} pending={pending} workflow={workflow} />
  );
}

type Draft = {
  title: string;
  slug: string;
  slugTouched: boolean;
  cluster: Cluster | "";
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  needsVet: boolean;
  sources: EditorSource[];
  cta: Record<CtaSlot, string | null>;
};

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {intro ? <p className="text-[15px] text-plum-soft">{intro}</p> : null}
      </div>
      {children}
    </Card>
  );
}

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-full border-2 border-line bg-white text-lg font-bold text-plum hover:bg-butter disabled:cursor-not-allowed disabled:opacity-40";

function SourcesEditor({
  sources,
  errors,
  today,
  onChange,
}: {
  sources: EditorSource[];
  errors: Record<string, Partial<Record<SourceField, string>>>;
  today: string;
  onChange: (next: EditorSource[]) => void;
}) {
  const s = t.sources;
  const patch = (id: string, field: keyof Omit<EditorSource, "id">, value: string) =>
    onChange(sources.map((source) => (source.id === id ? { ...source, [field]: value } : source)));
  const move = (index: number, step: -1 | 1) => {
    const next = [...sources];
    const [moved] = next.splice(index, 1);
    next.splice(index + step, 0, moved);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-4">
      {sources.length === 0 ? <p className="text-plum-soft">{s.empty}</p> : null}
      <ol className="flex flex-col gap-4">
        {sources.map((source, index) => {
          const n = index + 1;
          const rowErrors = errors[source.id] ?? {};
          const fieldId = (field: string) => `izvor-${source.id}-${field}`;
          return (
            <li key={source.id}>
              <fieldset className="flex flex-col gap-3 rounded-2xl border-2 border-line p-4">
                <legend className="sr-only">{fill(s.item, { n })}</legend>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-extrabold" aria-hidden="true">
                    {fill(s.item, { n })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={fill(s.moveUp, { n })}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={fill(s.moveDown, { n })}
                      disabled={index === sources.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-full px-3 text-[15px] font-bold text-danger hover:bg-line"
                      aria-label={fill(s.removeLabel, { n })}
                      onClick={() => onChange(sources.filter((entry) => entry.id !== source.id))}
                    >
                      {s.remove}
                    </button>
                  </span>
                </div>
                <Field label={s.claim} htmlFor={fieldId("claim")} error={rowErrors.claim} optional>
                  <Input
                    id={fieldId("claim")}
                    value={source.claim}
                    maxLength={LIMITS.sourceClaim}
                    placeholder={s.claimPlaceholder}
                    onChange={(event) => patch(source.id, "claim", event.target.value)}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={s.sourceTitle} htmlFor={fieldId("title")} error={rowErrors.title}>
                    <Input
                      id={fieldId("title")}
                      value={source.title}
                      maxLength={LIMITS.sourceTitle}
                      required
                      onChange={(event) => patch(source.id, "title", event.target.value)}
                    />
                  </Field>
                  <Field label={s.publisher} htmlFor={fieldId("publisher")} error={rowErrors.publisher} optional>
                    <Input
                      id={fieldId("publisher")}
                      value={source.publisher}
                      maxLength={LIMITS.sourcePublisher}
                      onChange={(event) => patch(source.id, "publisher", event.target.value)}
                    />
                  </Field>
                  <Field label={s.url} htmlFor={fieldId("url")} error={rowErrors.url}>
                    <Input
                      id={fieldId("url")}
                      type="url"
                      inputMode="url"
                      value={source.url}
                      maxLength={LIMITS.sourceUrl}
                      placeholder={s.urlPlaceholder}
                      required
                      onChange={(event) => patch(source.id, "url", event.target.value)}
                    />
                  </Field>
                  <Field label={s.accessedOn} htmlFor={fieldId("accessed")} error={rowErrors.accessedOn}>
                    <Input
                      id={fieldId("accessed")}
                      type="date"
                      value={source.accessedOn}
                      max={today}
                      required
                      onChange={(event) => patch(source.id, "accessedOn", event.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="self-start"
        disabled={sources.length >= LIMITS.sources}
        onClick={() =>
          onChange([
            ...sources,
            { id: crypto.randomUUID(), claim: "", title: "", url: "", publisher: "", accessedOn: today },
          ])
        }
      >
        {s.add}
      </Button>
    </div>
  );
}

function EditorForm({
  article,
  ctaOptions,
  today,
  dates,
  state,
  action,
  pending,
  workflow,
}: EditorProps & {
  state: SaveArticleState;
  action: (formData: FormData) => void;
  pending: boolean;
  workflow: WorkflowControl;
}) {
  const isNew = article.id === null;
  const slugLocked = article.publishedAt !== null;
  const [draft, setDraft] = useState<Draft>(() => ({
    title: article.title,
    slug: article.slug,
    // Adresa prati naslov dok je netko ne promijeni rukom.
    slugTouched: article.slug !== "" && article.slug !== suggestSlug(article.title),
    cluster: article.cluster,
    excerpt: article.excerpt,
    body: article.bodyMd,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    needsVet: article.needsVetReview,
    sources: article.sources,
    cta: article.cta,
  }));
  const [confirmed, setConfirmed] = useState(false);
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const contentChanged = reviewedContentChanged(
    { title: article.title, excerpt: article.excerpt, bodyMd: article.bodyMd, sources: article.sources },
    { title: draft.title, excerpt: draft.excerpt, bodyMd: draft.body, sources: draft.sources },
  );
  const dirty =
    contentChanged ||
    draft.slug !== article.slug ||
    draft.cluster !== article.cluster ||
    cleanText(draft.seoTitle) !== cleanText(article.seoTitle) ||
    cleanText(draft.seoDescription) !== cleanText(article.seoDescription) ||
    draft.needsVet !== article.needsVetReview ||
    CTA_SLOTS.some((slot) => draft.cta[slot] !== article.cta[slot]);

  // Ista pravila kao na poslužitelju: što ova izmjena znači za pregled i odobrenje.
  const review: ReviewState = {
    status: article.status,
    needsVetReview: article.needsVetReview,
    vetReviewedAt: article.vetReviewedAt,
    ownerApprovedAt: article.ownerApprovedAt,
  };
  const effect = reviewAfterEdit(review, { needsVetReview: draft.needsVet, contentChanged });
  const needsConfirm = !isNew && (editNeedsConfirmation(review, effect) || state.needsConfirm === true);

  // Zatvaranje kartice s nespremljenim tekstom traži potvrdu preglednika.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = state.errors;
  const justSaved = state.savedAt !== undefined && !dirty && Object.keys(errors).length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <form action={action} className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
        <Section title={t.sectionText}>
          <Field label={t.fields.title} htmlFor="clanak-naslov" error={errors.title}>
            <Input
              id="clanak-naslov"
              name="title"
              value={draft.title}
              maxLength={LIMITS.title}
              required
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({
                  ...current,
                  title,
                  slug: slugLocked || current.slugTouched ? current.slug : suggestSlug(title),
                }));
              }}
            />
          </Field>
          <Field
            label={t.fields.slug}
            htmlFor="clanak-adresa"
            hint={slugLocked ? t.fields.slugLocked : t.fields.slugHint}
            error={errors.slug}
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-[15px] text-plum-soft">{t.fields.slugPrefix}</span>
              <Input
                id="clanak-adresa"
                name="slug"
                value={draft.slug}
                readOnly={slugLocked}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 font-mono text-[15px] read-only:bg-line read-only:text-plum-soft"
                onChange={(event) => {
                  const slug = event.target.value;
                  setDraft((current) => ({ ...current, slug, slugTouched: true }));
                }}
                onBlur={() =>
                  setDraft((current) => {
                    if (slugLocked) {
                      return current;
                    }
                    const slug = slugify(current.slug);
                    // Prazna adresa ponovno prati naslov.
                    return slug === ""
                      ? { ...current, slug: suggestSlug(current.title), slugTouched: false }
                      : { ...current, slug };
                  })
                }
              />
            </div>
          </Field>
          <Field label={t.fields.cluster} htmlFor="clanak-tema" error={errors.cluster}>
            <Select
              id="clanak-tema"
              name="cluster"
              value={draft.cluster}
              required
              onChange={(event) => set("cluster", event.target.value as Cluster | "")}
            >
              {draft.cluster === "" ? <option value="">{t.fields.clusterPlaceholder}</option> : null}
              {CLUSTERS.map((cluster) => (
                <option key={cluster} value={cluster}>
                  {content.guide.clusters[cluster].name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t.fields.excerpt}
            htmlFor="clanak-sazetak"
            hint={`${t.fields.excerptHint} (${draft.excerpt.length}/${LIMITS.excerpt})`}
            error={errors.excerpt}
            optional
          >
            <Textarea
              id="clanak-sazetak"
              name="excerpt"
              value={draft.excerpt}
              maxLength={LIMITS.excerpt}
              className="min-h-28"
              onChange={(event) => set("excerpt", event.target.value)}
            />
          </Field>
          <Field label={t.fields.body} htmlFor="clanak-tekst" hint={t.fields.bodyHint} error={errors.body}>
            <Textarea
              id="clanak-tekst"
              name="body_md"
              value={draft.body}
              spellCheck
              lang="hr"
              className="min-h-[32rem] resize-y font-mono text-[15px] leading-relaxed"
              onChange={(event) => set("body", event.target.value)}
            />
          </Field>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
            {isNew ? (
              <span className="text-plum-soft">{t.fields.previewAfterSave}</span>
            ) : (
              <>
                <Link
                  href={`/admin/clanci/${article.id}/pregled` as Route}
                  target="_blank"
                  className="flex min-h-11 items-center font-bold"
                >
                  {t.fields.preview}
                </Link>
                <span className="text-plum-soft">{t.fields.previewHint}</span>
              </>
            )}
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-3.5 has-checked:border-teal has-checked:bg-mint">
            <input
              type="checkbox"
              name="needs_vet_review"
              checked={draft.needsVet}
              className="mt-0.5 size-6 shrink-0 accent-teal"
              onChange={(event) => set("needsVet", event.target.checked)}
            />
            <span className="flex flex-col">
              <span className="font-bold">{t.fields.needsVet}</span>
              <span className="text-sm text-plum-soft">{t.fields.needsVetHint}</span>
            </span>
          </label>
        </Section>

        <Section title={t.sources.title} intro={t.sources.intro}>
          {errors.sources ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {errors.sources}
            </p>
          ) : null}
          <SourcesEditor
            sources={draft.sources}
            errors={errors.sourceRows ?? {}}
            today={today}
            onChange={(sources) => set("sources", sources)}
          />
          <input type="hidden" name="sources_json" value={JSON.stringify(draft.sources)} readOnly />
        </Section>

        <Section title={t.cta.title} intro={t.cta.intro}>
          {errors.cta ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {errors.cta}
            </p>
          ) : null}
          {CTA_SLOTS.map((slot) => {
            const selected = draft.cta[slot];
            return (
              <Field key={slot} label={t.cta.slots[slot]} htmlFor={`clanak-${slot}`} hint={t.cta.slotHints[slot]}>
                <Select
                  id={`clanak-${slot}`}
                  name={ctaFieldName(slot)}
                  value={selected ?? ""}
                  onChange={(event) =>
                    set("cta", { ...draft.cta, [slot]: event.target.value === "" ? null : event.target.value })
                  }
                >
                  <option value="">{t.cta.none}</option>
                  {ctaOptions
                    .filter((option) => option.active || option.key === selected)
                    .map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.active ? option.heading : fill(t.cta.inactive, { heading: option.heading })}
                      </option>
                    ))}
                </Select>
              </Field>
            );
          })}
          <Link href="/admin/sekcije" className="flex min-h-11 items-center self-start text-[15px] font-bold">
            {t.cta.manage}
          </Link>
        </Section>

        <Section title={t.sectionSeo}>
          <Field
            label={t.fields.seoTitle}
            htmlFor="clanak-seo-naslov"
            hint={t.fields.seoTitleHint}
            error={errors.seoTitle}
            optional
          >
            <Input
              id="clanak-seo-naslov"
              name="seo_title"
              value={draft.seoTitle}
              maxLength={LIMITS.seoTitle}
              onChange={(event) => set("seoTitle", event.target.value)}
            />
          </Field>
          <Field
            label={t.fields.seoDescription}
            htmlFor="clanak-seo-opis"
            hint={`${t.fields.seoDescriptionHint} (${draft.seoDescription.length}/${LIMITS.seoDescription})`}
            error={errors.seoDescription}
            optional
          >
            <Textarea
              id="clanak-seo-opis"
              name="seo_description"
              value={draft.seoDescription}
              maxLength={LIMITS.seoDescription}
              className="min-h-24"
              onChange={(event) => set("seoDescription", event.target.value)}
            />
          </Field>
        </Section>

        <Card className="flex flex-col gap-4">
          {needsConfirm ? (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-sun bg-butter p-4" role="alert">
              <p className="font-display text-lg font-extrabold">{t.confirm.title}</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
                {effect.clearVetReview ? <li>{t.confirm.vetCleared}</li> : null}
                {!effect.clearVetReview && effect.clearOwnerApproval ? <li>{t.confirm.vetNeeded}</li> : null}
                {effect.status !== article.status ? (
                  <li>{article.status === "published" ? t.confirm.unpublished : t.confirm.backToReview}</li>
                ) : null}
              </ul>
              <label className="flex cursor-pointer items-center gap-3 text-[15px] font-bold">
                <input
                  type="checkbox"
                  name="confirm_reset"
                  checked={confirmed}
                  required
                  className="size-6 shrink-0 accent-teal"
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>{t.confirm.checkbox}</span>
              </label>
            </div>
          ) : null}
          {errors.form ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {errors.form}
            </p>
          ) : null}
          {justSaved ? (
            <p className="text-sm font-medium text-teal" role="status">
              {t.saved}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? t.saving : isNew ? t.create : t.save}
          </Button>
        </Card>
      </form>

      <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
        <WorkflowPanel
          article={{ ...article, sourceCount: article.sources.length }}
          dates={dates}
          dirty={dirty}
          control={workflow}
        />
      </aside>
    </div>
  );
}
