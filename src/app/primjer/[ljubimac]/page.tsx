import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExampleIllustration } from "@/components/memorial/example-illustration";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import { exampleMemorial, examplePath, isExamplePetKey } from "@/lib/example-memorials";
import { EXAMPLE_PETS } from "@/lib/examples";

/** Primjeri osim Meda, koji je na /primjer. Svi su izmišljeni i označeni kao primjer. */
export function generateStaticParams(): Array<{ ljubimac: string }> {
  return EXAMPLE_PETS.filter((pet) => pet.key !== "medo").map((pet) => ({ ljubimac: pet.key }));
}

export async function generateMetadata({ params }: PageProps<"/primjer/[ljubimac]">): Promise<Metadata> {
  const { ljubimac } = await params;
  if (!isExamplePetKey(ljubimac) || ljubimac === "medo") {
    return { title: "Primjer memorijala", robots: { index: false, follow: false } };
  }
  const { memorial } = exampleMemorial(ljubimac);
  return {
    title: `Primjer memorijala: ${memorial.breed ?? memorial.name}`,
    description: "Pogledaj kako izgleda spomen-stranica na Tragu šape. Ljubimac na ovom primjeru je izmišljen.",
    alternates: { canonical: examplePath(ljubimac) },
  };
}

export default async function ExamplePetPage({ params }: PageProps<"/primjer/[ljubimac]">) {
  const { ljubimac } = await params;
  if (!isExamplePetKey(ljubimac) || ljubimac === "medo") {
    notFound();
  }
  return (
    <MemorialScreen
      view={exampleMemorial(ljubimac)}
      mode="example"
      illustration={<ExampleIllustration pet={ljubimac} />}
    />
  );
}
