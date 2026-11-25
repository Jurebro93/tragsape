"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { carryAttribution } from "@/lib/attribution";

function subscribe() {
  return () => undefined;
}

/**
 * Poveznica na izradu, poklon ili cjenik koja sa sobom nosi izvor posjeta iz trenutne adrese.
 * Tako se vidi koji je članak ili alat doveo do kupnje i kad posjetitelj putem svrati na primjer
 * ili cjenik. Adresa se čita u pregledniku, pa stranica ostaje statična.
 */
export function AttributedLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return (
    <Link href={carryAttribution(href, search) as Route} className={className}>
      {children}
    </Link>
  );
}
