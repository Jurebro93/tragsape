import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemorialScreen } from "@/components/memorial/memorial-screen";
import { OwnerBar } from "@/components/memorial/owner-bar";
import { common } from "@/messages/hr/common";
import { getUnlistedMemorialByKey } from "@/server/memorials/access";

// Spomen „samo s linkom" nikad se ne indeksira i ne otkriva ime u naslovu kartice za dijeljenje.
export const metadata: Metadata = {
  title: common.brand,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Content({ params }: Pick<PageProps<"/s/[kljuc]">, "params">) {
  const { kljuc } = await params;
  const view = await getUnlistedMemorialByKey(kljuc);
  if (!view) {
    notFound();
  }
  return (
    <MemorialScreen
      view={view}
      ownerBar={
        <Suspense fallback={null}>
          <OwnerBar memorial={view.memorial} />
        </Suspense>
      }
    />
  );
}

export default function UnlistedMemorialPage(props: PageProps<"/s/[kljuc]">) {
  return (
    <Suspense fallback={<div className="min-h-screen rounded-b-[40px] bg-butter" />}>
      <Content params={props.params} />
    </Suspense>
  );
}
