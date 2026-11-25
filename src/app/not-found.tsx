import type { Metadata } from "next";
import { PawTrail } from "@/components/icons";
import { PageShell } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { common } from "@/messages/hr/common";

export const metadata: Metadata = {
  title: common.errors.notFoundTitle,
};

/** Stranica 404: i za nepostojeće adrese i za spomene koji izvana ne smiju biti vidljivi. */
export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-start gap-5 py-8">
        <PawTrail className="h-auto w-40 text-sun" />
        <h1 className="text-4xl font-extrabold">{common.errors.notFoundTitle}</h1>
        <p className="text-lg leading-relaxed text-plum-soft">{common.errors.notFoundBody}</p>
        <ButtonLink href="/" className="w-full sm:w-auto">
          {common.nav.home}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
