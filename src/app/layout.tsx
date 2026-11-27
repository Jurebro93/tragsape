import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, DM_Sans, Fraunces, Newsreader } from "next/font/google";
import { CookieNotice } from "@/components/cookie-notice";
import { NewsletterPopup } from "@/components/newsletter/newsletter-popup";
import { common } from "@/messages/hr/common";
import "./globals.css";

// Oba fonta imaju podskup latin-ext, pa č, ć, ž, š i đ dolaze iz istog pisma kao ostala slova.
const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Naslovni fontovi tema memorijala. Ne učitavaju se unaprijed: preglednik ih dohvaća tek na
// stranici koja koristi tu temu.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${common.brand} - spomen-stranica za tvog ljubimca`,
    template: `%s - ${common.brand}`,
  },
  description:
    "Izradi trajnu spomen-stranicu za ljubimca: fotografija, posveta i knjiga sjećanja za obitelj i prijatelje. Osnovni spomen je besplatan.",
  applicationName: common.brand,
  openGraph: { siteName: common.brand, locale: "hr_HR", type: "website" },
  twitter: { card: "summary_large_image" },
  // Chrome iz teksta često pogrešno prepozna hrvatski kao bosanski, unatoč lang="hr", i nudi
  // „prijevod s bosanskog". Stranica je za hrvatsko tržište, pa ponudu prijevoda isključujemo.
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  themeColor: "#FFE7A8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" translate="no" className={`${display.variable} ${sans.variable} ${fraunces.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <CookieNotice />
        <Suspense fallback={null}>
          <NewsletterPopup />
        </Suspense>
      </body>
    </html>
  );
}
