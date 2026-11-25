"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-values";
import {
  deleteMemorialAction,
  saveFamilyAction,
  setGuestbookModeAction,
  setThemeAction,
  setVisibilityAction,
  type ActionState,
} from "@/app/moji-ljubimci/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { GuestbookMode, Visibility } from "@/lib/memorial";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { account } from "@/messages/hr/account";
import { livada } from "@/messages/hr/livada";

const idle: ActionState = { error: null };

function Feedback({ state, done }: { state: ActionState; done: string }) {
  if (state.error) {
    return (
      <p className="text-sm font-medium text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  return state.done ? (
    <p className="text-sm font-medium text-teal" role="status">
      {done}
    </p>
  ) : null;
}

export function GuestbookModeForm({ memorialId, mode }: { memorialId: string; mode: GuestbookMode }) {
  const [state, action, pending] = useActionState(setGuestbookModeAction.bind(null, memorialId), idle);
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-3">
      <Field label={account.messages.mode} htmlFor="guestbook-mode">
        <Select id="guestbook-mode" name="mode" defaultValue={mode}>
          <option value="premoderate">{account.messages.modes.premoderate}</option>
          <option value="open">{account.messages.modes.open}</option>
          <option value="off">{account.messages.modes.off}</option>
        </Select>
      </Field>
      <Feedback state={state} done={account.messages.modeSaved} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        Spremi
      </Button>
    </form>
  );
}

export function VisibilityForm({ memorialId, visibility }: { memorialId: string; visibility: Visibility }) {
  const [state, action, pending] = useActionState(setVisibilityAction.bind(null, memorialId), idle);
  const options: Array<{ value: Visibility; label: string; body: string }> = [
    { value: "public", label: account.visibility.public, body: account.privacy.public },
    { value: "unlisted", label: account.visibility.unlisted, body: account.privacy.unlisted },
    { value: "private", label: account.visibility.private, body: account.privacy.private },
  ];
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-bold">{account.privacy.label}</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-3.5 has-checked:border-teal has-checked:bg-mint"
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              defaultChecked={visibility === option.value}
              className="mt-0.5 size-5 accent-teal"
            />
            <span className="flex flex-col">
              <span className="font-bold">{option.label}</span>
              <span className="text-sm text-plum-soft">{option.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Feedback state={state} done={account.privacy.saved} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {account.privacy.save}
      </Button>
    </form>
  );
}

export function DeleteMemorialForm({ memorialId }: { memorialId: string }) {
  const [state, action, pending] = useActionState(deleteMemorialAction.bind(null, memorialId), idle);
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-3">
      <Field label={account.danger.confirmLabel} htmlFor="confirm-delete" error={state.error}>
        <Input id="confirm-delete" name="confirm" autoComplete="off" required />
      </Field>
      <Button
        type="submit"
        size="md"
        disabled={pending}
        className="bg-danger text-white hover:bg-danger"
        variant="primary"
      >
        {account.danger.action}
      </Button>
    </form>
  );
}

export function FamilyForm({
  family,
}: {
  family: { slug: string; title: string; intro: string | null; isPublic: boolean } | null;
}) {
  const [state, action, pending] = useActionState(saveFamilyAction, idle);
  const text = livada.family.manage;
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-3">
      <Field label={text.name} htmlFor="family-title" error={state.error}>
        <Input
          id="family-title"
          name="title"
          required
          maxLength={80}
          defaultValue={family?.title ?? ""}
          placeholder={text.namePlaceholder}
        />
      </Field>
      <Field label={text.intro} htmlFor="family-intro" optional>
        <Textarea id="family-intro" name="intro" maxLength={400} defaultValue={family?.intro ?? ""} className="min-h-24" />
      </Field>
      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={family?.isPublic ?? true}
          className="size-6 shrink-0 accent-teal"
        />
        <span>{text.visible}</span>
      </label>
      {state.done ? (
        <p className="text-sm font-medium text-teal" role="status">
          {text.saved}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {text.save}
      </Button>
    </form>
  );
}

export function ThemeForm({ memorialId, theme }: { memorialId: string; theme: ThemeKey }) {
  const [state, action, pending] = useActionState(setThemeAction.bind(null, memorialId), idle);
  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{account.theme.title}</legend>
        {THEMES.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-line p-3.5 has-checked:border-teal has-checked:bg-mint"
          >
            <input
              type="radio"
              name="theme"
              value={item.key}
              defaultChecked={theme === item.key}
              className="size-5 accent-teal"
            />
            <span className="flex flex-1 flex-col">
              <span className="font-bold">{item.label}</span>
              <span className="text-sm text-plum-soft">{item.note}</span>
            </span>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {item.swatches.map((color) => (
                <span key={color} className="size-6 rounded-full border border-line" style={{ background: color }} />
              ))}
            </span>
          </label>
        ))}
      </fieldset>
      <Feedback state={state} done={account.theme.saved} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {account.theme.save}
      </Button>
    </form>
  );
}
