import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { casesByTag } from "@/data/cases";
import { CaseCard } from "@/components/CaseCard";
import { UpstreamNote } from "@/components/UpstreamNote";
import { TAG_INFO, TAG_ORDER, tagFromSlug, tagSlug } from "@/lib/tags";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return TAG_ORDER.map((tag) => ({ slug: tagSlug(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) return { title: "Not found" };
  const title = `Cases tagged ${tag}`;
  const description = TAG_INFO[tag].meaning;
  return {
    title,
    description,
    alternates: { canonical: `/tag/${slug}/` },
    openGraph: {
      type: "website",
      url: `/tag/${slug}/`,
      title,
      description,
      siteName: SITE_NAME,
      locale: "en",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) notFound();

  const entries = casesByTag(tag);
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: `Tagged ${tag}`,
        item: `${SITE_URL}/tag/${slug}/`,
      },
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
        / <span aria-current="page">Tagged {tag}</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Tagged <span className="font-mono">{tag}</span>
        </h1>
        <p className="mt-1 max-w-2xl text-foreground/70">{TAG_INFO[tag].meaning}</p>
        <p className="mt-1 text-sm text-foreground/50">
          {entries.length} {entries.length === 1 ? "case" : "cases"}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <CaseCard key={entry.slug} entry={entry} />
        ))}
      </div>
      <nav aria-label="Other tags" className="flex flex-wrap gap-2 text-sm">
        {TAG_ORDER.filter((t) => t !== tag).map((t) => (
          <Link
            key={t}
            href={`/tag/${tagSlug(t)}`}
            title={TAG_INFO[t].meaning}
            className="rounded-full bg-surface-muted px-3 py-1.5 font-mono text-xs text-foreground/70 hover:text-foreground"
          >
            {t}
          </Link>
        ))}
      </nav>
      <UpstreamNote />
    </div>
  );
}
