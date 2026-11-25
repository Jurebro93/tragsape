"use client";

import { useEffect, useState } from "react";
import { CandleIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { fill, plural } from "@/lib/text";
import { useHydrated } from "@/lib/use-hydrated";
import { memorial as messages } from "@/messages/hr/memorial";

type CandleState = { total: number; today: number; lit: boolean };

const candleForms = { one: "svijeća", few: "svijeće", other: "svijeća" };

/** Besplatna dnevna svijeća. Stanje se čita nakon učitavanja, pa je stranica i dalje predmemorirana. */
export function CandleWidget({
  memorialId,
  shareKey,
  initialTotal,
  disabled = false,
}: {
  memorialId: string;
  shareKey: string | null;
  initialTotal: number;
  disabled?: boolean;
}) {
  const [state, setState] = useState<CandleState>({ total: initialTotal, today: 0, lit: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    if (disabled) {
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ m: memorialId });
    if (shareKey) {
      query.set("k", shareKey);
    }
    fetch(`/api/svijece?${query}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CandleState | null) => {
        if (data) {
          setState(data);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [memorialId, shareKey, disabled]);

  async function light() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/svijece", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId, shareKey }),
      });
      if (!response.ok) {
        throw new Error("neuspjeh");
      }
      setState((await response.json()) as CandleState);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={light}
        disabled={disabled || busy || state.lit || !hydrated}
        aria-pressed={state.lit}
        className={buttonClass(state.lit ? "light" : "primary", "lg", "w-full px-3 disabled:opacity-100")}
      >
        <CandleIcon className={state.lit ? "text-terracotta" : undefined} />
        {busy ? messages.candle.lighting : state.lit ? messages.candle.lit : messages.candle.light}
      </button>
      <p className="text-center text-sm text-plum-soft" aria-live="polite">
        {error
          ? messages.candle.error
          : state.lit
            ? messages.candle.thanks
            : `${fill(messages.candle.today, { n: state.today })} · ${fill(messages.candle.total, {
                n: plural(state.total, candleForms),
              })}`}
      </p>
    </div>
  );
}
