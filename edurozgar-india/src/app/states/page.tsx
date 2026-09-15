import type { Metadata } from "next";
import Link from "next/link";
import { INDIAN_STATES } from "@/lib/data/states";
import { getAllOpportunities } from "@/lib/opportunities-data";

export const metadata: Metadata = {
  title: "State-wise Scholarships, Jobs and Admissions in India",
  description:
    "Browse government jobs, scholarships, minority welfare schemes and admissions by Indian state and Union Territory, with links to each official state portal.",
};

export default async function StatesIndexPage() {
  const opportunities = await getAllOpportunities();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">State-wise Opportunities</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          State government jobs, state scholarships, minority welfare schemes, admissions and entrance examinations,
          organised by state and Union Territory.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDIAN_STATES.map((s) => {
          const count = opportunities.filter((o) => o.state === s.name).length;
          return (
            <Link
              key={s.slug}
              href={`/states/${s.slug}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm hover:shadow-sm"
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-slate-500">{count} listing{count === 1 ? "" : "s"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
