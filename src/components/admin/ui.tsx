import type { Route } from "next";
import Link from "next/link";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";

/**
 * Zajednički dijelovi adminovih stranica: naslov, odjeljak, tablica, filtar, stranice.
 * Interni alat: gusto i funkcionalno, ali upotrebljivo na mobitelu (tablice se pomiču vodoravno,
 * dodirne površine imaju najmanje 44 px).
 */

const t = adminPanel.common;

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {intro ? <p className="max-w-3xl text-plum-soft">{intro}</p> : null}
      {children}
    </header>
  );
}

export function Section({
  title,
  id,
  description,
  className,
  children,
}: {
  title: string;
  id?: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className={cn("flex scroll-mt-6 flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {description ? <p className="max-w-3xl text-[15px] text-plum-soft">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

/** Tablica u okviru koji se na uskom zaslonu pomiče vodoravno. */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-[15px]", className)}>{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b-2 border-line bg-vanilla px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-plum-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-line px-3 py-2.5 align-top", className)} {...props} />;
}

/** Ćelija s iznosom ili brojem: poravnata desno, znamenke jednake širine. */
export function NumTd({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <Td className={cn("whitespace-nowrap text-right tabular-nums", className)} {...props} />;
}

export function NumTh({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <Th className={cn("text-right", className)} {...props} />;
}

type Tone = "neutral" | "good" | "warn" | "bad";

const tones: Record<Tone, string> = {
  neutral: "bg-line text-plum",
  good: "bg-mint text-teal-deep",
  warn: "bg-butter text-plum",
  bad: "bg-danger text-white",
};

/** Mala oznaka stanja u tablici. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-vanilla px-4 py-5 text-plum-soft">{children}</p>;
}

/** Napomena uz odjeljak: objašnjenje ili upozorenje koje admin treba pročitati. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("rounded-2xl bg-butter px-4 py-3 text-[15px]", className)}>{children}</p>;
}

/** Filtar kao niz poveznica; stanje je u adresi, pa se može spremiti i podijeliti. */
export function FilterTabs({
  label = t.filter,
  items,
}: {
  label?: string;
  items: Array<{ href: string; label: string; current: boolean }>;
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "min-h-11 shrink-0 content-center whitespace-nowrap rounded-full border-2 px-4 text-[15px] font-bold no-underline",
            item.current ? "border-plum bg-plum text-white" : "border-line bg-white text-plum hover:bg-butter",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Prethodna i sljedeća stranica popisa. `hrefFor` vraća adresu zadane stranice. */
export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}) {
  if (pages <= 1) {
    return null;
  }
  const link = "min-h-11 content-center rounded-full border-2 border-line bg-white px-4 font-bold text-plum no-underline hover:bg-butter";
  return (
    <nav aria-label={t.pagination} className="flex flex-wrap items-center gap-3 text-[15px]">
      {page > 1 ? (
        <Link href={hrefFor(page - 1) as Route} className={link}>
          {t.previous}
        </Link>
      ) : null}
      <span className="text-plum-soft">{fill(t.page, { page, pages })}</span>
      {page < pages ? (
        <Link href={hrefFor(page + 1) as Route} className={link}>
          {t.next}
        </Link>
      ) : null}
    </nav>
  );
}

/** Poveznica unutar tablice, s dodirnom površinom od 44 px. */
export function RowLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const className = "inline-flex min-h-11 items-center font-bold underline underline-offset-4";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href as Route} className={className}>
      {children}
    </Link>
  );
}

/** Popis „naziv: vrijednost" za pojedinačni prikaz zapisa. */
export function DefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col">
          <dt className="text-[13px] font-bold uppercase tracking-[0.04em] text-plum-soft">{item.label}</dt>
          <dd className="[overflow-wrap:anywhere]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Mjesto za podatke dok se učitavaju; ulazi u statični dio stranice. */
export function LoadingBlock({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label={t.loading}
      className={cn("min-h-64 animate-pulse rounded-3xl bg-white", className)}
      {...props}
    />
  );
}

/** Brojka na pregledu; cijela pločica vodi u odjeljak iz kojeg brojka dolazi. */
export function Stat({
  href,
  label,
  value,
  detail,
  highlight = false,
}: {
  href: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Ističe brojku koja traži adminovu pažnju. */
  highlight?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "flex min-h-11 flex-col gap-0.5 rounded-2xl border-2 p-4 text-plum no-underline hover:border-plum",
        highlight ? "border-sun bg-butter" : "border-line bg-white",
      )}
    >
      <span className="text-[15px] text-plum-soft">{label}</span>
      <span className="font-display text-3xl font-extrabold tabular-nums">{value}</span>
      {detail ? <span className="text-[15px] text-plum-soft">{detail}</span> : null}
    </Link>
  );
}
