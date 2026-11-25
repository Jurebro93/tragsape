/* eslint-disable @next/next/no-img-element -- slike poslužuje vlastita ruta koja provjerava pristup */
import type { ReactNode } from "react";
import { PawIcon } from "@/components/icons";
import { photoUrl, type Photo } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { memorial as messages } from "@/messages/hr/memorial";

/** Okrugla naslovna fotografija sa sunčanim prstenom. Bez fotografije prikazuje trag šape. */
export function PetPortrait({
  photo,
  name,
  shareKey,
  illustration,
}: {
  photo: Photo | null;
  name: string;
  shareKey: string | null;
  illustration?: ReactNode;
}) {
  return (
    <div className="size-56 overflow-hidden rounded-full border-[6px] border-white bg-mint shadow-[0_0_0_5px_var(--color-sun)]">
      {illustration ? (
        illustration
      ) : photo ? (
        <img
          src={photoUrl(photo.id, "medium", shareKey)}
          srcSet={`${photoUrl(photo.id, "thumb", shareKey)} 480w, ${photoUrl(photo.id, "medium", shareKey)} 1200w`}
          sizes="224px"
          alt={fill(messages.photoAlt, { name })}
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-teal" role="img" aria-label={messages.noPhoto}>
          <PawIcon size={84} />
        </div>
      )}
    </div>
  );
}
