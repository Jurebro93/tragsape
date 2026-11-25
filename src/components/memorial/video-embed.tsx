"use client";

import { useState } from "react";
import { parseVideoUrl } from "@/components/owner/video-url";
import { isSupportedVideoUrl } from "@/lib/validation";
import { videoEmbed } from "@/messages/hr/owner";

function PlayIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l11-6.8a1 1 0 0 0 0-1.8l-11-6.8a1 1 0 0 0-1.5.9z" fill="currentColor" />
    </svg>
  );
}

/**
 * Video s YouTubea ili Vimea koji se učitava tek na klik. Dok posjetitelj ne pritisne gumb,
 * stranica ne šalje nijedan zahtjev trećoj strani: nema ni sličice ni okvira. Za poveznice koje
 * ne podržavamo ne prikazuje ništa.
 */
export function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const [loaded, setLoaded] = useState(false);
  const video = isSupportedVideoUrl(url) ? parseVideoUrl(url) : null;
  if (!video) {
    return null;
  }
  const label = title && title.trim() !== "" ? title : videoEmbed.defaultTitle;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-plum">
        {loaded ? (
          <iframe
            src={video.embedUrl}
            title={label}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="absolute inset-0 flex size-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl text-white focus-visible:-outline-offset-4 focus-visible:outline-butter"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-white text-terracotta">
              <PlayIcon />
            </span>
            <span className="text-[17px] font-bold">{videoEmbed.show}</span>
            {title && title.trim() !== "" ? <span className="sr-only">{title}</span> : null}
          </button>
        )}
      </div>
      <p className="text-sm text-plum-soft">{videoEmbed.notice[video.provider]}</p>
    </div>
  );
}
