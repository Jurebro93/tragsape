"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Prebacuje pregled između besplatnog spomena i Memorijala, da razlika bude vidljiva prije izbora. */
export function PreviewSwitcher({
  free,
  paid,
  freeLabel,
  paidLabel,
}: {
  free: ReactNode;
  paid: ReactNode | null;
  freeLabel: string;
  paidLabel: string;
}) {
  const [showPaid, setShowPaid] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {paid ? (
        <div className="flex gap-1 rounded-full bg-white p-1" role="group">
          {[
            { label: freeLabel, value: false },
            { label: paidLabel, value: true },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              aria-pressed={showPaid === tab.value}
              onClick={() => setShowPaid(tab.value)}
              className={cn(
                "min-h-11 flex-1 rounded-full px-3 text-[15px] font-bold",
                showPaid === tab.value ? "bg-plum text-white" : "text-plum hover:bg-butter",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[32px] border-2 border-line bg-vanilla">
        <div className={showPaid && paid ? "hidden" : undefined}>{free}</div>
        {paid ? <div className={showPaid ? undefined : "hidden"}>{paid}</div> : null}
      </div>
    </div>
  );
}
