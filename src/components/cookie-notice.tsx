"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { common } from "@/messages/hr/common";

const KEY = "trag-sape-kolacici";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("trag-sape-kolacici", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("trag-sape-kolacici", callback);
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Obavijest o kolačićima. Koristimo samo nužne kolačiće, pa privola nije potrebna;
 * ovo je jasna informacija s poveznicom na pojedinosti.
 */
export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  if (dismissed) {
    return null;
  }
  return (
    <div
      role="region"
      aria-label={common.footer.cookies}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-3xl bg-plum p-4 text-white shadow-lg sm:flex-row sm:items-center"
    >
      <p className="text-sm leading-snug">
        {common.cookieNotice.body}{" "}
        <Link href="/kolacici" className="text-butter underline underline-offset-4">
          {common.cookieNotice.more}
        </Link>
      </p>
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-full bg-white px-5 text-sm font-bold text-plum"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, "1");
          } catch {
            // Bez pohrane obavijest ostaje do kraja posjeta.
          }
          window.dispatchEvent(new Event("trag-sape-kolacici"));
        }}
      >
        {common.cookieNotice.ok}
      </button>
    </div>
  );
}
