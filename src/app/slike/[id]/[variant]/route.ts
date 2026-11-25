import { MEDIA_BUCKET, variantPath } from "@/server/memorials/photos";
import { createAdminClient } from "@/server/supabase/admin";
import { createSessionClient } from "@/server/supabase/session";
import type { PhotoVariant } from "@/lib/memorial";

const VARIANTS: PhotoVariant[] = ["thumb", "medium", "full"];

/**
 * Poslužuje fotografiju memorijala. Pristup odlučuje RLS: redak fotografije čita se kao
 * posjetitelj (sa sesijom i, za „samo s linkom", ključem iz adrese). Tek nakon toga
 * datoteka se dohvaća servisnim ključem.
 */
export async function GET(request: Request, context: RouteContext<"/slike/[id]/[variant]">) {
  const { id, variant } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !VARIANTS.includes(variant as PhotoVariant)) {
    return new Response(null, { status: 404 });
  }
  const shareKey = new URL(request.url).searchParams.get("k");
  const supabase = await createSessionClient({ shareKey });
  const { data: photo } = await supabase
    .from("memorial_photos")
    .select("id, memorial_id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!photo) {
    return new Response(null, { status: 404 });
  }
  const { data: memorial } = await supabase
    .from("memorials")
    .select("status, visibility")
    .eq("id", photo.memorial_id)
    .maybeSingle();

  const { data: file, error } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .download(variantPath(photo.storage_path, variant as PhotoVariant));
  if (error || !file) {
    return new Response(null, { status: 404 });
  }

  // Samo slike javnih, objavljenih memorijala smiju u dijeljenu predmemoriju.
  const isPublic = memorial?.status === "published" && memorial.visibility === "public";
  return new Response(file, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": isPublic ? "public, max-age=86400, s-maxage=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
