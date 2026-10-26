import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/data/articles";
import { formatDate } from "@/lib/helpers";

export const metadata: Metadata = {
  title: "Articles & Guidance",
  description:
    "Practical guides on applying for government scholarships, verifying job notifications, avoiding scams, and understanding reservation, eligibility and preference in India.",
};

export default function ArticlesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Articles and Guidance</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Practical, plain-language guides to help you apply confidently and avoid scams.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/articles/${a.slug}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:shadow-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-teal)]">{a.category}</span>
            <h2 className="mt-1 text-base font-bold">{a.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.summary}</p>
            <p className="mt-2 text-xs text-slate-400">{formatDate(a.published_date)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
