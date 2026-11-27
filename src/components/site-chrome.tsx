import type { Route } from "next";
import Link from "next/link";
import { AttributedLink } from "@/components/attributed-link";
import { LogoMark } from "@/components/icons";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";
import { newsletter } from "@/messages/hr/newsletter";
import { common } from "@/messages/hr/common";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-plum no-underline", className)}>
      <LogoMark size={28} className="text-terracotta" />
      <span className="font-display text-xl font-extrabold tracking-tight">{common.brand}</span>
    </Link>
  );
}

const mainLinks = [
  { href: "/livada", label: common.nav.meadow },
  { href: "/vodic", label: common.nav.guide },
  { href: "/alati", label: common.nav.tools },
  { href: "/cjenik", label: common.nav.pricing },
] as const;

export function SiteHeader({ tone = "vanilla" }: { tone?: "vanilla" | "butter" }) {
  return (
    <header className={cn("w-full", tone === "butter" ? "bg-butter" : "bg-vanilla")}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-5 py-3">
        <Logo />
        <nav aria-label="Glavna navigacija" className="flex items-center gap-1 whitespace-nowrap text-sm font-bold">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-full px-2.5 py-3 text-plum no-underline hover:bg-white/70 md:inline-block"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/moji-ljubimci"
            className="hidden rounded-full px-2.5 py-3 text-plum no-underline hover:bg-white/70 sm:inline-block"
          >
            {common.nav.myPets}
          </Link>
          <AttributedLink href="/izradi" className="rounded-full bg-plum px-4 py-3 text-white no-underline hover:bg-black">
            <span className="sm:hidden">{common.nav.createShort}</span>
            <span className="hidden sm:inline">{common.nav.create}</span>
          </AttributedLink>
          <details className="group relative md:hidden">
            <summary
              aria-label={common.nav.menu}
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-plum hover:bg-white/70 [&::-webkit-details-marker]:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 z-20 flex w-56 flex-col rounded-3xl border-2 border-line bg-white p-2 shadow-lg">
              {[...mainLinks, { href: "/moji-ljubimci", label: common.nav.myPets }, { href: "/primjer", label: common.nav.example }].map((link) => (
                <Link key={link.href} href={link.href as Route} className="flex min-h-11 items-center rounded-2xl px-3 text-[15px] text-plum no-underline hover:bg-butter">
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    { href: "/livada", label: common.nav.meadow },
    { href: "/primjer", label: common.nav.example },
    { href: "/vodic", label: common.nav.guide },
    { href: "/alati", label: common.nav.tools },
    { href: "/cjenik", label: common.nav.pricing },
    { href: "/donacije", label: common.footer.donations },
    { href: "/uvjeti", label: common.footer.terms },
    { href: "/privatnost", label: common.footer.privacy },
    { href: "/kolacici", label: common.footer.cookies },
  ];
  return (
    <footer className="mt-auto w-full bg-plum text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={26} className="text-butter" />
            <span className="font-display text-xl font-extrabold">{common.brand}</span>
          </span>
          <p className="text-[15px] text-white/85">{common.footer.line}</p>
        </div>
        <section aria-labelledby="podnozje-newsletter" className="flex max-w-xl flex-col gap-3 rounded-3xl bg-white/5 p-5">
          <h2 id="podnozje-newsletter" className="font-display text-lg font-extrabold text-white">
            {newsletter.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-white/80">{newsletter.lead}</p>
          <NewsletterForm source="podnozje" tone="dark" />
        </section>
        <nav aria-label="Podnožje" className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="py-2 text-white underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/** Okvir obične stranice: zaglavlje, sadržaj, podnožje. */
export function PageShell({
  children,
  width = "narrow",
  headerTone,
}: {
  children: React.ReactNode;
  width?: "narrow" | "wide";
  headerTone?: "vanilla" | "butter";
}) {
  return (
    <>
      <SiteHeader tone={headerTone} />
      <main className={cn("mx-auto w-full flex-1 px-5 pb-16 pt-6", width === "narrow" ? "max-w-xl" : "max-w-5xl")}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
