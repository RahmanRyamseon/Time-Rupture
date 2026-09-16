import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, categoryBySlug } from "@/data/categories";
import { problemsByCategory } from "@/data/problems";
import { ProblemCard } from "@/components/ProblemCard";
import { DataDisclaimer } from "@/components/DataDisclaimer";
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
      locale: "en_IN",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description: category.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const entries = problemsByCategory(category.slug);
  const pageUrl = `${SITE_URL}/category/${category.slug}/`;

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: category.name, item: pageUrl },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.name,
    url: pageUrl,
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/problem/${entry.slug}/`,
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
        / <span aria-current="page" className="text-foreground/70">{category.name}</span>
      </nav>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl">
          {category.icon}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          <p className="mt-1 text-foreground/60">{category.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <ProblemCard key={entry.slug} entry={entry} />
        ))}
      </div>
      <DataDisclaimer />
    </div>
  );
}
