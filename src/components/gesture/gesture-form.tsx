"use client";

import { useActionState, useState, type ReactNode } from "react";
import { keepValues } from "@/lib/keep-values";
import { startGestureCheckoutAction } from "@/app/gesta/actions";
import { BallIcon, CandleIcon, FlowerIcon, PawIcon, TrashIcon, TreatIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AttributionFields } from "@/components/wizard/attribution-fields";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatEuro } from "@/lib/format";
import type { GestureKind } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { gesture } from "@/messages/hr/gesture";

type Duration = "gesture_7d" | "gesture_30d" | "gesture_365d";
type Draft = { id: number; kind: GestureKind; duration: Duration };

const MAX_GESTURES = 5;
const KINDS: Array<{ key: GestureKind; icon: ReactNode }> = [
  { key: "svijeca", icon: <CandleIcon size={24} /> },
  { key: "sapica", icon: <PawIcon size={26} /> },
  { key: "cvijet", icon: <FlowerIcon size={24} /> },
  { key: "poslastica", icon: <TreatIcon size={24} /> },
  { key: "loptica", icon: <BallIcon size={24} /> },
];
const DURATIONS: Duration[] = ["gesture_7d", "gesture_30d", "gesture_365d"];

/**
 * Jedna ili više gesta u istoj kupnji. Zbroj koji se ovdje vidi samo je prikaz; iznos za
 * naplatu računa poslužitelj iz tablice cijena.
 */
export function GestureForm({
  memorialId,
  cancelPath,
  prices,
}: {
  memorialId: string;
  cancelPath: string;
  prices: Record<Duration, number>;
}) {
  const [state, action, pending] = useActionState(startGestureCheckoutAction.bind(null, memorialId, cancelPath), {
    error: null,
  });
  const [items, setItems] = useState<Draft[]>([{ id: 1, kind: "svijeca", duration: "gesture_30d" }]);
  const [nextId, setNextId] = useState(2);
  const total = items.reduce((sum, item) => sum + prices[item.duration], 0);

  function update(id: number, patch: Partial<Draft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <form action={action} onSubmit={keepValues(action)} className="flex flex-col gap-5">
      <AttributionFields />
      {items.map((item, index) => (
        <Card key={item.id} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{fill(gesture.item, { n: index + 1 })}</h2>
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-plum-soft hover:text-plum"
              >
                <TrashIcon size={16} />
                {gesture.remove}
              </button>
            ) : null}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-bold">{gesture.kind}</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {KINDS.map((kind) => (
                <label
                  key={kind.key}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 text-center text-[12px] font-semibold",
                    item.kind === kind.key ? "border-teal bg-mint" : "border-line bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name={`kind-${item.id}`}
                    checked={item.kind === kind.key}
                    onChange={() => update(item.id, { kind: kind.key })}
                    className="sr-only"
                  />
                  {kind.icon}
                  {gesture.kinds[kind.key]}
                </label>
              ))}
            </div>
            <input type="hidden" name="kind" value={item.kind} />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-bold">{gesture.duration}</legend>
            {DURATIONS.map((duration) => (
              <label
                key={duration}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-4",
                  item.duration === duration ? "border-teal bg-mint" : "border-line bg-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`duration-${item.id}`}
                    checked={item.duration === duration}
                    onChange={() => update(item.id, { duration })}
                    className="size-5 accent-teal"
                  />
                  {gesture.durations[duration]}
                </span>
                <span className="font-bold">{formatEuro(prices[duration])}</span>
              </label>
            ))}
            <input type="hidden" name="duration" value={item.duration} />
          </fieldset>

          <Field label={gesture.name} htmlFor={`name-${item.id}`} optional>
            <Input
              id={`name-${item.id}`}
              name="display_name"
              maxLength={60}
              placeholder={gesture.namePlaceholder}
              autoComplete="off"
            />
          </Field>
          <Field label={gesture.message} htmlFor={`message-${item.id}`} optional>
            <Input
              id={`message-${item.id}`}
              name="message"
              maxLength={200}
              placeholder={gesture.messagePlaceholder}
              autoComplete="off"
            />
          </Field>
        </Card>
      ))}

      {items.length < MAX_GESTURES ? (
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            setItems((current) => [...current, { id: nextId, kind: "cvijet", duration: "gesture_30d" }]);
            setNextId((value) => value + 1);
          }}
        >
          {gesture.add}
        </Button>
      ) : null}

      <Card className="flex flex-col gap-4">
        <p className="flex items-baseline justify-between gap-3 text-lg">
          <span className="font-bold">{gesture.total}</span>
          <span className="font-display text-2xl font-extrabold" aria-live="polite">
            {formatEuro(total)}
          </span>
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input type="checkbox" name="waiver" required className="mt-0.5 size-6 shrink-0 accent-teal" />
          <span>{gesture.waiver}</span>
        </label>
        {state.error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? gesture.submitting : gesture.submit}
        </Button>
        <p className="text-sm text-plum-soft">{gesture.freeNote}</p>
      </Card>
    </form>
  );
}
