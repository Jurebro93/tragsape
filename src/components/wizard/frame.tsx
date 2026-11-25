import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/site-chrome";
import { cn } from "@/lib/cn";
import { fill } from "@/lib/text";
import { wizard } from "@/messages/hr/wizard";

/** Okvir koraka izrade: naslov, pokazivač koraka i sadržaj. */
export function WizardFrame({
  step,
  memorialId,
  heading,
  children,
}: {
  step: 1 | 2 | 3;
  memorialId?: string;
  heading: string;
  children: ReactNode;
}) {
  const paths = memorialId
    ? [`/izradi/${memorialId}/ljubimac`, `/izradi/${memorialId}/prica`, `/izradi/${memorialId}/pregled`]
    : null;
  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep">
            {fill(wizard.stepOf, { n: step })}
          </p>
          <ol className="flex gap-2" aria-label={wizard.title}>
            {wizard.steps.map((label, index) => {
              const number = index + 1;
              const active = number === step;
              const content = (
                <>
                  <span
                    className={cn("h-2 w-full rounded-full", number <= step ? "bg-terracotta" : "bg-line")}
                    aria-hidden="true"
                  />
                  <span className={cn("text-[13px]", active ? "font-bold text-plum" : "text-plum-soft")}>{label}</span>
                </>
              );
              return (
                <li key={label} className="flex-1" aria-current={active ? "step" : undefined}>
                  {paths && number < step ? (
                    <Link href={paths[index] as Route} className="flex min-h-11 flex-col gap-1.5 no-underline">
                      {content}
                    </Link>
                  ) : (
                    <span className="flex min-h-11 flex-col gap-1.5">{content}</span>
                  )}
                </li>
              );
            })}
          </ol>
          <h1 className="text-4xl font-extrabold">{heading}</h1>
        </div>
        {children}
      </div>
    </PageShell>
  );
}
