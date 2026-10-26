import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bahrainvat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bahrain VAT Compliance Verification",
  description: "Internal audit workpaper for Bahrain VAT Decree-Law 48/2018 compliance verification.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Bahrain VAT Compliance Verification",
    description: "Internal audit workpaper for Bahrain VAT Decree-Law 48/2018 compliance verification.",
    url: SITE_URL,
    siteName: "Bahrain VAT Compliance Verification",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}
