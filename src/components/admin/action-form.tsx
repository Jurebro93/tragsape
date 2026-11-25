"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { adminPanel } from "@/messages/hr/admin-panel";
import type { AdminActionState } from "@/server/admin/forms";

/**
 * Obrasci admina. Polja dolaze kao djeca (iscrtana na poslužitelju), a ova komponenta dodaje
 * slanje, poruku o ishodu i stanje čekanja.
 *
 * Akcija se šalje ručno unutar prijelaza, a ne preko `action` obrasca: React bi inače nakon
 * svake akcije vratio polja na početne vrijednosti, pa bi admin nakon greške u provjeri
 * izgubio sve što je upisao. `action` ostaje postavljen da obrazac radi i prije hidracije.
 */

const t = adminPanel.common;

export type AdminAction = (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;

const idle: AdminActionState = { error: null };

function useAdminAction(action: AdminAction, options: { confirm?: string; resetOnDone?: boolean }) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done && options.resetOnDone) {
      formRef.current?.reset();
    }
  }, [state, options.resetOnDone]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (options.confirm && !window.confirm(options.confirm)) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, dispatch, pending, formRef, onSubmit };
}

export function FormFeedback({ state, done }: { state: AdminActionState; done?: string }) {
  if (state.error) {
    return (
      <p className="text-sm font-medium text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  return state.done && done ? (
    <p className="text-sm font-medium text-teal" role="status">
      {done}
    </p>
  ) : null;
}

/** Obrazac s poljima, porukom o ishodu i gumbom za slanje. */
export function ActionForm({
  action,
  children,
  submitLabel = t.save,
  pendingLabel = t.saving,
  doneLabel = t.saved,
  resetOnDone = false,
  variant = "primary",
  className,
  footer,
}: {
  action: AdminAction;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  doneLabel?: string;
  /** Nakon uspjeha isprazni polja (obrasci za dodavanje). */
  resetOnDone?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  /** Dodatak uz gumb, npr. poveznica za odustajanje. */
  footer?: ReactNode;
}) {
  const { state, dispatch, pending, formRef, onSubmit } = useAdminAction(action, { resetOnDone });
  return (
    <form ref={formRef} action={dispatch} onSubmit={onSubmit} className={cn("flex flex-col gap-4", className)}>
      {children}
      <FormFeedback state={state} done={doneLabel} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" size="md" variant={variant} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}

/**
 * Jedna radnja kao gumb (sakrij, vrati, obriši, označi isplaćenim). Greška se ispisuje ispod
 * gumba; `confirm` traži potvrdu prije radnji koje se ne poništavaju jednim klikom.
 */
export function ActionButton({
  action,
  label,
  confirm,
  variant = "secondary",
  danger = false,
  children,
}: {
  action: AdminAction;
  label: string;
  confirm?: string;
  variant?: "primary" | "secondary";
  danger?: boolean;
  /** Dodatna polja uz radnju, npr. bilješka. */
  children?: ReactNode;
}) {
  const { state, dispatch, pending, formRef, onSubmit } = useAdminAction(action, { confirm });
  return (
    <form ref={formRef} action={dispatch} onSubmit={onSubmit} className="flex flex-col items-start gap-1.5">
      {children}
      <Button
        type="submit"
        size="md"
        variant={variant}
        disabled={pending}
        className={cn("min-h-11 whitespace-nowrap px-4", danger && "border-danger! text-danger!")}
      >
        {label}
      </Button>
      <FormFeedback state={state} />
    </form>
  );
}
