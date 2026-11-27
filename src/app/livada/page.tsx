import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";
import { ExampleGrid } from "@/components/examples/example-card";
import { CandleHour } from "@/components/livada/candle-hour";
import { MemorialGrid } from "@/components/livada/memorial-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TrailBackdrop } from "@/components/trail-backdrop";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { EXAMPLE_PETS } from "@/lib/examples";
import { SPECIES } from "@/lib/species";
import { livada } from "@/messages/hr/livada";
import { listLivada, listLivadaBreeds } from "@/server/memorials/livada";

export const metadata: Metadata = {
  title: livada.title,
  description: livada.metaDescription,
  alternates: { canonical: "/livada" },
};

function first(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.trim() !== "" ? single.trim().slice(0, 80) : null;
}

function livadaHref(species: string | null, breed: string | null, page: number): Route {
  const query = new URLSearchParams();
  if (species) {
    query.set("vrsta", species);
  }
  if (breed) {
    query.set("pasmina", breed);
  }
  if (page > 0) {
    query.set("stranica", String(page + 1));
  }
  const suffix = query.toString();
  return (suffix ? `/livada?${suffix}` : "/livada") as Route;
}

async function Meadow({ searchParams }: Pick<PageProps<"/livada">, "searchParams">) {
  const params = await searchParams;
  const requestedSpecies = first(params.vrsta);
  const species = SPECIES.some((item) => item.key === requestedSpecies) ? requestedSpecies : null;
  const breed = first(params.pasmina)?.toLowerCase() ?? null;
  const page = Math.max(0, Math.min(500, Number(first(params.stranica) ?? "1") - 1 || 0));
  const [{ items, hasMore }, breeds] = await Promise.all([listLivada(species, breed, page), listLivadaBreeds(species)]);
  const filtered = Boolean(species || breed);

  return (
    <div className="flex flex-col gap-5">
      <form method="get" action="/livada" className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-sm font-bold">
          {livada.filter.species}
          <Select name="vrsta" defaultValue={species ?? ""}>
            <option value="">{livada.filter.allSpecies}</option>
            {SPECIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {livada.filter.breed}
          <Select name="pasmina" defaultValue={breed ?? ""}>
            <option value="">{livada.filter.allBreeds}</option>
            {breeds.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary" size="md" className="col-span-2 min-h-13 sm:col-span-1">
          {livada.filter.apply}
        </Button>
      </form>

      {items.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <h2 className="text-2xl font-extrabold">{filtered ? livada.empty.filtered : livada.empty.title}</h2>
          {filtered ? (
            <ButtonLink href="/livada" variant="quiet">
              {livada.filter.clear}
            </ButtonLink>
          ) : (
            <>
              <p className="text-plum-soft">{livada.empty.body}</p>
              <ButtonLink href="/izradi">{livada.empty.action}</ButtonLink>
            </>
          )}
        </Card>
      ) : (
        <MemorialGrid memorials={items} />
      )}

      {page > 0 || hasMore ? (
        <nav className="flex justify-between gap-3" aria-label="Stranice">
          {page > 0 ? (
            <ButtonLink href={livadaHref(species, breed, page - 1)} variant="secondary" size="md">
              {livada.previous}
            </ButtonLink>
          ) : (
            <span />
          )}
          {hasMore ? (
            <ButtonLink href={livadaHref(species, breed, page + 1)} variant="secondary" size="md">
              {livada.next}
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default function LivadaPage(props: PageProps<"/livada">) {
  return (
    <>
      <SiteHeader tone="butter" />
      <div className="relative overflow-hidden rounded-b-[40px] bg-butter">
        <TrailBackdrop />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 pb-28 pt-6 sm:pb-32">
          <h1 className="text-5xl font-extrabold">{livada.title}</h1>
          <p className="max-w-xl text-lg">{livada.intro}</p>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-16 pt-7">
        <CandleHour />
        <Suspense fallback={<div className="min-h-96 rounded-3xl bg-white" />}>
          <Meadow searchParams={props.searchParams} />
        </Suspense>
        <section aria-labelledby="primjeri-title" className="flex flex-col gap-4 pt-4">
          <h2 id="primjeri-title" className="font-display text-3xl font-extrabold">
            {livada.examples.title}
          </h2>
          <ExampleGrid pets={EXAMPLE_PETS} />
          <p className="text-sm text-plum-soft">{livada.examples.note}</p>
        </section>
        <section aria-labelledby="kako-title" className="flex flex-col gap-4 pt-4">
          <h2 id="kako-title" className="font-display text-3xl font-extrabold">
            {livada.about.title}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {livada.about.items.map((item) => (
              <li key={item.title} className="flex flex-col gap-1 rounded-3xl bg-white p-5">
                <span className="font-display text-xl font-extrabold">{item.title}</span>
                <span className="leading-snug text-plum-soft">{item.body}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
