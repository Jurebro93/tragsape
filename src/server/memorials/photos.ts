import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoVariant } from "@/lib/memorial";
import type { Database } from "@/server/supabase/database.types";

export const MEDIA_BUCKET = "memorial-media";
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const VARIANTS: Array<{ name: PhotoVariant; size: number; quality: number }> = [
  { name: "full", size: 2000, quality: 82 },
  { name: "medium", size: 1200, quality: 80 },
  { name: "thumb", size: 480, quality: 76 },
];

export function variantPath(storagePath: string, variant: PhotoVariant): string {
  return `${storagePath}/${variant}.webp`;
}

export type ProcessedPhoto = {
  width: number;
  height: number;
  files: Array<{ variant: PhotoVariant; data: Buffer }>;
};

/**
 * Čita sliku, ispravlja orijentaciju i radi tri inačice u WebP-u. Izlaz ne nosi metapodatke,
 * pa s fotografije nestaju EXIF i GPS lokacija. Baca grešku ako datoteka nije slika.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const files: ProcessedPhoto["files"] = [];
  let width = 0;
  let height = 0;
  for (const variant of VARIANTS) {
    const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: variant.size, height: variant.size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toBuffer({ resolveWithObject: true });
    files.push({ variant: variant.name, data });
    if (variant.name === "full") {
      width = info.width;
      height = info.height;
    }
  }
  return { width, height, files };
}

export async function removePhotoFiles(client: SupabaseClient<Database>, storagePath: string): Promise<void> {
  await client.storage.from(MEDIA_BUCKET).remove(VARIANTS.map((variant) => variantPath(storagePath, variant.name)));
}
