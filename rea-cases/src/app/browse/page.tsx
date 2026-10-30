import type { Metadata } from "next";
import Link from "next/link";
import { BrowseClient } from "./BrowseClient";
import { CASES } from "@/data/cases";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const title = "Browse every case";
const description =
  "Every AI reverse-engineering and rebuild case in the index, searchable and filterable by category and by what the evidence shows.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/browse/" },
  openGraph: {
    type: "website",
    url: "/browse/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function BrowsePage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/browse/` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    url: `${SITE_URL}/browse/`,
    numberOfItems: CASES.length,
    itemListElement: CASES.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/case/${entry.slug}/`,
      name: entry.title,
    })),
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-foreground/50">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span aria-current="page">Browse</span>
      </nav>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse every case</h1>
        <p className="mt-1 text-foreground/60">
          {CASES.length} projects. Filter by category, or by how strong the evidence for REA is.
        </p>
      </div>
      <BrowseClient />
      <UpstreamNote />
    </div>
  );
}
