import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/site-chrome";
import { admin } from "@/messages/hr/admin";

/** Okvir admina: navigacija i sadržaj. Prikazuje se tek nakon provjere uloge. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-vanilla">
      <header className="border-b-2 border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <Logo />
              <span className="rounded-full bg-plum px-3 py-1 text-[13px] font-bold text-white">{admin.title}</span>
            </span>
            <Link href="/" className="min-h-11 content-center text-[15px] font-semibold">
              {admin.backToSite}
            </Link>
          </div>
          <nav aria-label={admin.title} className="-mx-2 flex gap-1 overflow-x-auto pb-1 text-[15px] font-semibold">
            {admin.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="min-h-11 shrink-0 content-center whitespace-nowrap rounded-full px-3 text-plum no-underline hover:bg-butter"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 pb-16 pt-6">{children}</main>
    </div>
  );
}
