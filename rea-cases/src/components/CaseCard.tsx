import Link from "next/link";
import type { CaseEntry } from "@/lib/types";
import { categoryBySlug } from "@/data/categories";
import { TagBadge } from "@/components/TagBadge";

export function CaseCard({ entry, showCategory = true }: { entry: CaseEntry; showCategory?: boolean }) {
  const category = showCategory ? categoryBySlug(entry.category) : undefined;

  return (
    <article className="card-surface rounded-2xl p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <TagBadge tag={entry.tag} source={entry.tagSource} />
        {entry.verification && (
          <span className="text-xs text-foreground/50">{entry.verification.verdictLabel}</span>
        )}
        {category && (
          <Link
            href={`/category/${category.slug}`}
            className="ml-auto text-xs text-foreground/50 hover:text-foreground"
          >
            <span aria-hidden="true">{category.icon}</span> {category.name}
          </Link>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">
        <Link href={`/case/${entry.slug}`} className="hover:text-brand">
          {entry.title}
        </Link>
      </h3>
      <p className="mt-0.5 font-mono text-xs text-foreground/50">{entry.name}</p>
      <p className="mt-2 text-sm text-foreground/75">{entry.summary}</p>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/55">
        {entry.replaces && entry.replaces.length > 0 && (
          <div>
            <dt className="inline font-medium">Replaces: </dt>
            <dd className="inline">{entry.replaces.join(", ")}</dd>
          </div>
        )}
        {entry.license && (
          <div>
            <dt className="inline font-medium">License: </dt>
            <dd className="inline">{entry.license}</dd>
          </div>
        )}
        {entry.status && (
          <div>
            <dt className="inline font-medium">Status: </dt>
            <dd className="inline">{entry.status}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
