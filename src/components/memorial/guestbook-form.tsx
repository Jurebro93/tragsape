"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Turnstile, turnstileEnabled } from "@/components/ui/turnstile";
import { useHydrated } from "@/lib/use-hydrated";
import { common } from "@/messages/hr/common";
import { memorial as messages } from "@/messages/hr/memorial";

type Result =
  | { kind: "idle" }
  | { kind: "sent"; status: "pending" | "approved" }
  | { kind: "demo" }
  | { kind: "error"; message: string };

/**
 * Obrazac za poruku u knjizi sjećanja. Skriveno polje `website` je zamka za robote.
 * Na primjeru spomena (`demo`) ništa se ne šalje: obrazac samo pokazuje kako izgleda.
 */
export function GuestbookForm({
  memorialId,
  shareKey,
  demo = false,
}: {
  memorialId: string;
  shareKey: string | null;
  demo?: boolean;
}) {
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const startedAt = useRef<number>(0);
  const hydrated = useHydrated();
  const [token, setToken] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo) {
      setResult({ kind: "demo" });
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch("/api/poruke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memorialId,
          shareKey,
          name: form.get("name"),
          message: form.get("message"),
          email: form.get("email") ?? "",
          website: form.get("website") ?? "",
          startedAt: startedAt.current || Date.now(),
          turnstileToken: token,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string; message?: string };
      if (response.ok && (data.status === "pending" || data.status === "approved")) {
        setResult({ kind: "sent", status: data.status });
      } else if (data.error === "rate") {
        setResult({ kind: "error", message: common.errors.tooFast });
      } else {
        setResult({ kind: "error", message: data.message ?? messages.guestbook.error });
      }
    } catch {
      setResult({ kind: "error", message: messages.guestbook.error });
    } finally {
      setBusy(false);
    }
  }

  if (result.kind === "demo") {
    return (
      <p className="rounded-3xl bg-mint px-5 py-4 font-medium" role="status">
        {messages.guestbook.demoSent}
      </p>
    );
  }

  if (result.kind === "sent") {
    return (
      <p className="rounded-3xl bg-mint px-5 py-4 font-medium" role="status">
        {result.status === "approved" ? messages.guestbook.published : messages.guestbook.pending}
      </p>
    );
  }

  return (
    <form
      method="post"
      onSubmit={submit}
      onFocus={() => {
        if (startedAt.current === 0) {
          startedAt.current = Date.now();
        }
      }}
      id="napisi"
      className="flex scroll-mt-6 flex-col gap-4 rounded-3xl bg-white p-5"
    >
      <h3 className="text-xl font-extrabold">{messages.guestbook.title}</h3>
      {demo ? <p className="text-sm text-plum-soft">{messages.guestbook.demoNote}</p> : null}
      <Field label={messages.guestbook.name} htmlFor="gb-name">
        <Input id="gb-name" name="name" required maxLength={60} autoComplete="name" />
      </Field>
      <Field label={messages.guestbook.message} htmlFor="gb-message">
        <Textarea
          id="gb-message"
          name="message"
          required
          minLength={2}
          maxLength={1000}
          placeholder={messages.guestbook.messagePlaceholder}
        />
      </Field>
      <Field label={messages.guestbook.email} htmlFor="gb-email" optional hint={messages.guestbook.emailHint}>
        <Input id="gb-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} />
      </Field>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="gb-website">Web</label>
        <input id="gb-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {result.kind === "error" ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {result.message}
        </p>
      ) : null}
      {demo ? null : <Turnstile onToken={setToken} />}
      <Button type="submit" disabled={busy || !hydrated || (!demo && turnstileEnabled && !token)}>
        {busy ? messages.guestbook.sending : messages.guestbook.submit}
      </Button>
    </form>
  );
}
