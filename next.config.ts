import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Jezik sadržaja i u zaglavlju odgovora, uz lang="hr" u HTML-u.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Language", value: "hr" }] }];
  },
  partialPrefetching: true,
  experimental: {
    // Dokaz o isplati donacije (do 10 MB) učitava se poslužiteljskom akcijom; zadano je 1 MB.
    serverActions: { bodySizeLimit: "11mb" },
    // Fotografije (do 12 MB) prolaze kroz proxy.ts, koji tijelo zahtjeva inače reže na 10 MB.
    proxyClientMaxBodySize: "13mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
