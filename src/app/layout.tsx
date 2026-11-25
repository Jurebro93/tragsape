import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { CookieNotice } from "@/components/cookie-notice";
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

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${common.brand} — spomen-stranica za tvog ljubimca`,
    template: `%s · ${common.brand}`,
  },
  description:
    "Izradi trajnu spomen-stranicu za ljubimca: fotografija, posveta i knjiga sjećanja za obitelj i prijatelje. Osnovni spomen je besplatan.",
  applicationName: common.brand,
  openGraph: { siteName: common.brand, locale: "hr_HR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#FFE7A8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
