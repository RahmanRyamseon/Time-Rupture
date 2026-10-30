import Link from "next/link";
import type { Metadata } from "next";
import { CASES, tagCounts } from "@/data/cases";
import { CATEGORIES } from "@/data/categories";
import { UpstreamNote } from "@/components/UpstreamNote";
import { TAG_INFO, TAG_ORDER, tagSlug } from "@/lib/tags";
import { SITE_URL, SITE_NAME, UPSTREAM } from "@/lib/site";

const title = "About & sources";
const description =
  "Where this index comes from, what each evidence tag means, how the data is refreshed, and what the numbers do and don't claim.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about/" },
  openGraph: {
    type: "website",
    url: "/about/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function AboutPage() {
  const counts = tagCounts();

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/about/` },
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
        / <span aria-current="page">About</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-foreground/75">
          &ldquo;REA&rdquo; started as{" "}
          <a
            href="https://github.com/morluto/rea"
            className="underline hover:text-brand"
            rel="noopener noreferrer"
            target="_blank"
          >
            morluto/rea
          </a>{" "}
          (Reverse Engineer Anything), an open-source MCP server and CLI that lets coding agents
          inspect native binaries, Electron apps, .NET assemblies, APKs, firmware and websites
          without their source code, explain how a feature works with evidence, and rebuild it. REA
          itself does not decompile; it orchestrates Hopper, Ghidra, IDA and JADX for the agent. The
          name now also covers the whole wave of agents rebuilding closed software — whether or not
          they used REA. This site indexes {CASES.length} of those projects and says, for each one,
          what the evidence actually supports.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">What the tags mean</h2>
        <dl className="space-y-3">
          {TAG_ORDER.map((tag) => {
            const count = counts.find((c) => c.tag === tag)?.count ?? 0;
            return (
              <div key={tag} className="card-surface rounded-2xl p-4">
                <dt className="flex items-baseline gap-2">
                  <Link href={`/tag/${tagSlug(tag)}`} className="font-mono text-sm hover:text-brand">
                    {tag}
                  </Link>
                  <span className="text-xs text-foreground/50">
                    {count} {count === 1 ? "case" : "cases"}
                  </span>
                </dt>
                <dd className="mt-1 text-sm text-foreground/80">{TAG_INFO[tag].meaning}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Where the data comes from</h2>
        <p className="text-sm text-foreground/80">
          Every entry is derived from{" "}
          <a
            href={UPSTREAM.url}
            className="underline hover:text-brand"
            rel="noopener noreferrer"
            target="_blank"
          >
            {UPSTREAM.name}
          </a>
          , released under {UPSTREAM.license}, at commit{" "}
          <code className="font-mono">{UPSTREAM.commit.slice(0, 7)}</code> (snapshot{" "}
          {UPSTREAM.snapshot}). That list checks each case against the project&apos;s own README,
          the author&apos;s post, or REA&apos;s official showcase; this site reorganises the same
          material into {CATEGORIES.length} categories with search, a by-app index and per-case
          pages. Corrections belong upstream — they flow back here on the next refresh.
        </p>
        <p className="text-sm text-foreground/80">
          Dates to read alongside the data: links and figures were checked upstream on{" "}
          {UPSTREAM.figuresChecked}, and the per-case REA claim check ran on{" "}
          {UPSTREAM.claimsChecked}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What the numbers don&apos;t claim</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
          <li>
            <strong>No star counts.</strong> They change daily and would be wrong within a week. Click
            through for the current number.
          </li>
          <li>
            <strong>Reach figures are a snapshot.</strong> Likes on the home page come from
            songshikang0111/awesome-REA-cases as of 2026-10-12; view counts are as noted per row.
          </li>
          <li>
            <strong>Status is self-reported.</strong> &ldquo;Ready&rdquo; means the project says so,
            not that anyone independently ran it.
          </li>
          <li>
            <strong>A tag is about evidence, not quality.</strong> A <code className="font-mono">Rebuild</code>{" "}
            is not worse than an <code className="font-mono">REA</code> case — it just wasn&apos;t
            reverse-engineered.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Unaffiliated</h2>
        <p className="text-sm text-foreground/80">
          This site is not affiliated with morluto/rea, rea.tools, the upstream list, or any project
          indexed here. All trademarks and product names belong to their owners, and naming an
          application in the by-app index does not imply any endorsement by its vendor. See{" "}
          <Link href="/legal" className="underline hover:text-brand">
            Legal &amp; controversy
          </Link>{" "}
          before acting on anything here.
        </p>
      </section>

      <UpstreamNote />
    </div>
  );
}
