import type { Metadata } from "next";
import { Suspense } from "react";
import { unsubscribeAction } from "@/app/newsletter/actions";
import { TokenForm } from "@/components/newsletter/token-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { newsletter } from "@/messages/hr/newsletter";

const t = newsletter.unsubscribe;

export const metadata: Metadata = { title: t.metaTitle, robots: { index: false, follow: false } };

async function Form({ searchParams }: Pick<PageProps<"/newsletter/odjava">, "searchParams">) {
  const params = await searchParams;
  const token = typeof params.t === "string" ? params.t : "";
  return (
    <TokenForm
      token={token}
      action={unsubscribeAction}
      button={t.button}
      done={t.done}
      invalid={t.invalid}
    />
  );
}

export default function NewsletterUnsubscribePage(props: PageProps<"/newsletter/odjava">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-5 px-5 pb-16 pt-10">
        <h1 className="text-4xl font-extrabold leading-tight">{t.title}</h1>
        <p className="text-lg leading-relaxed">{t.body}</p>
        <Suspense>
          <Form searchParams={props.searchParams} />
        </Suspense>
        <ButtonLink href="/vodic" variant="quiet">
          {newsletter.confirm.back}
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
