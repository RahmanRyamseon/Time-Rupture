import type { Metadata } from "next";
import { opportunities } from "@/lib/data/opportunities";
import OpportunityListing from "@/components/OpportunityListing";

export const metadata: Metadata = {
  title: "Search Opportunities",
  description: "Search verified scholarships, government jobs, college admissions and fellowships across India.",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Search Opportunities</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Searching across scholarships, government jobs, admissions, fellowships and skill-development programmes.
        </p>
      </header>
      <OpportunityListing opportunities={opportunities} initialFilters={{ query: q }} />
    </div>
  );
}
