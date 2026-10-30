import Link from "next/link";
import type { Metadata } from "next";
import { newestCases } from "@/data/cases";
import { CaseCard } from "@/components/CaseCard";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME, UPSTREAM } from "@/lib/site";

const title = "Newest cases";
const description =
  "The most recently created projects in the index, by the date each repository was created on GitHub.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/new/" },
  openGraph: {
    type: "website",
    url: "/new/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function NewPage() {
  const entries = newestCases();

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/new/` },
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
        / <span aria-current="page">New</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-foreground/70">
          Ordered by the date each repository was created on GitHub. Dates can move when a repo is
          renamed or re-created, and only the entries the upstream list dated are shown here — the
          older cases are in{" "}
          <Link href="/browse" className="underline hover:text-brand">
            the full index
          </Link>
          . Latest refresh: {UPSTREAM.snapshot}.
        </p>
      </header>
      <ol className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.slug} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="shrink-0 pt-4 font-mono text-xs text-foreground/50 sm:w-24">
              {entry.created}
            </span>
            <div className="flex-1">
              <CaseCard entry={entry} />
            </div>
          </li>
        ))}
      </ol>
      <UpstreamNote />
    </div>
  );
}
