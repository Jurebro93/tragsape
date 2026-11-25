import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { PAW_PATH } from "@/components/icons";
import { formatLifespan } from "@/lib/format";
import type { MemorialView } from "@/lib/memorial";
import { speciesLabel } from "@/lib/species";
import { env } from "@/server/env";
import { MEDIA_BUCKET, variantPath } from "@/server/memorials/photos";
import { createAdminClient } from "@/server/supabase/admin";

/**
 * Slike za dijeljenje (OG, objava, story). Crtaju se samo za javne, objavljene memorijale;
 * pozivatelj je taj koji prije poziva provjerava da je memorijal javan.
 */

export type CardFormat = "og" | "objava" | "story";

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  objava: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

const DISPLAY = '"Bricolage", "Bricolage Ext"';
const SANS = '"DM Sans", "DM Sans Ext"';

const colors = {
  vanilla: "#FFFAF0",
  butter: "#FFE7A8",
  sun: "#F8B93B",
  terracotta: "#C2451F",
  plum: "#33242B",
  plumSoft: "#6B5560",
  teal: "#1F6F6B",
  mint: "#D5ECE8",
};

type FontEntry = { name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" };

let fontsPromise: Promise<FontEntry[]> | null = null;

/** Fontovi brenda s podskupom latin-ext, da č, ć, ž, š i đ izgledaju kao ostala slova. */
export function loadCardFonts(): Promise<FontEntry[]> {
  fontsPromise ??= (async () => {
    const base = join(process.cwd(), "node_modules", "@fontsource");
    const file = (pkg: string, name: string) => readFile(join(base, pkg, "files", name));
    const [displayLatin, displayExt, sansLatin, sansExt, sansBoldLatin, sansBoldExt] = await Promise.all([
      file("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff"),
      file("bricolage-grotesque", "bricolage-grotesque-latin-ext-800-normal.woff"),
      file("dm-sans", "dm-sans-latin-500-normal.woff"),
      file("dm-sans", "dm-sans-latin-ext-500-normal.woff"),
      file("dm-sans", "dm-sans-latin-700-normal.woff"),
      file("dm-sans", "dm-sans-latin-ext-700-normal.woff"),
    ]);
    // Podskup latin-ext ima vlastito ime obitelji: tako se č, ć, ž, š i đ traže u istom pismu
    // i debljini, a ne u prvom fontu koji slučajno ima taj znak.
    return [
      { name: "Bricolage", data: displayLatin, weight: 800, style: "normal" },
      { name: "Bricolage Ext", data: displayExt, weight: 800, style: "normal" },
      { name: "DM Sans", data: sansLatin, weight: 500, style: "normal" },
      { name: "DM Sans Ext", data: sansExt, weight: 500, style: "normal" },
      { name: "DM Sans", data: sansBoldLatin, weight: 700, style: "normal" },
      { name: "DM Sans Ext", data: sansBoldExt, weight: 700, style: "normal" },
    ];
  })();
  return fontsPromise;
}

/** Naslovna fotografija kao kvadratni JPEG u data URL-u, ili null ako je nema. */
export async function coverDataUrl(view: MemorialView): Promise<string | null> {
  const cover = view.photos.find((photo) => photo.id === view.memorial.coverPhotoId) ?? view.photos[0];
  if (!cover) {
    return null;
  }
  const { data } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .download(variantPath(`${view.memorial.id}/${cover.id}`, "medium"));
  if (!data) {
    return null;
  }
  try {
    const jpeg = await sharp(Buffer.from(await data.arrayBuffer()))
      .resize({ width: 720, height: 720, fit: "cover" })
      .jpeg({ quality: 84 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

function Paw({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={PAW_PATH} fill={color} />
    </svg>
  );
}

function Portrait({ photo, size }: { photo: string | null; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        border: `${Math.round(size * 0.035)}px solid ${colors.sun}`,
        background: colors.mint,
        overflow: "hidden",
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- crtež za ImageResponse
        <img src={photo} width={size} height={size} style={{ objectFit: "cover" }} />
      ) : (
        <Paw size={Math.round(size * 0.4)} color={colors.teal} />
      )}
    </div>
  );
}

/** JSX kartice za zadani format. Dugo ime se smanjuje da stane u jedan ili dva reda. */
export function renderCard(view: MemorialView, photo: string | null, format: CardFormat) {
  const { memorial } = view;
  const { width, height } = CARD_SIZES[format];
  const name = memorial.name || "Spomen";
  const kind = memorial.breed ?? speciesLabel(memorial.species);
  const lifespan = formatLifespan(
    { date: memorial.birthDate, precision: memorial.birthPrecision },
    { date: memorial.deathDate, precision: memorial.deathPrecision },
  );
  const landscape = format === "og";
  const baseNameSize = format === "og" ? 124 : format === "objava" ? 140 : 168;
  const nameSize = baseNameSize * (name.length > 14 ? 0.62 : name.length > 9 ? 0.8 : 1);
  const dedication =
    !landscape && memorial.dedication
      ? memorial.dedication.length > 150
        ? `${memorial.dedication.slice(0, 147).trimEnd()}…`
        : memorial.dedication
      : null;

  const brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Paw size={landscape ? 40 : 52} color={colors.terracotta} />
      <span style={{ fontFamily: DISPLAY, fontSize: landscape ? 34 : 44, fontWeight: 800, color: colors.plum }}>
        Trag šape
      </span>
    </div>
  );

  const details = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: landscape ? "flex-start" : "center",
        textAlign: landscape ? "left" : "center",
        gap: landscape ? 18 : 26,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: DISPLAY,
          fontSize: nameSize,
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: -3,
          color: colors.plum,
        }}
      >
        {name}
      </div>
      {kind ? (
        <div
          style={{
            display: "flex",
            padding: landscape ? "8px 22px" : "12px 30px",
            borderRadius: 999,
            background: colors.teal,
            color: "#FFFFFF",
            fontSize: landscape ? 28 : 38,
            fontWeight: 700,
          }}
        >
          {kind}
        </div>
      ) : null}
      {lifespan ? (
        <div style={{ display: "flex", fontSize: landscape ? 30 : 40, fontWeight: 500, color: colors.plum }}>
          {lifespan}
        </div>
      ) : null}
    </div>
  );

  if (landscape) {
    return (
      <div
        style={{
          display: "flex",
          width,
          height,
          background: colors.butter,
          fontFamily: SANS,
          padding: 64,
          alignItems: "center",
          gap: 64,
        }}
      >
        <Portrait photo={photo} size={420} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", justifyContent: "space-between" }}>
          {brand}
          {details}
          <div style={{ display: "flex", fontSize: 26, color: colors.plumSoft }}>Spomen-stranica ljubimca</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        background: colors.vanilla,
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: format === "story" ? 64 : 30,
          background: colors.butter,
          borderBottomLeftRadius: 96,
          borderBottomRightRadius: 96,
          padding: format === "story" ? "150px 80px 110px" : "52px 80px 56px",
        }}
      >
        {brand}
        <Portrait photo={photo} size={format === "story" ? 600 : 400} />
        {details}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: format === "story" ? "40px 96px" : "28px 80px",
          gap: format === "story" ? 40 : 24,
        }}
      >
        {dedication ? (
          <div
            style={{
              display: "flex",
              textAlign: "center",
              fontFamily: DISPLAY,
              fontSize: format === "story" ? 54 : 40,
              fontWeight: 800,
              lineHeight: 1.2,
              color: colors.plum,
            }}
          >
            „{dedication}”
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: format === "story" ? 34 : 30, color: colors.plumSoft }}>
          {new URL(env.siteUrl).host}
        </div>
      </div>
    </div>
  );
}
