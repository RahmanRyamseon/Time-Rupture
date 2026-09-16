import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { ProblemCard } from "@/components/ProblemCard";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { CATEGORIES } from "@/data/categories";
import { PROBLEMS } from "@/data/problems";
import { OFFICIAL_LINKS } from "@/data/officialLinks";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURED_SLUGS = [
  "epfo-3-0-migration-claims-stuck",
  "uan-not-activating",
  "claim-rejected-generic",
  "employer-not-depositing-pf",
  "tds-on-withdrawal",
  "delinking-request-stuck-pending",
];

export default function Home() {
  const featured = FEATURED_SLUGS.map((slug) => PROBLEMS.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => !!p,
  );

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-4">
        <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
          {PROBLEMS.length} problems, sourced and cross-checked
        </span>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Every Provident Fund problem, in one place — with how people actually fixed it
        </h1>
        <p className="max-w-xl text-foreground/70">
          UAN won&apos;t activate. Claim got rejected. Employer never deposited your PF. Transfer OTP
          never arrives. <strong>PF Wiki</strong> is a searchable, sourced reference for the EPF/PF
          problems people hit most — each entry covers likely causes, the official fix path, and the
          workarounds real people report actually worked.
        </p>
        <SearchBox />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Browse by category</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="card-surface flex flex-col gap-2 rounded-2xl p-5 transition-shadow hover:shadow-md"
            >
              <span aria-hidden="true" className="text-2xl">
                {c.icon}
              </span>
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-sm text-foreground/60">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Most looked-up problems</h2>
          <Link href="/browse" className="text-sm font-medium text-brand-strong hover:underline">
            Browse all {PROBLEMS.length} →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((entry) => (
            <ProblemCard key={entry.slug} entry={entry} />
          ))}
        </div>
      </section>

      <section className="card-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Straight to the official portals</h2>
        <p className="mt-2 text-sm text-foreground/70">
          PF Wiki is unofficial — when you&apos;re ready to actually file something, these are the real
          government destinations.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OFFICIAL_LINKS.slice(0, 4).map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-strong underline decoration-brand-strong/40 underline-offset-2 hover:decoration-brand-strong"
              >
                {link.title}
              </a>
              <p className="text-xs text-foreground/55">{link.description}</p>
            </li>
          ))}
        </ul>
        <Link href="/official-links" className="mt-3 inline-block text-sm font-medium text-brand-strong hover:underline">
          See all official links →
        </Link>
      </section>

      <DataDisclaimer />
    </div>
  );
}
