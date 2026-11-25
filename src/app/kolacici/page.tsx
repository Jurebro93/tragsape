import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site-chrome";
import { LEGAL_DRAFT, legal, splitPlaceholders } from "@/messages/hr/legal";

const doc = legal.cookies;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/kolacici" },
  // Nacrt se ne nudi tražilicama dok ga pravnik ne pregleda.
  robots: LEGAL_DRAFT ? { index: false, follow: true } : undefined,
};

/** Tekst odlomka; mjesta koja još treba popuniti (uglate zagrade) vidljivo su istaknuta. */
function LegalText({ text }: { text: string }) {
  return splitPlaceholders(text).map((part, index) =>
    part.placeholder ? (
      <mark key={index} className="rounded-md bg-butter px-0.5 font-semibold text-plum">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

export default function CookiesPage() {
  return (
    <PageShell>
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          {LEGAL_DRAFT ? (
            <p
              role="note"
              className="rounded-2xl border-2 border-terracotta bg-white px-4 py-3 text-lg font-bold text-terracotta-deep"
            >
              {legal.draftNotice}
            </p>
          ) : null}
          <h1 className="text-4xl font-extrabold">{doc.title}</h1>
          <p className="text-[15px] text-plum-soft">
            <LegalText text={doc.version} />
          </p>
        </header>

        {doc.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-2xl font-extrabold leading-tight">{section.heading}</h2>
            {section.blocks.map((block, index) =>
              typeof block === "string" ? (
                <p key={index} className="leading-relaxed">
                  <LegalText text={block} />
                </p>
              ) : (
                <ul key={index} className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
                  {block.list.map((item) => (
                    <li key={item}>
                      <LegalText text={item} />
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}

        <nav aria-label={legal.relatedTitle} className="flex flex-col gap-1 border-t-2 border-line pt-5">
          <h2 className="text-xl font-extrabold">{legal.relatedTitle}</h2>
          <ul className="flex flex-wrap gap-x-5">
            {doc.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </PageShell>
  );
}
