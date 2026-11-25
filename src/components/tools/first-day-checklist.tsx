"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/text";
import { FIRST_DAY_STORAGE_KEY, parseChecked, serializeChecked, toggleChecked } from "@/lib/tools/checklist";
import { useHydrated } from "@/lib/use-hydrated";
import { tools } from "@/messages/hr/tools";

const t = tools.firstDay;
const IDS = t.items.map((item) => item.id);
const CHANGE_EVENT = "trag-sape-prva-24-sata";

/**
 * Zadnja vrijednost zapisana u ovoj kartici. Kad preglednik ne dopušta pohranu (privatni način,
 * puna kvota), popis i dalje radi do zatvaranja stranice, samo se ne pamti.
 */
let lastWritten: string | null = null;

function subscribe(callback: () => void) {
  const onStorage = () => {
    lastWritten = null;
    callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readStored(): string {
  if (lastWritten !== null) {
    return lastWritten;
  }
  try {
    return window.localStorage.getItem(FIRST_DAY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStored(value: string) {
  lastWritten = value;
  try {
    if (value === "") {
      window.localStorage.removeItem(FIRST_DAY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FIRST_DAY_STORAGE_KEY, value);
    }
  } catch {
    // Bez pohrane kvačice vrijede samo do zatvaranja stranice.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Popis za prva 24 sata. Kvačice se pamte samo u pregledniku i mogu se očistiti. */
export function FirstDayChecklist() {
  const hydrated = useHydrated();
  const stored = useSyncExternalStore(subscribe, readStored, () => "");
  const [cleared, setCleared] = useState(false);
  const checked = parseChecked(stored, IDS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1" data-print="hide">
        <p role="status" className="text-[15px] font-semibold">
          {cleared ? `${t.cleared} ` : ""}
          {fill(t.progress, { done: checked.length, total: IDS.length })}
        </p>
        <Button
          variant="quiet"
          disabled={!hydrated || checked.length === 0}
          onClick={() => {
            writeStored("");
            setCleared(true);
          }}
        >
          {t.clear}
        </Button>
      </div>
      <ol aria-label={t.listLabel} className="flex flex-col gap-3">
        {t.items.map((item, index) => {
          const inputId = `prvi-dan-${item.id}`;
          return (
            <li key={item.id} className="rounded-3xl bg-white p-4 sm:p-5">
              <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked.includes(item.id)}
                  disabled={!hydrated}
                  aria-describedby={`${inputId}-opis`}
                  onChange={() => {
                    writeStored(serializeChecked(toggleChecked(checked, item.id, IDS)));
                    setCleared(false);
                  }}
                  className="mt-0.5 size-7 shrink-0 accent-teal"
                />
                <span className="pt-0.5 font-bold leading-snug">
                  <span className="text-plum-soft">{index + 1}. </span>
                  {item.title}
                </span>
              </label>
              <p id={`${inputId}-opis`} className="mt-1 pl-10 text-[15px] leading-relaxed text-plum-soft">
                {item.body}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-plum-soft" data-print="hide">
        {t.storageNote}
      </p>
    </div>
  );
}
