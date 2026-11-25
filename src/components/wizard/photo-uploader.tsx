"use client";

/* eslint-disable @next/next/no-img-element -- slike poslužuje vlastita ruta koja provjerava pristup */
import { useRef, useState } from "react";
import { deletePhotoAction, setCoverAction, setPhotoCaptionAction } from "@/app/izradi/actions";
import { CameraIcon, TrashIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { photoUrl, type Photo } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { wizard } from "@/messages/hr/wizard";

const MAX_EDGE = 2000;
const text = wizard.story.photos;

/**
 * Smanjuje fotografiju u pregledniku prije slanja: brže učitavanje na mobilnoj mreži.
 * Ako preglednik ne može pročitati sliku, šalje se izvornik i odlučuje poslužitelj.
 */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

const errorText: Record<string, string> = {
  limit: text.errorLimit,
  type: text.errorType,
  size: text.errorSize,
};

export function PhotoUploader({
  memorialId,
  initialPhotos,
  initialCoverId,
  limit,
  isPaid,
}: {
  memorialId: string;
  initialPhotos: Photo[];
  initialCoverId: string | null;
  limit: number;
  isPaid: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos.filter((photo) => photo.kind === "photo"));
  const [coverId, setCoverId] = useState(initialCoverId ?? initialPhotos[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.set("memorialId", memorialId);
        body.set("file", await downscale(file), "fotografija.jpg");
        const response = await fetch("/api/fotografije", { method: "POST", body });
        const data = (await response.json().catch(() => ({}))) as {
          photo?: Photo;
          isCover?: boolean;
          error?: string;
        };
        if (!response.ok || !data.photo) {
          setError(errorText[data.error ?? ""] ?? text.errorGeneric);
          break;
        }
        const added = data.photo;
        setPhotos((current) => [...current, added]);
        if (data.isCover) {
          setCoverId(added.id);
        }
      } catch {
        setError(text.errorGeneric);
        break;
      }
    }
    setBusy(false);
    if (input.current) {
      input.current.value = "";
    }
  }

  async function makeCover(photoId: string) {
    const previous = coverId;
    setCoverId(photoId);
    const result = await setCoverAction(memorialId, photoId);
    if (!result.ok) {
      setCoverId(previous);
      setError(result.error);
    }
  }

  async function remove(photoId: string) {
    const result = await deletePhotoAction(memorialId, photoId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhotos((current) => {
      const next = current.filter((photo) => photo.id !== photoId);
      if (coverId === photoId) {
        setCoverId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  const full = photos.length >= limit;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-plum-soft">{fill(isPaid ? text.hintPaid : text.hintFree, { n: limit })}</p>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {photos.map((photo, index) => {
            const isCover = photo.id === coverId;
            return (
              <li key={photo.id} className="flex flex-col gap-1.5">
                <div className="relative overflow-hidden rounded-2xl bg-mint">
                  <img
                    src={photoUrl(photo.id, "thumb")}
                    alt={fill(text.alt, { n: index + 1 })}
                    className="aspect-square w-full object-cover"
                  />
                  {isCover ? (
                    <span className="absolute left-2 top-2 rounded-full bg-plum px-2.5 py-1 text-xs font-bold text-white">
                      {text.cover}
                    </span>
                  ) : null}
                </div>
                {isPaid ? (
                  <input
                    defaultValue={photo.caption ?? ""}
                    maxLength={200}
                    aria-label={fill(text.caption, { n: index + 1 })}
                    placeholder={text.captionPlaceholder}
                    className="min-h-11 w-full rounded-xl border-2 border-line bg-white px-3 text-sm focus:border-teal focus:outline-none"
                    onBlur={(event) => {
                      const value = event.target.value;
                      if (value !== (photo.caption ?? "")) {
                        void setPhotoCaptionAction(memorialId, photo.id, value).then((result) => {
                          if (!result.ok) {
                            setError(result.error);
                          } else {
                            setPhotos((current) =>
                              current.map((item) => (item.id === photo.id ? { ...item, caption: value.trim() || null } : item)),
                            );
                          }
                        });
                      }
                    }}
                  />
                ) : null}
                <div className="flex items-center justify-between gap-1">
                  {isCover ? (
                    <span />
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeCover(photo.id)}
                      className="min-h-11 text-left text-sm font-semibold text-teal underline underline-offset-4"
                    >
                      {text.makeCover}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(photo.id)}
                    aria-label={`${text.remove}: ${fill(text.alt, { n: index + 1 })}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-plum-soft hover:bg-butter hover:text-plum"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="sr-only"
        id="photo-input"
        disabled={busy || full}
        onChange={(event) => upload(event.target.files)}
      />
      <label
        htmlFor="photo-input"
        className={buttonClass("secondary", "lg", busy || full ? "pointer-events-none opacity-60" : "cursor-pointer")}
      >
        <CameraIcon />
        {busy ? text.uploading : text.add}
      </label>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
