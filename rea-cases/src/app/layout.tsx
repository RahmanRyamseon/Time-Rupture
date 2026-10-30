import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, UPSTREAM } from "@/lib/site";

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
    default: "REA Cases — What AI Agents Reverse-Engineered and Rebuilt",
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "REA",
    "reverse engineer anything",
    "AI reverse engineering",
    "Ghidra MCP",
    "IDA Pro MCP",
    "clean-room rewrite",
    "decompilation",
    "open source alternatives",
    "binary analysis",
    "Claude Code reverse engineering",
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
    title: "REA Cases — What AI Agents Reverse-Engineered and Rebuilt",
    description: SITE_DESCRIPTION,
    locale: "en",
  },
  twitter: {
    card: "summary",
    title: "REA Cases — What AI Agents Reverse-Engineered and Rebuilt",
    description: SITE_DESCRIPTION,
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <NavBar />
        <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-foreground/50">
          <p>
            REA Cases — an unofficial index of AI reverse-engineering projects. Not affiliated with
            morluto/rea or any project listed here.
          </p>
          <nav
            aria-label="Secondary"
            className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          >
            <a href="/about/" className="underline hover:text-foreground/70">
              About &amp; sources
            </a>
            <span aria-hidden="true">·</span>
            <a href="/legal/" className="underline hover:text-foreground/70">
              Legal &amp; controversy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/sitemap.xml" className="underline hover:text-foreground/70">
              Sitemap
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={UPSTREAM.url}
              className="underline hover:text-foreground/70"
              rel="noopener noreferrer"
              target="_blank"
            >
              Upstream list ({UPSTREAM.license})
            </a>
          </nav>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
