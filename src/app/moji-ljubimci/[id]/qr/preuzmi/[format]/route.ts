import { getOwnerContext } from "@/server/owner/context";
import { qrPng, qrSvg, resolveQrTarget } from "@/server/owner/qr";

/**
 * Preuzimanje QR koda kao datoteke (`svg` ili `png`). Pristup se provjerava sesijom: kod dobiva
 * samo onaj tko spomen smije uređivati, jer za „samo s poveznicom" sadrži ključ za dijeljenje.
 */
export async function GET(_request: Request, context: RouteContext<"/moji-ljubimci/[id]/qr/preuzmi/[format]">) {
  const { id, format } = await context.params;
  if (format !== "svg" && format !== "png") {
    return new Response(null, { status: 404 });
  }
  const owner = await getOwnerContext(id);
  if (!owner || !owner.paid) {
    return new Response(null, { status: 404 });
  }
  const target = await resolveQrTarget(owner.memorial);
  if (!target) {
    return new Response(null, { status: 404 });
  }
  const name = `trag-sape-qr-${owner.memorial.slug.replace(/[^a-z0-9-]/g, "")}`;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (format === "svg") {
    return new Response(await qrSvg(target.url, 1200), {
      headers: {
        ...headers,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.svg"`,
      },
    });
  }
  const png = await qrPng(target.url);
  return new Response(new Uint8Array(png), {
    headers: {
      ...headers,
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${name}.png"`,
    },
  });
}
