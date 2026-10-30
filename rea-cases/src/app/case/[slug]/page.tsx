import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CASES, caseBySlug, casesByCategory } from "@/data/cases";
import { categoryBySlug } from "@/data/categories";
import { TagBadge } from "@/components/TagBadge";
import { CaseCard } from "@/components/CaseCard";
import { UpstreamNote } from "@/components/UpstreamNote";
import { LegalNotice } from "@/components/LegalNotice";
import { TAG_INFO } from "@/lib/tags";
import { README_SAYS, verdictDetail } from "@/lib/verdict";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = caseBySlug(slug);
  if (!entry) return { title: "Not found" };
  const url = `/case/${entry.slug}/`;
  const description = `${entry.summary} Tagged ${entry.tag} in the REA case index.`;
  return {
    title: entry.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: entry.title,
      description,
      siteName: SITE_NAME,
      locale: "en",
    },
    twitter: { card: "summary", title: entry.title, description },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = caseBySlug(slug);
  if (!entry) notFound();

  const category = categoryBySlug(entry.category);
  const pageUrl = `${SITE_URL}/case/${entry.slug}/`;
  const related = casesByCategory(entry.category)
    .filter((c) => c.slug !== entry.slug)
    .slice(0, 4);

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.name,
              item: `${SITE_URL}/category/${category.slug}/`,
            },
          ]
        : []),
      { "@type": "ListItem", position: category ? 3 : 2, name: entry.title, item: pageUrl },
    ],
  };

  return (
    <article className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
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
        <span aria-current="page">{entry.name}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TagBadge tag={entry.tag} source={entry.tagSource} />
          {entry.language && <span aria-hidden="true">{entry.language}</span>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{entry.title}</h1>
        <p className="font-mono text-sm text-foreground/60">{entry.name}</p>
        <p className="text-base text-foreground/80">{entry.summary}</p>
        <p className="text-sm text-foreground/60">
          <span className="font-medium">{entry.tag}</span> — {TAG_INFO[entry.tag].meaning}
        </p>
        <a
          href={entry.url}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Open the project ↗
        </a>
      </header>

      <dl className="card-surface grid gap-4 rounded-2xl p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/50">License</dt>
          <dd className="mt-0.5">{entry.license ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/50">
            Status (self-reported)
          </dt>
          <dd className="mt-0.5">{entry.status ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-foreground/50">Repo created</dt>
          <dd className="mt-0.5">{entry.created ?? "Not recorded"}</dd>
        </div>
        {entry.replaces && entry.replaces.length > 0 && (
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase tracking-wide text-foreground/50">
              Replaces or works with
            </dt>
            <dd className="mt-0.5">
              {entry.replaces.map((app, i) => (
                <span key={app}>
                  {i > 0 && ", "}
                  <Link href="/by-app" className="underline hover:text-brand">
                    {app}
                  </Link>
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {entry.notes && entry.notes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What to know</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
            {entry.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.verification && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Did it really use REA?</h2>
          <div className="card-surface space-y-2 rounded-2xl p-4 text-sm">
            <p>
              <span className="text-foreground/55">README: </span>
              {README_SAYS[entry.verification.readmeSaysRea]}
            </p>
            {entry.verification.otherSource && (
              <p>
                <span className="text-foreground/55">Other source: </span>
                {entry.verification.otherSource}
              </p>
            )}
            <p>
              <span className="text-foreground/55">Verdict: </span>
              <strong>{entry.verification.verdictLabel}.</strong>{" "}
              {verdictDetail(entry.verification)}
            </p>
          </div>
          <p className="text-xs text-foreground/55">
            Claim checks come from the upstream list and were run on a fixed date — see{" "}
            <Link href="/evidence" className="underline hover:text-brand">
              the evidence page
            </Link>{" "}
            for all of them.
          </p>
        </section>
      )}

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            More in {category?.name ?? "this category"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <CaseCard key={r.slug} entry={r} showCategory={false} />
            ))}
          </div>
        </section>
      )}

      <LegalNotice />
      <UpstreamNote />
    </article>
  );
}
