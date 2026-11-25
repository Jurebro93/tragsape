import "server-only";
import QRCode from "qrcode";
import type { Memorial, Visibility } from "@/lib/memorial";
import { env } from "@/server/env";
import { createSessionClient } from "@/server/supabase/session";

/**
 * QR kod spomena. Kod uvijek nastaje na poslužitelju, iz adrese koju trenutni korisnik smije
 * dobiti: ključ za „samo s poveznicom" vraća baza samo vlasniku i suradnicima.
 */

/** Tamni moduli u boji teksta brenda (`plum`) na bijelom; razina Q podnosi oštećenja u tisku. */
const QR_OPTIONS = {
  errorCorrectionLevel: "Q",
  margin: 4,
  color: { dark: "#33242B", light: "#FFFFFF" },
} as const;

export type QrTarget = {
  /** Puna adresa koja je upisana u kod. */
  url: string;
  /** Ista adresa bez protokola, za ispis ispod koda. */
  label: string;
  visibility: Visibility;
};

/**
 * Adresa za kod, ili null dok spomen nije objavljen (ili ključ nije dostupan).
 * Javni i privatni spomen vode na `/spomen/{slug}`, „samo s poveznicom" na `/s/{ključ}`.
 */
export async function resolveQrTarget(
  memorial: Pick<Memorial, "id" | "slug" | "status" | "visibility">,
): Promise<QrTarget | null> {
  if (memorial.status !== "published") {
    return null;
  }
  let path = `/spomen/${memorial.slug}`;
  if (memorial.visibility === "unlisted") {
    const supabase = await createSessionClient();
    const { data: shareKey } = await supabase.rpc("memorial_share_key", { p_id: memorial.id });
    if (typeof shareKey !== "string" || !/^[a-f0-9]{32}$/.test(shareKey)) {
      return null;
    }
    path = `/s/${shareKey}`;
  }
  const url = `${env.siteUrl}${path}`;
  return { url, label: url.replace(/^https?:\/\//, ""), visibility: memorial.visibility };
}

/** SVG koda; uz `width` nosi i dimenzije u pikselima (za programe koji ih traže). */
export function qrSvg(url: string, width?: number): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg", ...(width ? { width } : {}) });
}

export function qrPng(url: string, width = 1200): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png", width });
}

/** SVG kao adresa za `<img>`, da se u stranicu ne umeće sirov HTML. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
