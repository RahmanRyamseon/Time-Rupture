import Link from "next/link";
import type { Metadata } from "next";
import { verifiedCases } from "@/data/cases";
import { STUDIES } from "@/data/overview";
import { TagBadge } from "@/components/TagBadge";
import { UpstreamNote } from "@/components/UpstreamNote";
import { README_SAYS_SHORT, verdictDetail } from "@/lib/verdict";
import { SITE_URL, SITE_NAME, UPSTREAM } from "@/lib/site";

const title = "Did it really use REA?";
const description =
  "The claim check behind every case: what the project's own README says, what other sources say, and the verdict — plus the only controlled tests of whether REA improves results.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/evidence/" },
  openGraph: {
    type: "website",
    url: "/evidence/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function EvidencePage() {
  const checked = verifiedCases();
  const confirmed = checked.filter((c) => c.verification?.verdictLabel === "Confirmed").length;

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/evidence/` },
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
        / <span aria-current="page">Evidence</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-foreground/70">
          Plenty of projects are described as &ldquo;built with REA&rdquo;. Each case below was
          checked against the project&apos;s own README, the author&apos;s post, or the official
          showcase. {confirmed} of {checked.length} checked cases came back confirmed. The check ran
          on {UPSTREAM.claimsChecked}; posts on X could not be opened from the upstream
          environment, so those rely on third-party case records.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Does REA help? The controlled tests</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {STUDIES.map((study) => (
            <article key={study.name} className="card-surface rounded-2xl p-4">
              <h3 className="font-mono text-sm font-semibold">
                <a href={study.url} className="hover:text-brand" rel="noopener noreferrer" target="_blank">
                  {study.name}
                </a>
              </h3>
              <p className="mt-1 text-xs text-foreground/50">{study.scale}</p>
              <p className="mt-2 text-sm text-foreground/80">{study.finding}</p>
              <p className="mt-2 text-xs text-foreground/55">{study.caveats}</p>
            </article>
          ))}
        </div>
        <p className="text-sm text-foreground/70">
          Both are third-party work on a single machine, so read them as evidence rather than a
          verdict. Taken together they suggest REA pays off for targeted questions on a known
          surface, not open-ended exploration.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The per-case claim check</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <caption className="sr-only">Per-case REA claim check</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                <th scope="col" className="py-2 pr-3 font-medium">Case</th>
                <th scope="col" className="py-2 pr-3 font-medium">README says REA?</th>
                <th scope="col" className="py-2 pr-3 font-medium">Other source</th>
                <th scope="col" className="py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {checked.map((entry) => (
                <tr key={entry.slug} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    <Link href={`/case/${entry.slug}`} className="hover:text-brand">
                      {entry.name}
                    </Link>
                    <span className="mt-1 block">
                      <TagBadge tag={entry.tag} source={entry.tagSource} linked={false} />
                    </span>
                  </th>
                  <td className="py-2 pr-3 text-foreground/70">
                    {README_SAYS_SHORT[entry.verification!.readmeSaysRea]}
                  </td>
                  <td className="py-2 pr-3 text-foreground/70">
                    {entry.verification!.otherSource ?? "—"}
                  </td>
                  <td className="py-2 text-foreground/80">
                    <strong>{entry.verification!.verdictLabel}.</strong>{" "}
                    {verdictDetail(entry.verification!)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-foreground/60">
          Think a row is wrong?{" "}
          <a
            href={`${UPSTREAM.url}/issues/new?template=case.yml`}
            className="underline hover:text-brand"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open a case issue upstream
          </a>{" "}
          — corrections there flow back here on the next refresh.
        </p>
      </section>

      <UpstreamNote />
    </div>
  );
}
