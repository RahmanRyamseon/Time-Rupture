import type { Metadata } from "next";
import { opportunities } from "@/lib/data/opportunities";
import { OpportunityType } from "@/lib/types";
import OpportunityListing from "@/components/OpportunityListing";

export const metadata: Metadata = {
  title: "Government & Minority Scholarships in India",
  description:
    "Browse verified scholarships in India, including government scholarships, Muslim and minority scholarships, fellowships and skill-development programmes, with deadlines and official links.",
};

const SCHOLARSHIP_TYPES: OpportunityType[] = ["scholarship", "fellowship", "skill_development"];

export default async function ScholarshipsPage({
  searchParams,
}: PageProps<"/scholarships">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const type = typeof sp.type === "string" ? (sp.type as OpportunityType) : undefined;
  const women = sp.women === "1";
  const disability = sp.disability === "1";
  const ews = sp.ews === "1";

  const base = opportunities.filter((o) => SCHOLARSHIP_TYPES.includes(o.opportunity_type));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Scholarships, Fellowships & Skill-Development Programmes</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Verified scholarship listings from central and state government departments, universities and trusts.
          Muslim/minority eligibility is shown only where officially stated in the source notification — always confirm
          on the official application link before applying.
        </p>
      </header>
      <OpportunityListing
        opportunities={base}
        initialFilters={{
          query: q,
          opportunity_type: type,
          womenOnly: women,
          disabilityOnly: disability,
          ruralEwsOnly: ews,
        }}
      />
    </div>
  );
}
