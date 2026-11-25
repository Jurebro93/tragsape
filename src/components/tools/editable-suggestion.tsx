"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { fill } from "@/lib/text";
import { tools } from "@/messages/hr/tools";

const t = tools.common;

/**
 * Prijedlog teksta koji se može mijenjati i kopirati. Uz `maxLength` prikazuje brojač znakova
 * koji se osvježava dok se piše; polje ne prima više od dopuštenog.
 */
export function EditableSuggestion({
  id,
  label,
  initial,
  maxLength,
}: {
  id: string;
  label: string;
  initial: string;
  maxLength?: number;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      // Bez dopuštenja za međuspremnik: tekst se označi, pa ga je lako kopirati ručno.
      const field = document.getElementById(id);
      if (field instanceof HTMLTextAreaElement) {
        field.focus();
        field.select();
      }
      setStatus("failed");
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      <Textarea
        id={id}
        value={text}
        maxLength={maxLength}
        rows={4}
        aria-describedby={maxLength ? `${id}-count` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("idle");
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {maxLength ? (
          <p id={`${id}-count`} className="text-sm text-plum-soft">
            {fill(t.charCount, { count: text.length, max: maxLength })}
          </p>
        ) : (
          <span />
        )}
        <Button variant="secondary" size="md" onClick={copy} disabled={text.trim() === ""}>
          {t.copy}
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm font-semibold text-teal-deep">
        {status === "copied" ? t.copied : status === "failed" ? t.copyFailed : ""}
      </p>
    </Card>
  );
}
