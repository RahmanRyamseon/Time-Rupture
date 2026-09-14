import type { Metadata } from "next";
import { getAllOpportunities } from "@/lib/opportunities-data";
import OpportunityListing from "@/components/OpportunityListing";

export const metadata: Metadata = {
  title: "College & Education Admissions in India",
  description:
    "Undergraduate, postgraduate, diploma, vocational, ITI, doctoral, online and distance-learning admissions across Indian universities and colleges, with entrance exam and application dates.",
};

export default async function AdmissionsPage({ searchParams }: PageProps<"/admissions">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const opportunities = await getAllOpportunities();
  const base = opportunities.filter((o) => o.opportunity_type === "admission");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">College and Education Admissions</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Undergraduate, postgraduate, diploma, vocational, ITI, doctoral, online and distance-learning admissions.
          For minority educational institutions, admission policy is governed by that institution&apos;s current
          prospectus, not a fixed university-wide quota — always check the official prospectus.
        </p>
      </header>
      <OpportunityListing opportunities={base} initialFilters={{ query: q }} showMinorityFilters={false} />
    </div>
  );
}
