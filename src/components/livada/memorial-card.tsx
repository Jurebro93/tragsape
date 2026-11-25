/* eslint-disable @next/next/no-img-element -- slike poslužuje vlastita ruta koja provjerava pristup */
import type { Route } from "next";
import Link from "next/link";
import { CandleIcon, PawIcon } from "@/components/icons";
import { formatPetDate } from "@/lib/format";
import { photoUrl } from "@/lib/memorial";
import { speciesLabel } from "@/lib/species";
import { plural } from "@/lib/text";
import { livada } from "@/messages/hr/livada";
import type { MemorialCard } from "@/server/memorials/livada";

/** Kartica ljubimca na Livadi i obiteljskoj stranici. Cijela kartica je poveznica. */
export function MemorialCardLink({ memorial }: { memorial: MemorialCard }) {
  const kind = memorial.breed ?? speciesLabel(memorial.species);
  const years = [formatPetDate(memorial.birthDate, "year"), formatPetDate(memorial.deathDate, "year")]
    .filter(Boolean)
    .join(" – ");
  return (
    <Link
      href={`/spomen/${memorial.slug}` as Route}
      className="flex h-full flex-col items-center gap-2 rounded-3xl bg-white px-3 pb-4 pt-5 text-center text-plum no-underline hover:bg-butter"
    >
      <span className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-mint text-teal shadow-[0_0_0_4px_var(--color-sun)]">
        {memorial.coverPhotoId ? (
          <img
            src={photoUrl(memorial.coverPhotoId, "thumb")}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <PawIcon size={40} />
        )}
      </span>
      <span className="mt-1 font-display text-xl font-extrabold leading-tight [overflow-wrap:anywhere]">
        {memorial.name}
      </span>
      {kind ? <span className="text-sm text-plum-soft">{kind}</span> : null}
      {years ? <span className="text-sm">{years}</span> : null}
      {memorial.candleCount > 0 ? (
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm text-plum-soft">
          <CandleIcon size={16} />
          {plural(memorial.candleCount, livada.card.candles)}
        </span>
      ) : null}
    </Link>
  );
}

export function MemorialGrid({ memorials }: { memorials: MemorialCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {memorials.map((memorial) => (
        <li key={memorial.id}>
          <MemorialCardLink memorial={memorial} />
        </li>
      ))}
    </ul>
  );
}
