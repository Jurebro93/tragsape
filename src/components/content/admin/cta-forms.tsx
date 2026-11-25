"use client";

import { useActionState, useState } from "react";
import {
  createCtaBlockAction,
  deleteCtaBlockAction,
  updateCtaBlockAction,
  type CtaBlockState,
  type DeleteCtaBlockState,
} from "@/app/admin/sekcije/actions";
import { CtaBlock } from "@/components/content/cta-block";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LIMITS } from "@/lib/content/limits";
import { CTA_VARIANTS, isCtaVariant, type CtaVariant } from "@/lib/content/types";
import { content } from "@/messages/hr/content";

/**
 * Obrasci za prodajne sekcije. Polja su upravljana, pa greška ne briše upisano, a ispod obrasca se
 * odmah vidi kako sekcija izgleda u članku.
 */

const t = content.admin.sections;

export type CtaFormBlock = {
  key: string;
  heading: string;
  body: string;
  buttonLabel: string;
  target: string;
  variant: CtaVariant;
  active: boolean;
};

const idle: CtaBlockState = { errors: {} };
const idleDelete: DeleteCtaBlockState = { error: null };

const blank: CtaFormBlock = {
  key: "",
  heading: "",
  body: "",
  buttonLabel: "",
  target: "/izradi",
  variant: "butter",
  active: true,
};

function Fields({
  idPrefix,
  values,
  errors,
  keyLocked,
  onChange,
}: {
  idPrefix: string;
  values: CtaFormBlock;
  errors: CtaBlockState["errors"];
  keyLocked: boolean;
  onChange: (next: CtaFormBlock) => void;
}) {
  const set = <Key extends keyof CtaFormBlock>(key: Key, value: CtaFormBlock[Key]) =>
    onChange({ ...values, [key]: value });
  return (
    <>
      <Field
        label={t.fields.key}
        htmlFor={`${idPrefix}-kljuc`}
        hint={keyLocked ? t.fields.keyLocked : t.fields.keyHint}
        error={errors.key}
      >
        <Input
          id={`${idPrefix}-kljuc`}
          name={keyLocked ? undefined : "key"}
          value={values.key}
          readOnly={keyLocked}
          required
          maxLength={LIMITS.ctaKey}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono text-[15px] read-only:bg-line read-only:text-plum-soft"
          onChange={(event) => set("key", event.target.value)}
        />
      </Field>
      <Field label={t.fields.heading} htmlFor={`${idPrefix}-naslov`} error={errors.heading}>
        <Input
          id={`${idPrefix}-naslov`}
          name="heading"
          value={values.heading}
          required
          maxLength={LIMITS.ctaHeading}
          onChange={(event) => set("heading", event.target.value)}
        />
      </Field>
      <Field label={t.fields.body} htmlFor={`${idPrefix}-tekst`} error={errors.body} optional>
        <Textarea
          id={`${idPrefix}-tekst`}
          name="body"
          value={values.body}
          maxLength={LIMITS.ctaBody}
          className="min-h-24"
          onChange={(event) => set("body", event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.fields.buttonLabel} htmlFor={`${idPrefix}-gumb`} error={errors.buttonLabel}>
          <Input
            id={`${idPrefix}-gumb`}
            name="button_label"
            value={values.buttonLabel}
            required
            maxLength={LIMITS.ctaButton}
            onChange={(event) => set("buttonLabel", event.target.value)}
          />
        </Field>
        <Field label={t.fields.variant} htmlFor={`${idPrefix}-izgled`} error={errors.variant}>
          <Select
            id={`${idPrefix}-izgled`}
            name="variant"
            value={values.variant}
            onChange={(event) => {
              if (isCtaVariant(event.target.value)) {
                set("variant", event.target.value);
              }
            }}
          >
            {CTA_VARIANTS.map((variant) => (
              <option key={variant} value={variant}>
                {t.variants[variant]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t.fields.target} htmlFor={`${idPrefix}-odrediste`} hint={t.fields.targetHint} error={errors.target}>
        <Input
          id={`${idPrefix}-odrediste`}
          name="target"
          value={values.target}
          required
          maxLength={LIMITS.ctaTarget}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono text-[15px]"
          onChange={(event) => set("target", event.target.value)}
        />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          name="active"
          checked={values.active}
          className="mt-0.5 size-6 shrink-0 accent-teal"
          onChange={(event) => set("active", event.target.checked)}
        />
        <span className="flex flex-col">
          <span className="font-bold">{t.fields.active}</span>
          <span className="text-sm text-plum-soft">{t.fields.activeHint}</span>
        </span>
      </label>
    </>
  );
}

function Preview({ values }: { values: CtaFormBlock }) {
  if (values.heading.trim() === "" || values.buttonLabel.trim() === "") {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-plum-soft">{t.preview}</p>
      <CtaBlock
        id={`pregled-sekcije-${values.key || "nova"}`}
        articleSlug={null}
        block={{
          key: values.key,
          heading: values.heading,
          body: values.body.trim() === "" ? null : values.body,
          buttonLabel: values.buttonLabel,
          target: values.target.startsWith("/") ? values.target : "/",
          variant: values.variant,
        }}
      />
    </div>
  );
}

function Feedback({ state, done }: { state: CtaBlockState; done: string }) {
  if (state.errors.form) {
    return (
      <p className="text-sm font-medium text-danger" role="alert">
        {state.errors.form}
      </p>
    );
  }
  return state.savedAt !== undefined ? (
    <p className="text-sm font-medium text-teal" role="status">
      {done}
    </p>
  ) : null;
}

export function NewCtaBlockForm() {
  const [state, action, pending] = useActionState(createCtaBlockAction, idle);
  // Nakon uspješnog dodavanja obrazac kreće prazan.
  return <NewCtaBlockFields key={state.savedAt ?? 0} state={state} action={action} pending={pending} />;
}

function NewCtaBlockFields({
  state,
  action,
  pending,
}: {
  state: CtaBlockState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [values, setValues] = useState<CtaFormBlock>(blank);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Fields idPrefix="nova-sekcija" values={values} errors={state.errors} keyLocked={false} onChange={setValues} />
      <Preview values={values} />
      <Feedback state={state} done={t.created} />
      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? t.saving : t.create}
      </Button>
    </form>
  );
}

export function EditCtaBlockForm({ block }: { block: CtaFormBlock }) {
  const [state, action, pending] = useActionState(updateCtaBlockAction.bind(null, block.key), idle);
  const [values, setValues] = useState<CtaFormBlock>(block);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Fields
        idPrefix={`sekcija-${block.key}`}
        values={values}
        errors={state.errors}
        keyLocked
        onChange={setValues}
      />
      <Preview values={values} />
      <Feedback state={state} done={t.saved} />
      <Button type="submit" size="md" variant="secondary" disabled={pending} className="self-start">
        {pending ? t.saving : t.save}
      </Button>
    </form>
  );
}

export function DeleteCtaBlockForm({ blockKey }: { blockKey: string }) {
  const [state, action, pending] = useActionState(deleteCtaBlockAction.bind(null, blockKey), idleDelete);
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button type="button" variant="quiet" className="self-start text-danger hover:text-danger" onClick={() => setAsking(true)}>
        {t.delete}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border-2 border-line p-4">
      <p className="text-[15px] font-semibold">{t.deleteConfirm}</p>
      {state.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="md" disabled={pending} className="bg-danger text-white hover:bg-danger">
          {t.deleteYes}
        </Button>
        <Button type="button" size="md" variant="secondary" onClick={() => setAsking(false)}>
          {t.deleteNo}
        </Button>
      </div>
    </form>
  );
}
