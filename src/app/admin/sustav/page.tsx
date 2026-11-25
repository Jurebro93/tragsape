import { headers } from "next/headers";
import { Suspense } from "react";
import { TestEmailForm } from "@/app/admin/sustav/test-email-form";
import { Card, Chip } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth";
import { env } from "@/server/env";
import { clientIp } from "@/server/public/visitor";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Stanje sustava: što je podešeno, a što još nije. Prikazuje samo postoji li vrijednost,
 * nikad samu tajnu. Tekstovi su ovdje jer je stranica interni alat za puštanje u rad.
 */

type Check = { name: string; ok: boolean; detail: string };

function has(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

async function Status() {
  await requireAdmin("/admin/sustav");
  const supabase = await createSessionClient();
  const [{ data: products, error: productsError }, { data: settings }, { data: events }] = await Promise.all([
    supabase.from("products").select("key, active").order("key"),
    supabase.from("settings").select("donation_per_memorial_cents, active_shelter_id").maybeSingle(),
    supabase.from("stripe_events").select("event_id, error").not("error", "is", null).limit(1),
  ]);
  const siteUrl = env.siteUrl;
  const requestHeaders = await headers();
  const ipHeader = env.clientIpHeader;
  const forwardedCount = (requestHeaders.get("x-forwarded-for") ?? "").split(",").filter((part) => part.trim() !== "").length;
  const proxyHeaders = ["cf-connecting-ip", "true-client-ip", "x-real-ip"].filter((name) => requestHeaders.has(name));
  const seenIp = clientIp(new Request(siteUrl, { headers: requestHeaders }));
  const ipHeaderWorks = Boolean(ipHeader && requestHeaders.get(ipHeader));
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";

  const checks: Check[] = [
    {
      name: "Adresa stranice",
      ok: siteUrl.startsWith("https://"),
      detail: siteUrl.startsWith("https://")
        ? siteUrl
        : `${siteUrl} — u produkciji mora počinjati s https:// (NEXT_PUBLIC_SITE_URL, ugrađuje se pri buildu).`,
    },
    {
      name: "Baza i cjenik",
      ok: !productsError && (products ?? []).length > 0,
      detail: productsError
        ? `Cjenik se ne može pročitati: ${productsError.message}`
        : `Proizvoda: ${(products ?? []).length}; uključeno: ${(products ?? [])
            .filter((product) => product.active)
            .map((product) => product.key)
            .join(", ")}`,
    },
    {
      name: "Stripe",
      ok: has("STRIPE_SECRET_KEY") && has("STRIPE_WEBHOOK_SECRET"),
      detail: !has("STRIPE_SECRET_KEY")
        ? "Nema STRIPE_SECRET_KEY: kupnja je isključena."
        : !has("STRIPE_WEBHOOK_SECRET")
          ? "Nema STRIPE_WEBHOOK_SECRET: plaćanja se ne bi mogla potvrditi, pa je kupnja isključena."
          : stripeKey.startsWith("sk_test_")
            ? "Testni način (sk_test_…). Naplate nisu stvarne."
            : "Stvarni ključ: naplate su stvarne.",
    },
    {
      name: "E-mail obavijesti",
      ok: has("RESEND_API_KEY"),
      detail: has("RESEND_API_KEY")
        ? `Šalje se s adrese ${env.emailFrom}.`
        : "Nema RESEND_API_KEY: obavijesti se samo zapisuju u dnevnik poslužitelja.",
    },
    {
      name: "Zakazani posao",
      ok: has("CRON_SECRET"),
      detail: has("CRON_SECRET")
        ? "Tajna je postavljena. Provjeri da je posao zakazan (README, korak g)."
        : "Nema CRON_SECRET: podsjetnici i odgođeni pokloni se ne šalju.",
    },
    {
      name: "Zaštita obrazaca (Turnstile)",
      ok: has("TURNSTILE_SECRET_KEY") === has("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
      detail:
        has("TURNSTILE_SECRET_KEY") && has("NEXT_PUBLIC_TURNSTILE_SITE_KEY")
          ? "Uključena."
          : has("TURNSTILE_SECRET_KEY") || has("NEXT_PUBLIC_TURNSTILE_SITE_KEY")
            ? "Postavljen je samo jedan od dva ključa: poruke u knjizi sjećanja neće prolaziti dok ne postaviš oba."
            : "Nije uključena; rade zamka i ograničenja učestalosti.",
    },
    {
      name: "Adresa posjetitelja",
      ok: ipHeaderWorks,
      detail: [
        `Poslužitelj te sada vidi kao ${seenIp}.`,
        ipHeaderWorks
          ? `Čita se iz zaglavlja ${ipHeader}.`
          : ipHeader
            ? `Zaglavlje ${ipHeader} iz CLIENT_IP_HEADER nije stiglo, pa se uzima prva adresa iz x-forwarded-for.`
            : "CLIENT_IP_HEADER nije postavljen, pa se uzima prva adresa iz x-forwarded-for.",
        `U x-forwarded-for stiže adresa: ${forwardedCount}. Druga zaglavlja posrednika: ${proxyHeaders.length > 0 ? proxyHeaders.join(", ") : "nema"}.`,
        ipHeaderWorks
          ? ""
          : "Ako je gore tvoja prava adresa i među zaglavljima je cf-connecting-ip, upiši ga u CLIENT_IP_HEADER: tada se ograničenja učestalosti ne mogu zaobići podmetnutom adresom.",
      ]
        .filter((part) => part !== "")
        .join(" "),
    },
    {
      name: "AI pomoćnik za priču",
      ok: has("ANTHROPIC_API_KEY"),
      detail: has("ANTHROPIC_API_KEY") ? "Uključen." : "Nema ANTHROPIC_API_KEY: pomoćnik je isključen, ostalo radi.",
    },
    {
      name: "Donacije",
      ok: Boolean(settings?.active_shelter_id),
      detail: settings?.active_shelter_id
        ? "Azil je odabran i prikazuje se javno."
        : "Azil još nije odabran: iznosi se bilježe, a javna stranica kaže da će azil biti objavljen.",
    },
    {
      name: "Plaćanja koja traže pažnju",
      ok: (events ?? []).length === 0,
      detail:
        (events ?? []).length === 0
          ? "Nema zabilježenih problema."
          : "Postoje Stripe događaji s napomenom. Pogledaj Cijene i postavke.",
    },
  ];

  return (
    <>
      <Card className="flex flex-col">
        <ul className="flex flex-col">
          {checks.map((check) => (
            <li key={check.name} className="flex flex-col gap-1 border-b border-line py-3.5 last:border-b-0">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{check.name}</span>
                <Chip tone={check.ok ? "mint" : "butter"} className="px-2.5 py-0.5 text-[13px]">
                  {check.ok ? "u redu" : "provjeri"}
                </Chip>
              </span>
              <span className="text-[15px] text-plum-soft [overflow-wrap:anywhere]">{check.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">Probni e-mail</h2>
        <p className="text-plum-soft">Šalje jednu poruku na tvoju adresu, istim putem kojim idu obavijesti vlasnicima.</p>
        <TestEmailForm />
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="text-2xl font-extrabold">Što se odavde ne vidi</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
          <li>Je li u Supabaseu uključena potvrda e-maila („Confirm email”) i anonimna prijava.</li>
          <li>Jesu li postavljeni hrvatski predlošci e-maila i vlastiti SMTP za kodove prijave.</li>
          <li>Je li Stripe webhook pretplaćen na svih pet događaja.</li>
        </ul>
        <p className="text-sm text-plum-soft">Koraci su u README-u, odjeljak „Postavljanje za produkciju”.</p>
      </Card>
    </>
  );
}

export default function SystemPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Stanje sustava</h1>
      <Suspense fallback={<Card className="min-h-96" />}>
        <Status />
      </Suspense>
    </>
  );
}
