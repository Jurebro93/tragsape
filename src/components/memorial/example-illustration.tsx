import { PetArt } from "@/components/examples/pet-art";
import type { ExamplePetKey } from "@/lib/examples";

/** Crtež izmišljenog ljubimca za stranicu primjera. Stoji umjesto fotografije. */
export function ExampleIllustration({ pet }: { pet: ExamplePetKey }) {
  return <PetArt pet={pet} />;
}
