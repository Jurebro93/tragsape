"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/icons";
import { fill } from "@/lib/text";
import { common } from "@/messages/hr/common";
import { memorial as messages } from "@/messages/hr/memorial";

/** Dijeljenje: sustavni izbornik na mobitelu, inače kopiranje poveznice. */
export function ShareButton({ name, path }: { name: string; path?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href.split("?")[0];
    const text = fill(messages.share.text, { name });
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch {
        // Korisnik je zatvorio izbornik; nastavljamo na kopiranje samo ako dijeljenje nije podržano.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(common.actions.copyLink, url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={messages.share.label}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-bold text-plum hover:bg-vanilla"
    >
      <ShareIcon />
      <span aria-live="polite">{copied ? common.actions.copied : messages.share.label}</span>
    </button>
  );
}
