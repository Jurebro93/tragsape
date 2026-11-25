import { z } from "zod";
import { isInternalPath } from "@/lib/content/attribution";
import { CTA_KEY_PATTERN, isUuid, LIMITS } from "@/lib/content/limits";
import { cleanBody, normalizeNewlines } from "@/lib/content/normalize";
import { isValidSlug } from "@/lib/content/slug";
import {
  CLUSTERS,
  CTA_SLOTS,
  CTA_VARIANTS,
  ctaFieldName,
  type Cluster,
  type CtaSlot,
  type CtaVariant,
} from "@/lib/content/types";
import { content } from "@/messages/hr/content";

/**
 * Provjera obrazaca admina za članke i prodajne sekcije. Čista logika: iste granice koristi i
 * sučelje (maxLength), a poslužitelj je jedini koji odlučuje.
 */

const editorErrors = content.admin.editor.errors;
const sectionErrors = content.admin.sections.errors;

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .overwrite(normalizeNewlines)
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === "" ? null : value));

/** Baza traži adresu koja počinje s http:// ili https:// (mala slova). */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value) && URL.canParse(value);
}

const sourceSchema = z.object({
  claim: optionalText(LIMITS.sourceClaim, editorErrors.sourceClaimLong),
  title: z
    .string()
    .trim()
    .min(1, editorErrors.sourceTitleRequired)
    .max(LIMITS.sourceTitle, editorErrors.sourceTitleLong),
  url: z.string().trim().max(LIMITS.sourceUrl, editorErrors.sourceUrlLong).refine(isHttpUrl, editorErrors.sourceUrlInvalid),
  publisher: optionalText(LIMITS.sourcePublisher, editorErrors.sourcePublisherLong),
  accessedOn: z.iso.date(editorErrors.sourceDateInvalid),
});

export type SourceField = keyof z.infer<typeof sourceSchema>;

export type SourceFormValues = z.infer<typeof sourceSchema> & {
  /** Postojeći zapis ili identifikator koji je dodijelilo sučelje; null ako nije valjan UUID. */
  id: string | null;
};

const articleSchema = z.object({
  title: z.string().trim().min(1, editorErrors.titleRequired).max(LIMITS.title, editorErrors.titleLong),
  slug: z.string().trim().refine(isValidSlug, editorErrors.slugInvalid),
  cluster: z.enum(CLUSTERS, editorErrors.clusterRequired),
  excerpt: optionalText(LIMITS.excerpt, editorErrors.excerptLong),
  body: z.string().overwrite(cleanBody).max(LIMITS.body, editorErrors.bodyLong),
  seoTitle: optionalText(LIMITS.seoTitle, editorErrors.seoTitleLong),
  seoDescription: optionalText(LIMITS.seoDescription, editorErrors.seoDescriptionLong),
});

export type ArticleField = keyof z.infer<typeof articleSchema>;

export type ArticleFormValues = {
  title: string;
  slug: string;
  cluster: Cluster;
  excerpt: string | null;
  bodyMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  needsVetReview: boolean;
  sources: SourceFormValues[];
  cta: Record<CtaSlot, string | null>;
};

export type ArticleFormErrors = Partial<Record<ArticleField | "sources" | "cta" | "form", string>> & {
  /** Greške pojedinog izvora, po identifikatoru retka iz sučelja. */
  sourceRows?: Record<string, Partial<Record<SourceField, string>>>;
};

export type ParsedArticleForm =
  | { ok: true; values: ArticleFormValues }
  | { ok: false; errors: ArticleFormErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function firstIssues<Field extends string>(issues: readonly z.core.$ZodIssue[]): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      errors[field as Field] ??= issue.message;
    }
  }
  return errors;
}

/**
 * Čita obrazac članka. `today` je današnji datum u Zagrebu (YYYY-MM-DD): izvor ne može biti
 * pregledan u budućnosti.
 */
export function parseArticleForm(formData: FormData, today: string): ParsedArticleForm {
  const errors: ArticleFormErrors = {};
  const parsed = articleSchema.safeParse({
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    cluster: text(formData, "cluster"),
    excerpt: text(formData, "excerpt"),
    body: text(formData, "body_md"),
    seoTitle: text(formData, "seo_title"),
    seoDescription: text(formData, "seo_description"),
  });
  if (!parsed.success) {
    Object.assign(errors, firstIssues<ArticleField>(parsed.error.issues));
  }

  const sources: SourceFormValues[] = [];
  let rawSources: unknown = [];
  try {
    rawSources = JSON.parse(text(formData, "sources_json") || "[]");
  } catch {
    rawSources = null;
  }
  if (!Array.isArray(rawSources)) {
    errors.sources = editorErrors.sourcesInvalid;
  } else if (rawSources.length > LIMITS.sources) {
    errors.sources = editorErrors.sourcesTooMany;
  } else {
    rawSources.forEach((raw: unknown, index) => {
      const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const rowId = typeof record.id === "string" ? record.id : String(index);
      const result = sourceSchema.safeParse(record);
      const rowErrors = result.success ? {} : firstIssues<SourceField>(result.error.issues);
      if (result.success && result.data.accessedOn > today) {
        rowErrors.accessedOn = editorErrors.sourceDateFuture;
      }
      if (Object.keys(rowErrors).length > 0) {
        errors.sourceRows = { ...errors.sourceRows, [rowId]: rowErrors };
      } else if (result.success) {
        sources.push({ ...result.data, id: isUuid(rowId) ? rowId.toLowerCase() : null });
      }
    });
  }

  const cta = {} as Record<CtaSlot, string | null>;
  for (const slot of CTA_SLOTS) {
    const key = text(formData, ctaFieldName(slot)).trim();
    if (key !== "" && (key.length > LIMITS.ctaKey || !CTA_KEY_PATTERN.test(key))) {
      errors.cta = editorErrors.ctaUnknown;
    }
    cta[slot] = key === "" ? null : key;
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, errors: { ...errors, form: editorErrors.fix } };
  }
  return {
    ok: true,
    values: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      cluster: parsed.data.cluster,
      excerpt: parsed.data.excerpt,
      bodyMd: parsed.data.body,
      seoTitle: parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription,
      needsVetReview: formData.get("needs_vet_review") === "on",
      sources,
      cta,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Prodajne sekcije
// ---------------------------------------------------------------------------------------------

const ctaBlockSchema = z.object({
  key: z
    .string()
    .trim()
    .refine((value) => value.length <= LIMITS.ctaKey && CTA_KEY_PATTERN.test(value), sectionErrors.keyInvalid),
  heading: z
    .string()
    .trim()
    .min(1, sectionErrors.headingRequired)
    .max(LIMITS.ctaHeading, sectionErrors.headingLong),
  body: optionalText(LIMITS.ctaBody, sectionErrors.bodyLong),
  buttonLabel: z
    .string()
    .trim()
    .min(1, sectionErrors.buttonRequired)
    .max(LIMITS.ctaButton, sectionErrors.buttonLong),
  target: z
    .string()
    .trim()
    .max(LIMITS.ctaTarget, sectionErrors.targetLong)
    .refine(isInternalPath, sectionErrors.targetInvalid),
  variant: z.enum(CTA_VARIANTS, sectionErrors.variantInvalid),
});

export type CtaBlockField = keyof z.infer<typeof ctaBlockSchema>;

export type CtaBlockFormValues = {
  key: string;
  heading: string;
  body: string | null;
  buttonLabel: string;
  target: string;
  variant: CtaVariant;
  active: boolean;
};

export type CtaBlockFormErrors = Partial<Record<CtaBlockField | "form", string>>;

export type ParsedCtaBlockForm =
  | { ok: true; values: CtaBlockFormValues }
  | { ok: false; errors: CtaBlockFormErrors };

/** Čita obrazac sekcije. Pri izmjeni se ključ ne čita iz obrasca nego ga zadaje poslužitelj. */
export function parseCtaBlockForm(formData: FormData, existingKey: string | null): ParsedCtaBlockForm {
  const parsed = ctaBlockSchema.safeParse({
    key: existingKey ?? text(formData, "key"),
    heading: text(formData, "heading"),
    body: text(formData, "body"),
    buttonLabel: text(formData, "button_label"),
    target: text(formData, "target"),
    variant: text(formData, "variant"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: { ...firstIssues<CtaBlockField>(parsed.error.issues), form: sectionErrors.fix },
    };
  }
  return { ok: true, values: { ...parsed.data, active: formData.get("active") === "on" } };
}
