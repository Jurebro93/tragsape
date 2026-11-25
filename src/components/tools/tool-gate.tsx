import "server-only";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getTool, type ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";
import { getViewer } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Nacrt alata vidi samo admin. Svima ostalima, i neprijavljenima, stranica ne postoji:
 * ne vodi se na prijavu, da se ne otkriva da nacrt postoji. Provjeru uloge radi baza (`is_admin`).
 */
async function AdminOnly({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    notFound();
  }
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) {
    notFound();
  }
  return (
    <>
      <p
        role="status"
        data-print="hide"
        className="w-full bg-plum px-5 py-2.5 text-center text-[15px] font-bold text-white"
      >
        {tools.common.draftBar}
      </p>
      {children}
    </>
  );
}

/**
 * Omotač stranice alata. Javni alat prolazi bez ikakve provjere i ostaje statičan.
 * Nacrt se cijeli prikazuje tek nakon provjere uloge, pa njegov sadržaj nikad ne ulazi
 * u prerenderiranu ljusku; sesija se čita unutar <Suspense>.
 */
export function ToolGate({ slug, children }: { slug: ToolSlug; children: ReactNode }) {
  if (getTool(slug).status === "public") {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-vanilla" />}>
      <AdminOnly>{children}</AdminOnly>
    </Suspense>
  );
}
