"use client";

import { useSyncExternalStore } from "react";
import { memorial as messages } from "@/messages/hr/memorial";

function subscribe() {
  return () => undefined;
}

/** Potvrda odmah nakon objave. Čita adresu u pregledniku, pa ne utječe na predmemoriranje. */
export function PublishedNotice() {
  const show = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("objavljeno") === "1",
    () => false,
  );
  if (!show) {
    return null;
  }
  return (
    <div className="mx-5 mb-2 rounded-2xl bg-white px-4 py-3" role="status">
      <p className="font-display text-lg font-extrabold">{messages.publishedNotice.title}</p>
      <p className="text-[15px] text-plum-soft">{messages.publishedNotice.body}</p>
    </div>
  );
}
