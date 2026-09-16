import type { Metadata } from "next";
import Link from "next/link";
import { OFFICIAL_LINKS } from "@/data/officialLinks";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const title = "Official EPFO Links";
const description = "Direct links to the real, official EPFO portals, grievance system, and apps.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/official-links/" },
  openGraph: {
    type: "website",
    url: "/official-links/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

export default function OfficialLinksPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/official-links/` },
    ],
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-foreground/50">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span aria-current="page">Official links</span>
      </nav>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Official EPFO links</h1>
        <p className="mt-1 max-w-xl text-foreground/60">
          PF Wiki explains problems and workarounds — but every actual claim, KYC update, or grievance
          has to be filed on EPFO&apos;s own systems. These are the real destinations.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OFFICIAL_LINKS.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-surface flex flex-col gap-2 rounded-2xl p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="font-semibold text-brand-strong">
              {link.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </h2>
            <p className="text-sm text-foreground/60">{link.description}</p>
          </a>
        ))}
      </div>
      <DataDisclaimer />
    </div>
  );
}
