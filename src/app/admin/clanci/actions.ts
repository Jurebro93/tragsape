"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, LIMITS } from "@/lib/content/limits";
import { reviewedContentChanged, sameSources } from "@/lib/content/normalize";
import { CTA_SLOTS, isArticleStatus, type CtaSlot } from "@/lib/content/types";
import {
  parseArticleForm,
  type ArticleFormErrors,
  type ArticleFormValues,
  type SourceFormValues,
} from "@/lib/content/validation";
import {
  editNeedsConfirmation,
  intentPermitted,
  isWorkflowIntent,
  reviewAfterEdit,
  vetReviewMissing,
  type ReviewState,
} from "@/lib/content/workflow";
import { zagrebDay } from "@/lib/time";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { articleTag } from "@/server/content/articles";
import { SOURCE_COLUMNS } from "@/server/content/view";
import type { Database } from "@/server/supabase/database.types";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Akcije admina za članke. Svaka prvo traži admina, a zatim radi klijentom sa sesijom, pa isto
 * pravilo provjerava i RLS. Objavu bez odobrenja ili bez potrebnog pregleda odbija sama baza
 * (`articles_publish_gate`); ovdje se to odbijanje samo prevodi u razumljivu poruku.
 */

type Client = SupabaseClient<Database>;
type ArticleUpdate = Database["public"]["Tables"]["articles"]["Update"];

const editorText = content.admin.editor;
const workflowText = content.admin.workflow;

/** Postgres: prekršeno ograničenje `check`, odnosno jedinstvenost. */
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

export type SaveArticleState = {
  errors: ArticleFormErrors;
  /** Vrijeme zadnjeg uspješnog spremanja; sučelje po njemu zna da treba krenuti od spremljenog. */
  savedAt?: number;
  /** Izmjena briše pregled ili odobrenje, a potvrda nije stigla. */
  needsConfirm?: boolean;
};

export type WorkflowState = {
  error: string | null;
  done?: string;
  /** Vrijeme odgovora; sučelje po njemu zna je li poruka novija od zadnjeg spremanja. */
  at?: number;
};

/** Javne stranice se osvježavaju odmah nakon izmjene, bez deploya. */
function refreshArticle(...slugs: string[]) {
  updateTag("articles");
  for (const slug of new Set(slugs)) {
    updateTag(articleTag(slug));
  }
  updateTag("sitemap");
}

/** Upisuje izvore zadanim redom i briše one kojih više nema. Vraća false ako baza odbije. */
async function syncSources(
  supabase: Client,
  articleId: string,
  sources: readonly SourceFormValues[],
  existingIds: ReadonlySet<string>,
): Promise<boolean> {
  // Identifikator iz obrasca vrijedi samo ako pripada ovom članku; novi retci dobivaju svoj ovdje.
  const rows = sources.map((source, position) => ({
    id: source.id !== null && existingIds.has(source.id) ? source.id : crypto.randomUUID(),
    article_id: articleId,
    position,
    claim: source.claim,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    accessed_on: source.accessedOn,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("article_sources").upsert(rows, { onConflict: "id" });
    if (error) {
      return false;
    }
  }
  let removal = supabase.from("article_sources").delete().eq("article_id", articleId);
  if (rows.length > 0) {
    removal = removal.not("id", "in", `(${rows.map((row) => row.id).join(",")})`);
  }
  const { error } = await removal;
  return !error;
}

/** Dodjeljuje sekcije mjestima; mjesto bez sekcije se briše. Vraća false ako baza odbije. */
async function syncCta(
  supabase: Client,
  articleId: string,
  cta: Record<CtaSlot, string | null>,
): Promise<boolean> {
  const assigned = CTA_SLOTS.flatMap((slot) => {
    const key = cta[slot];
    return key === null ? [] : [{ article_id: articleId, slot, cta_key: key }];
  });
  const empty = CTA_SLOTS.filter((slot) => cta[slot] === null);
  if (assigned.length > 0) {
    const { error } = await supabase.from("article_cta").upsert(assigned, { onConflict: "article_id,slot" });
    if (error) {
      return false;
    }
  }
  if (empty.length > 0) {
    const { error } = await supabase.from("article_cta").delete().eq("article_id", articleId).in("slot", empty);
    if (error) {
      return false;
    }
  }
  return true;
}

async function createArticle(supabase: Client, values: ArticleFormValues): Promise<SaveArticleState> {
  const { data: created, error } = await supabase
    .from("articles")
    .insert({
      slug: values.slug,
      cluster: values.cluster,
      title: values.title,
      excerpt: values.excerpt,
      body_md: values.bodyMd,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      needs_vet_review: values.needsVetReview,
    })
    .select("id, slug")
    .single();
  if (error || !created) {
    return error?.code === UNIQUE_VIOLATION
      ? { errors: { slug: editorText.errors.slugTaken, form: editorText.errors.fix } }
      : { errors: { form: editorText.errors.generic } };
  }
  const complete =
    (await syncSources(supabase, created.id, values.sources, new Set())) &&
    (await syncCta(supabase, created.id, values.cta));
  if (!complete) {
    // Novi članak bez svojih izvora ne ostaje napola spremljen: briše se, a obrazac ostaje kakav je bio.
    await supabase.from("articles").delete().eq("id", created.id);
    return { errors: { form: editorText.errors.generic } };
  }
  refreshArticle(created.slug);
  redirect(`/admin/clanci/${created.id}`);
}

async function updateArticle(
  supabase: Client,
  id: string,
  values: ArticleFormValues,
  confirmed: boolean,
): Promise<SaveArticleState> {
  const [article, sources, slots] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id, slug, cluster, title, excerpt, body_md, seo_title, seo_description, status, needs_vet_review, vet_reviewed_at, owner_approved_at, published_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("article_sources")
      .select(SOURCE_COLUMNS)
      .eq("article_id", id)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("article_cta").select("slot, cta_key").eq("article_id", id),
  ]);
  if (article.error || sources.error || slots.error) {
    return { errors: { form: editorText.errors.generic } };
  }
  const current = article.data;
  if (!current || !isArticleStatus(current.status)) {
    return { errors: { form: editorText.errors.notFound } };
  }

  // Nakon prve objave adresa se više ne mijenja, što god stiglo iz obrasca.
  const slug = current.published_at === null ? values.slug : current.slug;
  const savedSources = sources.data.map((source) => ({
    claim: source.claim,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    accessedOn: source.accessed_on,
  }));
  const sourcesChanged = !sameSources(savedSources, values.sources);
  const contentChanged = reviewedContentChanged(
    { title: current.title, excerpt: current.excerpt, bodyMd: current.body_md, sources: savedSources },
    { title: values.title, excerpt: values.excerpt, bodyMd: values.bodyMd, sources: values.sources },
  );

  const review: ReviewState = {
    status: current.status,
    needsVetReview: current.needs_vet_review,
    vetReviewedAt: current.vet_reviewed_at,
    ownerApprovedAt: current.owner_approved_at,
  };
  const effect = reviewAfterEdit(review, { needsVetReview: values.needsVetReview, contentChanged });
  if (editNeedsConfirmation(review, effect) && !confirmed) {
    // Pregledan tekst se ne mijenja neprimjetno: bez izričite potvrde se ništa ne sprema.
    return { errors: { form: editorText.confirm.required }, needsConfirm: true };
  }

  const patch: ArticleUpdate = {
    slug,
    cluster: values.cluster,
    title: values.title,
    excerpt: values.excerpt,
    body_md: values.bodyMd,
    seo_title: values.seoTitle,
    seo_description: values.seoDescription,
    needs_vet_review: values.needsVetReview,
    status: effect.status,
    ...(effect.clearVetReview ? { vet_reviewed_by: null, vet_reviewed_at: null } : {}),
    ...(effect.clearOwnerApproval ? { owner_approved_at: null } : {}),
  };
  const rowChanged =
    effect.clearVetReview ||
    effect.clearOwnerApproval ||
    slug !== current.slug ||
    values.cluster !== current.cluster ||
    values.title !== current.title ||
    values.excerpt !== current.excerpt ||
    values.bodyMd !== current.body_md ||
    values.seoTitle !== current.seo_title ||
    values.seoDescription !== current.seo_description ||
    values.needsVetReview !== current.needs_vet_review ||
    effect.status !== current.status;

  // Redak članka ide prvi: ako izmjena vraća članak na pregled, s objave se povlači prije nego
  // što se izvori promijene. Izmjena samih prodajnih sekcija ne dira datum „Ažurirano".
  if (rowChanged || sourcesChanged) {
    const { data: updated, error } = await supabase
      .from("articles")
      .update(patch)
      .eq("id", id)
      .eq("status", current.status)
      .select("id");
    if (error) {
      return error.code === UNIQUE_VIOLATION
        ? { errors: { slug: editorText.errors.slugTaken, form: editorText.errors.fix } }
        : { errors: { form: editorText.errors.generic } };
    }
    if (!updated || updated.length === 0) {
      return { errors: { form: workflowText.errors.stale } };
    }
  }

  let failure: string | null = null;
  if (sourcesChanged) {
    const existingIds = new Set(sources.data.map((source) => source.id));
    if (!(await syncSources(supabase, id, values.sources, existingIds))) {
      failure = editorText.errors.sourcesFailed;
    }
  }
  const savedCta = new Map(slots.data.map((entry) => [entry.slot, entry.cta_key]));
  const ctaChanged = CTA_SLOTS.some((slot) => (savedCta.get(slot) ?? null) !== values.cta[slot]);
  if (failure === null && ctaChanged && !(await syncCta(supabase, id, values.cta))) {
    failure = editorText.errors.ctaFailed;
  }

  refreshArticle(current.slug, slug);
  return failure === null ? { errors: {}, savedAt: Date.now() } : { errors: { form: failure } };
}

/** Sprema novi članak (id je null) ili izmjene postojećeg, zajedno s izvorima i sekcijama. */
export async function saveArticleAction(
  id: string | null,
  _previous: SaveArticleState,
  formData: FormData,
): Promise<SaveArticleState> {
  await requireAdmin(id === null ? "/admin/clanci/novi" : `/admin/clanci/${id}`);
  if (id !== null && !isUuid(id)) {
    return { errors: { form: editorText.errors.notFound } };
  }
  const parsed = parseArticleForm(formData, zagrebDay());
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }
  const values = parsed.values;
  const supabase = await createSessionClient();

  // Sekcija koja je u međuvremenu obrisana ne može se dodijeliti.
  const ctaKeys = [...new Set(CTA_SLOTS.flatMap((slot) => values.cta[slot] ?? []))];
  if (ctaKeys.length > 0) {
    const { data: known, error } = await supabase.from("cta_blocks").select("key").in("key", ctaKeys);
    if (error) {
      return { errors: { form: editorText.errors.generic } };
    }
    if (known.length !== ctaKeys.length) {
      return { errors: { cta: editorText.errors.ctaUnknown, form: editorText.errors.fix } };
    }
  }

  return id === null
    ? createArticle(supabase, values)
    : updateArticle(supabase, id, values, formData.get("confirm_reset") === "on");
}

/** Korak u tijeku objave: na pregled, pregled veterinara, odobrenje, objava, povlačenje. */
export async function transitionArticleAction(
  id: string,
  _previous: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  await requireAdmin(`/admin/clanci/${id}`);
  const intent = String(formData.get("intent") ?? "");
  if (!isUuid(id) || !isWorkflowIntent(intent)) {
    return { error: workflowText.errors.generic, at: Date.now() };
  }
  const supabase = await createSessionClient();
  const { data: row, error } = await supabase
    .from("articles")
    .select("id, slug, status, needs_vet_review, vet_reviewed_at, owner_approved_at, published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { error: workflowText.errors.generic, at: Date.now() };
  }
  if (!row || !isArticleStatus(row.status)) {
    return { error: workflowText.errors.stale, at: Date.now() };
  }
  const review: ReviewState = {
    status: row.status,
    needsVetReview: row.needs_vet_review,
    vetReviewedAt: row.vet_reviewed_at,
    ownerApprovedAt: row.owner_approved_at,
  };
  if (!intentPermitted(review, intent)) {
    return { error: workflowText.errors.stale, at: Date.now() };
  }

  const now = new Date().toISOString();
  let patch: ArticleUpdate;
  switch (intent) {
    case "submit_review":
      patch = { status: "in_review" };
      break;
    case "vet_review": {
      if (!row.needs_vet_review) {
        return { error: workflowText.errors.vetNotNeeded, at: Date.now() };
      }
      const name = String(formData.get("vet_name") ?? "").trim();
      if (name === "") {
        return { error: workflowText.errors.vetNameRequired, at: Date.now() };
      }
      if (name.length > LIMITS.vetName) {
        return { error: workflowText.errors.vetNameLong, at: Date.now() };
      }
      patch = { vet_reviewed_by: name, vet_reviewed_at: now };
      break;
    }
    case "approve":
      if (vetReviewMissing(review)) {
        return { error: workflowText.why.approveNeedsVet, at: Date.now() };
      }
      patch = { status: "approved", owner_approved_at: now };
      break;
    case "publish":
      // Što smije biti objavljeno, odlučuje baza; ovdje se samo pokušava.
      patch = { status: "published", published_at: row.published_at ?? now };
      break;
    case "unpublish":
      patch = { status: "approved" };
      break;
    case "to_draft":
      patch = { status: "draft", owner_approved_at: null };
      break;
  }

  const { data: updated, error: updateError } = await supabase
    .from("articles")
    .update(patch)
    .eq("id", id)
    .eq("status", row.status)
    .select("id");
  if (updateError) {
    if (updateError.code === CHECK_VIOLATION && intent === "publish") {
      if (vetReviewMissing(review)) {
        return { error: workflowText.errors.gateVet, at: Date.now() };
      }
      return {
        error: row.owner_approved_at === null ? workflowText.errors.gateOwner : workflowText.errors.gate,
        at: Date.now(),
      };
    }
    return { error: workflowText.errors.generic, at: Date.now() };
  }
  if (!updated || updated.length === 0) {
    return { error: workflowText.errors.stale, at: Date.now() };
  }

  refreshArticle(row.slug);
  return { error: null, done: workflowText.done[intent], at: Date.now() };
}
