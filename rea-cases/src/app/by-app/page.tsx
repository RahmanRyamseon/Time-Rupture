import Link from "next/link";
import type { Metadata } from "next";
import { byAppIndex } from "@/data/cases";
import { TagBadge } from "@/components/TagBadge";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const title = "Find a project by the app it replaces";
const description =
  "Open-source alternatives and compatible projects, indexed by the application they replace or work with — with the evidence tag, license and self-reported status for each.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/by-app/" },
  openGraph: {
    type: "website",
    url: "/by-app/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function ByAppPage() {
  const rows = byAppIndex();

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/by-app/` },
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
        / <span aria-current="page">By app</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-foreground/70">
          Each row says whether REA was used, the license, and the status the project reports for
          itself. Stars are deliberately absent — they change daily. Most of these need the original
          software or its files to be useful.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <caption className="sr-only">
            Projects indexed by the application they replace or work with
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
              <th scope="col" className="py-2 pr-3 font-medium">Replaces or works with</th>
              <th scope="col" className="py-2 pr-3 font-medium">Project</th>
              <th scope="col" className="py-2 pr-3 font-medium">Evidence</th>
              <th scope="col" className="py-2 pr-3 font-medium">License</th>
              <th scope="col" className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, entry }) => (
              <tr key={`${app}-${entry.slug}`} className="border-b border-border/60 align-top">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {app}
                </th>
                <td className="py-2 pr-3">
                  <Link href={`/case/${entry.slug}`} className="hover:text-brand">
                    {entry.name}
                  </Link>
                </td>
                <td className="py-2 pr-3">
                  <TagBadge tag={entry.tag} source={entry.tagSource} />
                </td>
                <td className="py-2 pr-3 text-foreground/70">{entry.license ?? "—"}</td>
                <td className="py-2 text-foreground/70">{entry.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UpstreamNote />
    </div>
  );
}
