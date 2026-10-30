import Link from "next/link";
import type { Metadata } from "next";
import { RESOURCE_SECTIONS } from "@/data/resources";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const title = "Resources";
const description =
  "REA's official channels, guides and write-ups, peer MCP reverse-engineering tools, the other lists tracking this wave, and the press trail.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/resources/" },
  openGraph: {
    type: "website",
    url: "/resources/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function ResourcesPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/resources/` },
    ],
  };

  return (
    <div className="flex flex-col gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-foreground/50">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span aria-current="page">Resources</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-foreground/70">
          Everything here is a link collection rather than a case, so none of it carries an evidence
          tag. Jump to:{" "}
          {RESOURCE_SECTIONS.map((section, i) => (
            <span key={section.slug}>
              {i > 0 && " · "}
              <a href={`#${section.slug}`} className="underline hover:text-brand">
                {section.title}
              </a>
            </span>
          ))}
        </p>
      </header>

      {RESOURCE_SECTIONS.map((section) => (
        <section key={section.slug} id={section.slug} className="space-y-4 scroll-mt-20">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.intro && <p className="max-w-3xl text-sm text-foreground/70">{section.intro}</p>}
          <ul className="divide-y divide-border">
            {section.links.map((link) => (
              <li key={link.url} className="py-3">
                <a
                  href={link.url}
                  className="font-medium hover:text-brand"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.language && <span aria-hidden="true">{link.language} </span>}
                  {link.title}
                </a>
                {link.description && (
                  <p className="mt-0.5 text-sm text-foreground/70">{link.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <UpstreamNote />
    </div>
  );
}
