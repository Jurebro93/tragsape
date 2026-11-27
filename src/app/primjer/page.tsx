import type { Metadata } from "next";
import { ExampleIllustration } from "@/components/memorial/example-illustration";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import { exampleMemorial } from "@/lib/example-memorials";

export const metadata: Metadata = {
  title: "Primjer memorijala",
  description: "Pogledaj kako izgleda spomen-stranica na Tragu šape. Ljubimac na ovom primjeru je izmišljen.",
};

/** Izmišljeni ljubimac, jasno označen kao primjer. Nijedan podatak ne dolazi iz baze. */
export default function ExamplePage() {
  return <MemorialScreen view={exampleMemorial("medo")} mode="example" illustration={<ExampleIllustration pet="medo" />} />;
}
