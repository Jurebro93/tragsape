import type { MetadataRoute } from "next";
import { env } from "@/server/env";

/**
 * Tražilicama je otvoren javni dio. Zatvoreni su izrada, račun, prijava, naplata, API, admin,
 * spomeni „samo s poveznicom” (/s/), ruta za slike te stranice s osobnim kodom ili tokenom
 * (preuzimanje poklona, pozivnica suradniku, kupnja geste za određeni spomen).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/izradi",
        "/moji-ljubimci",
        "/prijava",
        "/auth",
        "/naplata",
        "/api",
        "/admin",
        "/s/",
        "/slike/",
        "/poklon/",
        "/pozivnica/",
        "/gesta",
      ],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
