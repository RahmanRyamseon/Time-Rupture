import Link from "next/link";
import type { Metadata } from "next";
import { LEGAL_POINTS } from "@/data/overview";
import { UpstreamNote } from "@/components/UpstreamNote";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const title = "Legal & controversy";
const description =
  "What to keep in mind before using or sharing an AI reverse-engineering case: clean-room claims, scope, licensing of commercial tools, service terms, and what this index will not list.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/legal/" },
  openGraph: {
    type: "website",
    url: "/legal/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en",
  },
  twitter: { card: "summary", title, description },
};

export default function LegalPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/legal/` },
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
        / <span aria-current="page">Legal</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-foreground/85">
          <p>
            <strong>
              Reverse engineering is governed by local law, software licenses and terms of service.
            </strong>{" "}
            This index covers only public information, for learning, research, interoperability and
            preservation. Make sure you are allowed to analyse the target. Nothing here is legal
            advice, and listing a project is not a statement that it is lawful where you are.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Points worth keeping in mind</h2>
        <dl className="space-y-4">
          {LEGAL_POINTS.map((point) => (
            <div key={point.title} className="card-surface rounded-2xl p-4">
              <dt className="font-semibold">{point.title}</dt>
              <dd className="mt-1 text-sm text-foreground/80">{point.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What this index will not list</h2>
        <p className="text-sm text-foreground/80">
          Following the upstream list&apos;s rules: no projects whose main purpose is bypassing
          licensing, copying paid features, or distributing copyrighted assets; no mirrors or pure
          forks. Takedown requests are handled upstream — open an issue there with the project name
          and reason, and the entry is removed on the next refresh here.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Beware of fake downloads</h2>
        <p className="text-sm text-foreground/80">
          Several GitHub repositories claim to offer an &ldquo;official free download&rdquo; of REA
          as zip files. The official channels are{" "}
          <a
            href="https://github.com/morluto/rea"
            className="underline hover:text-brand"
            rel="noopener noreferrer"
            target="_blank"
          >
            morluto/rea
          </a>
          ,{" "}
          <a
            href="https://rea.tools/"
            className="underline hover:text-brand"
            rel="noopener noreferrer"
            target="_blank"
          >
            rea.tools
          </a>{" "}
          and the npm package <code className="font-mono">rea-agents</code> (
          <code className="font-mono">npx rea-agents setup</code>). Do not run archives or
          executables from anywhere else.
        </p>
      </section>

      <UpstreamNote />
    </div>
  );
}
