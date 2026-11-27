"use client";

import { useState } from "react";
import { fill } from "@/lib/text";
import { meadow } from "@/messages/hr/meadow";

const t = meadow.trail;

/** Kopira adresu stranice traga; ako preglednik ne dopusti, pokaže je za ručno kopiranje. */
export function CopyTrailLink() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={async () => {
          const url = window.location.href.split("?")[0];
          try {
            await navigator.clipboard.writeText(url);
            setMessage(t.copied);
          } catch {
            setMessage(fill(t.copyFailed, { url }));
          }
        }}
        className="min-h-12 cursor-pointer rounded-full border-2 border-plum bg-white px-5 font-bold text-plum hover:bg-butter"
      >
        {t.copy}
      </button>
      {message ? (
        <p role="status" className="text-[15px] font-medium text-teal-deep [overflow-wrap:anywhere]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
