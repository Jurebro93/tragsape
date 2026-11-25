/**
 * Čita poveznicu na video i vraća samo ono što je sigurno ugraditi: pružatelja i identifikator
 * provjerenog oblika. Adresa za ugradnju slaže se od nule, pa ništa iz korisnikove poveznice
 * (putanja, parametri) ne ulazi u `src` okvira.
 */

export type ParsedVideo =
  | { provider: "youtube"; id: string; embedUrl: string }
  | { provider: "vimeo"; id: string; hash: string | null; embedUrl: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,32}$/;

function youtubeId(url: URL, host: string): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") {
    return segments[0] ?? null;
  }
  if (segments[0] === "watch") {
    return url.searchParams.get("v");
  }
  if (["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) {
    return segments[1] ?? null;
  }
  return null;
}

function vimeoParts(url: URL): { id: string; hash: string | null } | null {
  const segments = url.pathname.split("/").filter(Boolean);
  // vimeo.com/123, vimeo.com/123/abcdef (nenavedeni video), vimeo.com/channels/ime/123,
  // vimeo.com/groups/ime/videos/123
  let rest = segments;
  if (segments[0] === "channels" && segments.length >= 3) {
    rest = segments.slice(2);
  } else if (segments[0] === "groups" && segments[2] === "videos") {
    rest = segments.slice(3);
  }
  const [id, hash] = rest;
  if (!id || !VIMEO_ID.test(id) || rest.length > 2) {
    return null;
  }
  if (hash !== undefined && !VIMEO_HASH.test(hash)) {
    return null;
  }
  return { id, hash: hash ?? url.searchParams.get("h")?.match(VIMEO_HASH)?.[0] ?? null };
}

export function parseVideoUrl(value: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id = youtubeId(url, host);
    if (!id || !YOUTUBE_ID.test(id)) {
      return null;
    }
    return { provider: "youtube", id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "vimeo.com") {
    const parts = vimeoParts(url);
    if (!parts) {
      return null;
    }
    const query = parts.hash ? `?h=${parts.hash}&dnt=1` : "?dnt=1";
    return { provider: "vimeo", id: parts.id, hash: parts.hash, embedUrl: `https://player.vimeo.com/video/${parts.id}${query}` };
  }
  return null;
}
