import Link from "next/link";
import { CASES, casesByCategory, newestCases, tagCounts } from "@/data/cases";
import { CATEGORIES } from "@/data/categories";
import { MOST_SHARED, STUDIES } from "@/data/overview";
import { SearchBox } from "@/components/SearchBox";
import { TagBadge } from "@/components/TagBadge";
import { UpstreamNote } from "@/components/UpstreamNote";
import { LegalNotice } from "@/components/LegalNotice";
import { TAG_INFO, TAG_ORDER, tagSlug } from "@/lib/tags";

export default function HomePage() {
  const counts = tagCounts();
  const confirmed = counts.find((c) => c.tag === "REA")?.count ?? 0;
  const recent = newestCases().slice(0, 6);

  return (
    <div className="space-y-12">
      <section className="space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What AI agents reverse-engineered and rebuilt
        </h1>
        <p className="max-w-3xl text-base text-foreground/75">
          {CASES.length} projects, each tagged by what the evidence actually shows — whether{" "}
          <Link href="https://github.com/morluto/rea" className="underline hover:text-brand">
            REA
          </Link>{" "}
          was really used, whether another AI tool was, or whether it is a clean-room rewrite with no
          reverse engineering at all. {confirmed} carry first-hand evidence of REA; the rest are
          labelled for what they are.
        </p>
        <SearchBox autoFocus />
        <div className="flex flex-wrap gap-2">
          {TAG_ORDER.map((tag) => {
            const count = counts.find((c) => c.tag === tag)?.count ?? 0;
            if (count === 0) return null;
            return (
              <Link
                key={tag}
                href={`/tag/${tagSlug(tag)}`}
                className="card-surface rounded-full px-3 py-1 text-xs hover:bg-surface-muted"
                title={TAG_INFO[tag].meaning}
              >
                <span className="font-mono">{tag}</span>{" "}
                <span className="text-foreground/50">{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <LegalNotice />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">Does REA actually help?</h2>
          <Link href="/evidence" className="text-sm text-brand underline">
            All the evidence
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-foreground/70">
          Two third parties have run controlled tests. Neither found the gain the viral posts imply,
          which is worth knowing before you add another MCP server to your agent.
        </p>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Browse by what it is</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const count = casesByCategory(category.slug).length;
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="card-surface flex gap-3 rounded-2xl p-4 transition-shadow hover:shadow-md"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {category.icon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold">{category.name}</span>
                    <span className="text-xs text-foreground/50">{count}</span>
                  </span>
                  <span className="mt-1 block text-sm text-foreground/70">
                    {category.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">The ones that actually spread</h2>
          <Link href="/browse" className="text-sm text-brand underline">
            Browse all
          </Link>
        </div>
        <p className="text-sm text-foreground/70">
          Reach figures are a snapshot, not a live count — see{" "}
          <Link href="/about" className="underline hover:text-brand">
            About &amp; sources
          </Link>{" "}
          for where each number came from.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                <th scope="col" className="py-2 pr-3 font-medium">Case</th>
                <th scope="col" className="py-2 pr-3 font-medium">What they did</th>
                <th scope="col" className="py-2 pr-3 font-medium">Reach</th>
                <th scope="col" className="py-2 font-medium">Tag</th>
              </tr>
            </thead>
            <tbody>
              {MOST_SHARED.map((item) => (
                <tr key={item.url} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3">
                    <a href={item.url} className="font-medium hover:text-brand" rel="noopener noreferrer" target="_blank">
                      {item.title}
                    </a>
                    <span className="block text-xs text-foreground/50">{item.author}</span>
                  </td>
                  <td className="py-2 pr-3 text-foreground/75">{item.what}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-foreground/60">{item.reach}</td>
                  <td className="py-2 font-mono text-xs text-foreground/60">{item.tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">Added recently</h2>
          <Link href="/new" className="text-sm text-brand underline">
            Everything new
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recent.map((entry) => (
            <li key={entry.slug} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="font-mono text-xs text-foreground/50">{entry.created}</span>
              <Link href={`/case/${entry.slug}`} className="text-sm font-medium hover:text-brand">
                {entry.title}
              </Link>
              <TagBadge tag={entry.tag} source={entry.tagSource} />
            </li>
          ))}
        </ul>
      </section>

      <UpstreamNote />
    </div>
  );
}
