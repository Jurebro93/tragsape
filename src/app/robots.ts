import type { MetadataRoute } from "next";
import { env } from "@/server/env";

/**
 * Tražilicama je otvoren javni dio. Zatvoreni su izrada, račun, prijava, naplata, API,
 * spomeni „samo s poveznicom” (/s/) i ruta za slike.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/izradi", "/moji-ljubimci", "/prijava", "/auth", "/naplata", "/api", "/s/", "/slike/"],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
