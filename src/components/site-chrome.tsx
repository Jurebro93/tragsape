import Link from "next/link";
import { PawIcon } from "@/components/icons";
import { common } from "@/messages/hr/common";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-plum no-underline", className)}>
      <PawIcon size={26} className="text-terracotta" />
      <span className="font-display text-xl font-extrabold tracking-tight">{common.brand}</span>
    </Link>
  );
}

export function SiteHeader({ tone = "vanilla" }: { tone?: "vanilla" | "butter" }) {
  return (
    <header className={cn("w-full", tone === "butter" ? "bg-butter" : "bg-vanilla")}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-5 py-3">
        <Logo />
        <nav aria-label="Glavna navigacija" className="flex items-center gap-1 whitespace-nowrap text-sm font-bold">
          <Link
            href="/livada"
            className="hidden rounded-full px-2.5 py-3 text-plum no-underline hover:bg-white/70 sm:inline-block"
          >
            {common.nav.meadow}
          </Link>
          <Link href="/moji-ljubimci" className="rounded-full px-2.5 py-3 text-plum no-underline hover:bg-white/70">
            {common.nav.myPets}
          </Link>
          <Link href="/izradi" className="rounded-full bg-plum px-4 py-3 text-white no-underline hover:bg-black">
            <span className="sm:hidden">{common.nav.createShort}</span>
            <span className="hidden sm:inline">{common.nav.create}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    { href: "/livada", label: common.nav.meadow },
    { href: "/primjer", label: common.nav.example },
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
            <PawIcon size={24} className="text-butter" />
            <span className="font-display text-xl font-extrabold">{common.brand}</span>
          </span>
          <p className="text-[15px] text-white/85">{common.footer.line}</p>
        </div>
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
