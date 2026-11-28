"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { checkQuestion } from "@/lib/requests";
import { useHydrated } from "@/lib/use-hydrated";
import { requests as t } from "@/messages/hr/requests";

type Result = { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * „Ne nalaziš odgovor? Predloži temu”: pitanje, e-mail i izričita privola. Pitanje se ne objavljuje;
 * kad članak bude gotov, čitatelj dobiva jedan e-mail. U podnožju je sklopljen, na Vodiču otvoren.
 */
export function TopicRequest({ tone = "light", collapsible = false }: { tone?: "light" | "dark"; collapsible?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(!collapsible);
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const hydrated = useHydrated();
  const dark = tone === "dark";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        className={cn(
          "inline-flex min-h-12 cursor-pointer items-center self-start rounded-full px-5 font-bold",
          dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-mint text-teal-deep hover:bg-butter",
        )}
      >
        {t.toggle}
      </button>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const question = checkQuestion(form.get("question"));
    const email = String(form.get("email") ?? "").trim();
    if (!question.ok) {
      setResult({ kind: "error", message: t.errors.question });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setResult({ kind: "error", message: t.errors.email });
      return;
    }
    if (form.get("consent") !== "on") {
      setResult({ kind: "error", message: t.errors.consent });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/pitanja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          email,
          consent: true,
          newsletter: form.get("newsletter") === "on",
          page: window.location.pathname,
          website: form.get("website") ?? "",
          // Trajanje mjeri preglednik sam, pa krivo namješten sat uređaja ne smeta.
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (response.ok && data.status === "sent") setResult({ kind: "sent" });
      else if (data.error && data.error in t.errors) setResult({ kind: "error", message: t.errors[data.error as keyof typeof t.errors] });
      else setResult({ kind: "error", message: t.errors.failed });
    } catch {
      setResult({ kind: "error", message: t.errors.failed });
    } finally {
      setBusy(false);
    }
  }

  const muted = dark ? "text-white/85" : "text-plum-soft";
  return (
    <section
      aria-labelledby={`${id}-naslov`}
      className={cn("flex max-w-xl flex-col gap-3 rounded-3xl p-5", dark ? "bg-white/5 text-white" : "bg-white text-plum")}
    >
      <h2 id={`${id}-naslov`} className="font-display text-lg font-extrabold">
        {t.title}
      </h2>
      <p className={cn("text-[15px] leading-relaxed", muted)}>{t.lead}</p>
      {result.kind === "sent" ? (
        <p role="status" className={cn("rounded-3xl px-5 py-4 font-medium", dark ? "bg-white/10 text-white" : "bg-mint")}>
          {t.sent}
        </p>
      ) : (
        <form
          onSubmit={submit}
          onFocus={() => {
            if (startedAt.current === 0) startedAt.current = Date.now();
          }}
          className="flex flex-col gap-3"
          noValidate
        >
          <label htmlFor={`${id}-pitanje`} className="flex flex-col gap-1.5 text-[15px] font-bold">
            {t.questionLabel}
            <textarea
              id={`${id}-pitanje`}
              name="question"
              rows={3}
              maxLength={1000}
              placeholder={t.questionPlaceholder}
              className="rounded-2xl border-2 border-line bg-white px-4 py-3 text-[16px] font-normal text-plum"
            />
          </label>
          <label htmlFor={`${id}-email`} className="flex flex-col gap-1.5 text-[15px] font-bold">
            {t.emailLabel}
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              placeholder={t.emailPlaceholder}
              className="font-normal text-plum"
            />
          </label>
          <label className={cn("flex items-start gap-3 text-[14px] leading-snug", muted)}>
            <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-terracotta" />
            <span>
              {t.consent}{" "}
              <Link href="/privatnost" className={cn("underline underline-offset-2", dark ? "text-white" : "text-teal")}>
                {t.privacyLink}
              </Link>
            </span>
          </label>
          <label className={cn("flex items-start gap-3 text-[14px] leading-snug", muted)}>
            <input type="checkbox" name="newsletter" className="mt-0.5 size-5 shrink-0 accent-terracotta" />
            <span>{t.newsletter}</span>
          </label>
          <div className="hidden" aria-hidden="true">
            <label htmlFor={`${id}-website`}>Web</label>
            <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <p className={cn("text-[13px] leading-snug", dark ? "text-white/70" : "text-plum-soft")}>{t.notice}</p>
          {result.kind === "error" ? (
            <p role="alert" className={cn("text-sm font-medium", dark ? "text-butter" : "text-danger")}>
              {result.message}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || !hydrated} className="self-start">
            {busy ? t.sending : t.submit}
          </Button>
        </form>
      )}
    </section>
  );
}
