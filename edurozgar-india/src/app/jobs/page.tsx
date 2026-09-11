import type { Metadata } from "next";
import { opportunities } from "@/lib/data/opportunities";
import OpportunityListing from "@/components/OpportunityListing";

export const metadata: Metadata = {
  title: "Government Jobs in India — Central, State, Railway, Banking & Police",
  description:
    "Browse verified government job notifications across central government, state government, public-sector, railway, banking, police and defence recruitment in India, with vacancies, eligibility and official links.",
};

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const base = opportunities.filter((o) => o.opportunity_type === "government_job");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Government Jobs in India</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Central government, state government, public-sector, railway, banking, police, teaching, defence and
          healthcare recruitment. Category and reservation information is shown exactly as stated in the official
          notification — this is never a guarantee of selection.
        </p>
      </header>
      <OpportunityListing opportunities={base} initialFilters={{ query: q }} />
    </div>
  );
}
