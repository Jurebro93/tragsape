import type { Route } from "next";
import Link from "next/link";
import { PetArt } from "@/components/examples/pet-art";
import { CandleIcon } from "@/components/icons";
import { examplePath } from "@/lib/example-memorials";
import type { ExamplePet } from "@/lib/examples";
import { plural } from "@/lib/text";
import { livada } from "@/messages/hr/livada";
import { marketing } from "@/messages/hr/marketing";

/** Kartica izmišljenog ljubimca, izgledom jednaka kartici na Livadi i uvijek označena kao primjer. */
export function ExampleCard({ pet }: { pet: ExamplePet }) {
  return (
    <Link
      href={examplePath(pet.key) as Route}
      className="relative flex h-full flex-col items-center gap-2 rounded-3xl bg-white px-3 pb-4 pt-5 text-center text-plum no-underline hover:bg-butter"
    >
      <span className="absolute right-2.5 top-2.5 rounded-full bg-plum px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        {marketing.home.species.badge}
      </span>
      <span className="size-24 overflow-hidden rounded-full shadow-[0_0_0_4px_var(--color-sun)]">
        <PetArt pet={pet.key} />
      </span>
      <span className="mt-1 font-display text-xl font-extrabold leading-tight">{pet.name}</span>
      <span className="text-sm text-plum-soft">{pet.kind}</span>
      <span className="text-sm">{pet.years}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm text-plum-soft">
        <CandleIcon size={16} />
        {plural(pet.candles, livada.card.candles)}
      </span>
    </Link>
  );
}

export function ExampleGrid({ pets }: { pets: readonly ExamplePet[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {pets.map((pet) => (
        <li key={pet.key}>
          <ExampleCard pet={pet} />
        </li>
      ))}
    </ul>
  );
}
