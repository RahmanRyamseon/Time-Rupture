import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/lib/store";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { CookieConsent } from "@/components/CookieConsent";
import { Analytics } from "@/components/Analytics";
import { AdSenseScript } from "@/components/AdSenseScript";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/legal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Nuqati (نقاطي) — GCC Credit Card Points Optimizer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: [
    "Bahrain credit cards",
    "credit card rewards Bahrain",
    "BisB Rewards",
    "CrediMax Thameen",
    "NBB points",
    "best credit card Bahrain",
    "GCC credit card points",
    "Gulf Air Falconflyer",
    "credit card cashback Bahrain",
    "Islamic credit card Bahrain",
  ],
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_BH",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  category: "finance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppStateProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-20 sm:px-6">{children}</main>
          <Footer />
          <CookieConsent />
          <Analytics />
          <AdSenseScript />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        </AppStateProvider>
      </body>
    </html>
  );
}
