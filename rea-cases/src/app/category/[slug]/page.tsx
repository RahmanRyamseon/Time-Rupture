import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, categoryBySlug } from "@/data/categories";
import { casesByCategory } from "@/data/cases";
import { CaseCard } from "@/components/CaseCard";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return { title: "Not found" };
  const url = `/category/${category.slug}/`;
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: category.name,
      description: category.description,
      siteName: SITE_NAME,
      locale: "en",
    },
    twitter: { card: "summary", title: category.name, description: category.description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const entries = casesByCategory(category.slug);
  const pageUrl = `${SITE_URL}/category/${category.slug}/`;

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: category.name, item: pageUrl },
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
        / <span aria-current="page">{category.name}</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          <span aria-hidden="true">{category.icon}</span> {category.name}
        </h1>
        <p className="mt-1 text-foreground/70">{category.description}</p>
        <p className="mt-1 text-sm text-foreground/50">
          {entries.length} {entries.length === 1 ? "case" : "cases"}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <CaseCard key={entry.slug} entry={entry} showCategory={false} />
        ))}
      </div>
      <nav aria-label="Other categories" className="flex flex-wrap gap-2 text-sm">
        {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="rounded-full bg-surface-muted px-3 py-1.5 text-foreground/70 hover:text-foreground"
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </Link>
        ))}
      </nav>
      <UpstreamNote />
    </div>
  );
}
