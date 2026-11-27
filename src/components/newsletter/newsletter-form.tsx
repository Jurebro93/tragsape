"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
import { newsletter as t } from "@/messages/hr/newsletter";

type Result = { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * Prijava na newsletter: e-mail i izričita privola (neoznačena kućica). Prijava vrijedi tek kad je
 * posjetitelj potvrdi gumbom iz e-maila. `source` bilježi gdje je prijava nastala.
 */
export function NewsletterForm({
  source,
  tone = "light",
  autoFocus = false,
  onSent,
}: {
  source: string;
  tone?: "light" | "dark";
  autoFocus?: boolean;
  onSent?: () => void;
}) {
  const id = useId();
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const hydrated = useHydrated();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setResult({ kind: "error", message: t.invalidEmail });
      return;
    }
    if (form.get("consent") !== "on") {
      setResult({ kind: "error", message: t.consentRequired });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent: true,
          source,
          website: form.get("website") ?? "",
          // Trajanje mjeri preglednik sam, pa krivo namješten sat uređaja ne smeta.
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (response.ok && data.status === "pending") {
        setResult({ kind: "sent" });
        onSent?.();
      } else if (data.error === "email") {
        setResult({ kind: "error", message: t.invalidEmail });
      } else if (data.error === "rate") {
        setResult({ kind: "error", message: t.tooFast });
      } else {
        setResult({ kind: "error", message: t.error });
      }
    } catch {
      setResult({ kind: "error", message: t.error });
    } finally {
      setBusy(false);
    }
  }

  const dark = tone === "dark";
  if (result.kind === "sent") {
    return (
      <p role="status" className={cn("rounded-3xl px-5 py-4 font-medium", dark ? "bg-white/10 text-white" : "bg-mint")}>
        {t.sent}
      </p>
    );
  }
  return (
    <form
      onSubmit={submit}
      onFocus={() => {
        if (startedAt.current === 0) {
          startedAt.current = Date.now();
        }
      }}
      className="flex flex-col gap-3"
      noValidate
    >
      <label htmlFor={`${id}-email`} className="sr-only">
        {t.email}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder={t.emailPlaceholder}
          autoFocus={autoFocus}
          className="flex-1 text-plum"
        />
        <Button type="submit" disabled={busy || !hydrated} className="shrink-0">
          {busy ? t.sending : t.submit}
        </Button>
      </div>
      <label className={cn("flex items-start gap-3 text-[14px] leading-snug", dark ? "text-white/85" : "text-plum-soft")}>
        <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-terracotta" />
        <span>
          {t.consent}{" "}
          <Link href="/privatnost" className={cn("underline underline-offset-2", dark ? "text-white" : "text-teal")}>
            {t.privacyLink}
          </Link>
        </span>
      </label>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Web</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {result.kind === "error" ? (
        <p role="alert" className={cn("text-sm font-medium", dark ? "text-butter" : "text-danger")}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

/** Blok s naslovom i obrascem, za naslovnicu i sredinu članka. */
export function NewsletterCard({ source }: { source: string }) {
  return (
    <section
      aria-label={t.title}
      className="relative my-10 flex flex-col gap-4 overflow-hidden rounded-[32px] bg-teal p-6 text-white sm:p-8"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-teal-deep" />
      <span className="relative text-sm font-bold uppercase tracking-[0.08em] text-butter">{t.eyebrow}</span>
      <h2 className="relative font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">{t.title}</h2>
      <p className="relative max-w-lg leading-relaxed text-white/90">{t.lead}</p>
      <div className="relative">
        <NewsletterForm source={source} tone="dark" />
      </div>
    </section>
  );
}
