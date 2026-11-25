import type { Route } from "next";
import Link from "next/link";
import type { Memorial } from "@/lib/memorial";
import { memorial as messages } from "@/messages/hr/memorial";
import { getViewer } from "@/server/auth";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Traka koju vide samo vlasnik i suradnici: stanje spomena i put do upravljanja.
 * Čita sesiju, pa se prikazuje unutar <Suspense> i ne ulazi u predmemoriranu stranicu.
 */
export async function OwnerBar({ memorial }: { memorial: Pick<Memorial, "id" | "ownerId" | "status" | "visibility"> }) {
  const viewer = await getViewer();
  if (!viewer) {
    return null;
  }
  let canEdit = viewer.id === memorial.ownerId;
  if (!canEdit) {
    const supabase = await createSessionClient();
    const { data } = await supabase.rpc("can_edit_memorial", { p_memorial_id: memorial.id });
    canEdit = data === true;
  }
  if (!canEdit) {
    return null;
  }
  const note =
    memorial.status === "draft"
      ? messages.ownerBar.draft
      : memorial.status === "hidden"
        ? messages.ownerBar.hidden
        : memorial.visibility === "private"
          ? messages.ownerBar.private
          : memorial.visibility === "unlisted"
            ? messages.ownerBar.unlisted
            : messages.ownerBar.yours;
  return (
    <div className="mx-5 mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-plum px-4 py-2.5 text-[15px] text-white">
      <span>{note}</span>
      <Link href={`/moji-ljubimci/${memorial.id}` as Route} className="min-h-11 content-center font-bold text-butter">
        {messages.ownerBar.manage}
      </Link>
    </div>
  );
}
