"use server";

import { updateTag } from "next/cache";
import { CTA_KEY_PATTERN, LIMITS } from "@/lib/content/limits";
import { parseCtaBlockForm, type CtaBlockFormErrors } from "@/lib/content/validation";
import { content } from "@/messages/hr/content";
import { requireAdmin } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Akcije admina za prodajne sekcije. Svaka prvo traži admina i radi klijentom sa sesijom (RLS).
 * Nakon izmjene osvježavaju se svi članci, jer se sekcija može prikazivati u bilo kojem.
 */

const text = content.admin.sections;
const UNIQUE_VIOLATION = "23505";

export type CtaBlockState = {
  errors: CtaBlockFormErrors;
  /** Vrijeme zadnjeg uspješnog spremanja. */
  savedAt?: number;
};

export type DeleteCtaBlockState = { error: string | null };

function isKey(value: string): boolean {
  return value.length <= LIMITS.ctaKey && CTA_KEY_PATTERN.test(value);
}

export async function createCtaBlockAction(_previous: CtaBlockState, formData: FormData): Promise<CtaBlockState> {
  await requireAdmin("/admin/sekcije");
  const parsed = parseCtaBlockForm(formData, null);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }
  const values = parsed.values;
  const supabase = await createSessionClient();
  const { error } = await supabase.from("cta_blocks").insert({
    key: values.key,
    heading: values.heading,
    body: values.body,
    button_label: values.buttonLabel,
    target: values.target,
    variant: values.variant,
    active: values.active,
  });
  if (error) {
    return error.code === UNIQUE_VIOLATION
      ? { errors: { key: text.errors.keyTaken, form: text.errors.fix } }
      : { errors: { form: text.errors.generic } };
  }
  updateTag("articles");
  return { errors: {}, savedAt: Date.now() };
}

/** Izmjena sekcije. Ključ dolazi iz adrese akcije, ne iz obrasca, pa se ne može promijeniti. */
export async function updateCtaBlockAction(
  key: string,
  _previous: CtaBlockState,
  formData: FormData,
): Promise<CtaBlockState> {
  await requireAdmin("/admin/sekcije");
  if (!isKey(key)) {
    return { errors: { form: text.errors.notFound } };
  }
  const parsed = parseCtaBlockForm(formData, key);
  if (!parsed.ok) {
    return { errors: parsed.errors };
  }
  const values = parsed.values;
  const supabase = await createSessionClient();
  const { data: updated, error } = await supabase
    .from("cta_blocks")
    .update({
      heading: values.heading,
      body: values.body,
      button_label: values.buttonLabel,
      target: values.target,
      variant: values.variant,
      active: values.active,
    })
    .eq("key", key)
    .select("key");
  if (error) {
    return { errors: { form: text.errors.generic } };
  }
  if (!updated || updated.length === 0) {
    return { errors: { form: text.errors.notFound } };
  }
  updateTag("articles");
  return { errors: {}, savedAt: Date.now() };
}

/** Brisanje sekcije; dodjele člancima nestaju s njom (kaskadno u bazi). */
export async function deleteCtaBlockAction(
  key: string,
  _previous: DeleteCtaBlockState,
  _formData: FormData,
): Promise<DeleteCtaBlockState> {
  await requireAdmin("/admin/sekcije");
  if (!isKey(key)) {
    return { error: text.errors.notFound };
  }
  const supabase = await createSessionClient();
  const { data: removed, error } = await supabase.from("cta_blocks").delete().eq("key", key).select("key");
  if (error) {
    return { error: text.errors.generic };
  }
  if (!removed || removed.length === 0) {
    return { error: text.errors.notFound };
  }
  updateTag("articles");
  return { error: null };
}
