"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_EVERY_MS = 2000;
const GIVE_UP_AFTER_MS = 30000;

/**
 * Dok webhook ne potvrdi plaćanje, stranica se sama osvježava. Nakon pola minute staje i kaže
 * kupcu da ne mora ništa ponavljati, da ne bi platio dvaput.
 */
export function PendingRefresher({ slowText }: { slowText: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= GIVE_UP_AFTER_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);

  return gaveUp ? <p className="rounded-2xl bg-butter px-4 py-3 text-[15px] font-medium">{slowText}</p> : null;
}
