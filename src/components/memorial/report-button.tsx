"use client";

import { useRef, useState } from "react";
import { FlagIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { common } from "@/messages/hr/common";
import { memorial as messages } from "@/messages/hr/memorial";

const REASONS = ["neprimjereno", "spam", "tudji_sadrzaj", "drugo"] as const;

/** Prijava sadržaja u dijalogu. Cilj prijave je cijeli memorijal ili jedna poruka. */
export function ReportButton({
  memorialId,
  shareKey,
  targetType = "memorial",
  targetId,
}: {
  memorialId: string;
  shareKey: string | null;
  targetType?: "memorial" | "guestbook_entry" | "gesture" | "photo";
  targetId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("busy");
    try {
      const response = await fetch("/api/prijave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: targetId ?? memorialId,
          memorialId,
          shareKey,
          reason: form.get("reason"),
          details: form.get("details") ?? "",
          email: form.get("email") ?? "",
          website: form.get("website") ?? "",
        }),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState("idle");
          dialog.current?.showModal();
        }}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-plum-soft underline underline-offset-4 hover:text-plum"
      >
        <FlagIcon size={16} />
        {messages.report.open}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-plum backdrop:bg-plum/50"
      >
        {state === "sent" ? (
          <div className="flex flex-col gap-4">
            <p className="font-medium" role="status">
              {messages.report.thanks}
            </p>
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              {common.actions.close}
            </Button>
          </div>
        ) : (
          <form method="post" onSubmit={submit} className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold">{messages.report.title}</h2>
            <p className="text-[15px] text-plum-soft">{messages.report.intro}</p>
            <Field label={messages.report.reason} htmlFor="report-reason">
              <Select id="report-reason" name="reason" required defaultValue="neprimjereno">
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {messages.report.reasons[reason]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={messages.report.details} htmlFor="report-details" optional>
              <Textarea id="report-details" name="details" maxLength={1000} />
            </Field>
            <Field label={messages.report.email} htmlFor="report-email" optional hint={messages.report.emailHint}>
              <Input id="report-email" name="email" type="email" inputMode="email" maxLength={254} />
            </Field>
            <div className="hidden" aria-hidden="true">
              <input name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {state === "error" ? (
              <p className="text-sm font-medium text-danger" role="alert">
                {messages.report.error}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" disabled={state === "busy"} className="sm:flex-1">
                {state === "busy" ? messages.report.sending : messages.report.submit}
              </Button>
              <Button variant="secondary" onClick={() => dialog.current?.close()} className="sm:flex-1">
                {common.actions.cancel}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
