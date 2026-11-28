import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth/password-form";
import { PageShell } from "@/components/site-chrome";
import { Card } from "@/components/ui/card";
import { auth } from "@/messages/hr/auth";

export const metadata: Metadata = { title: auth.password.title, robots: { index: false, follow: false } };

/** Prijava lozinkom; nije povezana s javnih stranica. Nakon prijave vodi u admin. */
export default function PasswordSignInPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold">{auth.password.title}</h1>
          <p className="text-plum-soft">{auth.password.intro}</p>
        </div>
        <Card className="flex flex-col gap-4">
          <PasswordForm next="/admin" />
        </Card>
      </div>
    </PageShell>
  );
}
