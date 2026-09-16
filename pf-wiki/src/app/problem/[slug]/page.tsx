import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROBLEMS, problemBySlug, relatedProblems } from "@/data/problems";
import { categoryBySlug } from "@/data/categories";
import { SourceList } from "@/components/SourceList";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { ProblemCard } from "@/components/ProblemCard";
import { LinkedText } from "@/components/LinkedText";
import { stripLinks } from "@/lib/richText";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return PROBLEMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = problemBySlug(slug);
  if (!entry) return { title: "Not found" };
  const url = `/problem/${entry.slug}/`;
  return {
    title: entry.title,
    description: entry.short,
    keywords: entry.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: entry.title,
      description: entry.short,
      modifiedTime: entry.lastVerified,
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.short,
      images: ["/og-image.png"],
    },
  };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = problemBySlug(slug);
  if (!entry) notFound();

  const category = categoryBySlug(entry.category);
  const related = relatedProblems(entry);
  const pageUrl = `${SITE_URL}/problem/${entry.slug}/`;

  const breadcrumbItems = [
    { name: "Home", url: `${SITE_URL}/` },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/category/${category.slug}/` }] : []),
    { name: entry.title, url: pageUrl },
  ];
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: entry.title,
    description: entry.short,
    url: pageUrl,
    // No separately tracked creation date — lastVerified is the only date this
    // dataset keeps, so it's reused for both fields rather than fabricating one.
    datePublished: entry.lastVerified,
    dateModified: entry.lastVerified,
    inLanguage: "en",
    isAccessibleForFree: true,
    keywords: entry.tags.join(", "),
    about: category ? category.name : undefined,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    citation: entry.sources.map((s) => s.url),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to fix: ${entry.title}`,
    description: entry.short,
    step: entry.fixSteps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: stripLinks(step),
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: entry.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: [entry.short, ...entry.fixSteps.slice(0, 2).map(stripLinks)].join(" "),
        },
      },
    ],
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="text-sm text-foreground/50">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          {category && (
            <>
              <Link href={`/category/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>{" "}
              /{" "}
            </>
          )}
          <span aria-current="page" className="text-foreground/70">
            {entry.title}
          </span>
        </nav>
        {category && (
          <span className="w-fit rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong">
            <span aria-hidden="true">{category.icon}</span> {category.name}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{entry.title}</h1>
        <p className="text-foreground/70">{entry.short}</p>
        <p className="text-xs text-foreground/45">
          Last verified <time dateTime={entry.lastVerified}>{entry.lastVerified}</time>
        </p>
      </div>

      <Section title="How this usually shows up">
        <BulletList items={entry.symptoms} />
      </Section>

      <Section title="Likely causes">
        <BulletList items={entry.likelyCauses} />
      </Section>

      <Section title="How to fix it">
        <ol className="flex flex-col gap-3">
          {entry.fixSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground/80">
                <LinkedText text={step} />
              </span>
            </li>
          ))}
        </ol>
        {entry.relatedForms && entry.relatedForms.length > 0 && (
          <p className="mt-4 text-sm text-foreground/60">
            <strong>Forms involved:</strong> {entry.relatedForms.join(", ")}
          </p>
        )}
      </Section>

      <Section title="How people actually solved it" tone="accent">
        <p className="mb-3 text-xs text-foreground/50">
          Crowd-sourced from forums, Quora, and social media reports — not official EPFO guidance.
        </p>
        <BulletList items={entry.communitySolutions} />
      </Section>

      <Section title="If nothing above works: escalate">
        <BulletList items={entry.officialEscalation} />
      </Section>

      <Section title="Sources">
        <SourceList sources={entry.sources} />
      </Section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-lg font-semibold">
            Related problems
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <ProblemCard key={r.slug} entry={r} />
            ))}
          </div>
        </section>
      )}

      <DataDisclaimer />
    </div>
  );
}

function Section({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={`card-surface rounded-2xl p-5 ${tone === "accent" ? "border-accent/40 bg-accent-soft/40" : ""}`}
    >
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
          <span aria-hidden="true" className="text-brand-strong">
            •
          </span>
          <span>
            <LinkedText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}
