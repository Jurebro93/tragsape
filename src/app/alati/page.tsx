import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolPreview } from "@/components/tools/tool-preview";
import { publicTools, toolPath } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const t = tools.index;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/alati" },
};

/** Popis javnih alata. Nacrti se ovdje ne pojavljuju. */
export default function ToolsIndexPage() {
  return (
    <>
      <SiteHeader tone="butter" />
      <main className="w-full flex-1">
        <div className="rounded-b-[40px] bg-butter">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 pb-10 pt-6 sm:pb-12 sm:pt-10">
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] sm:text-5xl">{t.title}</h1>
            <p className="text-lg leading-relaxed">{t.intro}</p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8">
          <ul className="grid gap-4 sm:grid-cols-2">
            {publicTools().map((tool) => (
              <li key={tool.slug} className="flex">
                <Link
                  href={toolPath(tool.slug) as Route}
                  className="group flex w-full flex-col gap-4 rounded-[28px] bg-white p-3 pb-5 text-plum no-underline transition-colors hover:bg-butter/60"
                >
                  <ToolPreview slug={tool.slug} />
                  <div className="flex flex-1 flex-col gap-2 px-2">
                    <h2 className="font-display text-xl font-extrabold leading-snug">{tool.title}</h2>
                    <p className="leading-relaxed text-plum-soft">{tool.description}</p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                      <span className="text-sm text-plum-soft">{t.noSignup}</span>
                      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-terracotta px-5 font-bold text-white group-hover:bg-terracotta-deep">
                        {t.open}
                        <ArrowRightIcon size={18} />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
