import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PF Wiki — Every Provident Fund Problem & How People Fixed It",
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "provident fund",
    "PF",
    "EPF",
    "EPFO",
    "UAN activation",
    "PF withdrawal",
    "PF claim rejected",
    "PF transfer",
    "EPFO grievance",
    "EPFiGMS",
    "EPS pension",
    "TDS on PF withdrawal",
    "EPFO 3.0",
    "Form 19",
    "Form 31",
  ],
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: "PF Wiki — Every Provident Fund Problem & How People Fixed It",
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PF Wiki — Every Provident Fund Problem & How People Fixed It",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  category: "reference",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/browse/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <NavBar />
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6"
        >
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-foreground/50">
          <p>
            PF Wiki — an unofficial, community-sourced gateway to Provident Fund problems. Not
            affiliated with EPFO or the Government of India.
          </p>
          <p className="mt-2">
            <a href="/feed.xml" className="underline hover:text-foreground/70">
              RSS feed
            </a>{" "}
            · <a href="/sitemap.xml" className="underline hover:text-foreground/70">
              Sitemap
            </a>
          </p>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
