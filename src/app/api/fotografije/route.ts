import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth";
import {
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  processPhoto,
  removePhotoFiles,
  variantPath,
} from "@/server/memorials/photos";
import { createSessionClient } from "@/server/supabase/session";

/**
 * Učitavanje fotografije. Sve radi korisnikova sesija: RLS odlučuje smije li uređivati
 * memorijal, a baza provjerava ograničenje broja fotografija po paketu.
 */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }
  const memorialId = String(form.get("memorialId") ?? "");
  const file = form.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(memorialId) || !(file instanceof File)) {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "size" }, { status: 413 });
  }

  let processed;
  try {
    processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "type" }, { status: 415 });
  }

  const supabase = await createSessionClient();
  const photoId = crypto.randomUUID();
  const storagePath = `${memorialId}/${photoId}`;

  // Redak ide prvi: ako korisnik nema pravo ili je dosegnuto ograničenje, ništa se ne učitava.
  const { data: maxRow } = await supabase
    .from("memorial_photos")
    .select("sort_order")
    .eq("memorial_id", memorialId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder = (maxRow?.[0]?.sort_order ?? -1) + 1;
  const { error: insertError } = await supabase.from("memorial_photos").insert({
    id: photoId,
    memorial_id: memorialId,
    storage_path: storagePath,
    width: processed.width,
    height: processed.height,
    sort_order: sortOrder,
    created_by: viewer.id,
  });
  if (insertError) {
    const limit = insertError.message.includes("photo_limit");
    return NextResponse.json({ error: limit ? "limit" : "forbidden" }, { status: limit ? 409 : 403 });
  }

  for (const item of processed.files) {
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(variantPath(storagePath, item.variant), item.data, { contentType: "image/webp", upsert: false });
    if (error) {
      await removePhotoFiles(supabase, storagePath);
      await supabase.from("memorial_photos").delete().eq("id", photoId);
      return NextResponse.json({ error: "generic" }, { status: 500 });
    }
  }

  // Prva fotografija postaje naslovna.
  const { data: memorial } = await supabase
    .from("memorials")
    .select("id, slug, status, cover_photo_id")
    .eq("id", memorialId)
    .maybeSingle();
  let isCover = false;
  if (memorial && memorial.cover_photo_id === null) {
    await supabase.from("memorials").update({ cover_photo_id: photoId }).eq("id", memorialId);
    isCover = true;
  }
  if (memorial && memorial.status === "published") {
    revalidateTag(`memorial:${memorial.id}`, "max");
    revalidateTag(`memorial-slug:${memorial.slug}`, "max");
  }

  return NextResponse.json({
    photo: {
      id: photoId,
      caption: null,
      width: processed.width,
      height: processed.height,
      sortOrder,
      kind: "photo",
    },
    isCover,
  });
}
