import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { confirmLinkAction } from "@/app/prijava/actions";
import { PageShell } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/messages/hr/auth";

export const metadata: Metadata = { title: auth.link.title, robots: { index: false } };

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Iz adrese na koju e-mail vraća uzima samo putanju unutar ove stranice i token preuzimanja. */
function readRedirect(value: string | undefined): { next: string; claim: string } {
  try {
    const url = new URL(value ?? "", siteUrl);
    if (url.origin !== new URL(siteUrl).origin) {
      return { next: "/moji-ljubimci", claim: "" };
    }
    const claim = url.searchParams.get("preuzmi") ?? "";
    url.searchParams.delete("preuzmi");
    const path = `${url.pathname}${url.search}`;
    return { next: path === "/" ? "/moji-ljubimci" : path, claim };
  } catch {
    return { next: "/moji-ljubimci", claim: "" };
  }
}

async function Confirm({ searchParams }: Pick<PageProps<"/auth/potvrda">, "searchParams">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = params.type === "email_change" ? "email_change" : "email";
  if (tokenHash === "") {
    redirect("/prijava?greska=poveznica");
  }
  const { next, claim } = readRedirect(typeof params.redirect_to === "string" ? params.redirect_to : undefined);
  return (
    <Card className="flex flex-col gap-4">
      <p>{auth.link.body}</p>
      <form action={confirmLinkAction} className="flex flex-col">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="claim" value={claim} />
        <Button type="submit">{auth.link.confirm}</Button>
      </form>
    </Card>
  );
}

export default function ConfirmLinkPage(props: PageProps<"/auth/potvrda">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-extrabold">{auth.link.title}</h1>
        <Suspense fallback={<Card className="min-h-40" />}>
          <Confirm searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
