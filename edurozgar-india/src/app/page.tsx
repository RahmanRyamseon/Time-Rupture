import Link from "next/link";
import { opportunities } from "@/lib/data/opportunities";
import { stateNameToSlug } from "@/lib/data/states";
import { daysUntil, liveStatus, TYPE_LABEL } from "@/lib/helpers";
import { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import HomeSearchBar from "@/components/HomeSearchBar";
import HeroCopy, { HeroCtas } from "@/components/HeroCopy";

export default function Home() {
  const closingSoon = opportunities
    .filter((o) => liveStatus(o) === "closing_soon")
    .sort((a, b) => daysUntil(a.closing_date) - daysUntil(b.closing_date))
    .slice(0, 3);

  const newlyAdded = [...opportunities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const minority = opportunities
    .filter((o) => o.muslim_eligibility.flag === "explicitly_eligible" || o.minority_eligibility.flag === "explicitly_eligible")
    .slice(0, 3);

  const stateGroups = Array.from(new Set(opportunities.map((o) => o.state)))
    .filter((s) => s !== "All India")
    .slice(0, 8);
  const levelGroups = Array.from(new Set(opportunities.flatMap((o) => o.education_level))).slice(0, 8);

  return (
    <div>
      <section className="bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-navy-dark)] px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <HeroCopy />
          <div className="mt-8">
            <HomeSearchBar />
          </div>
          <HeroCtas />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Not a government website.</strong> EduRozgar India is an information and discovery platform. Reservation,
          quota, fee concession, age relaxation and Muslim/minority benefits differ by examination, institution, state and
          applicable law — always verify eligibility on the official notification before applying.{" "}
          <Link href="/disclaimer" className="font-semibold underline">
            Read the full disclaimer
          </Link>
          .
        </div>
      </section>

      <HighlightSection
        title="Applications Closing Soon"
        subtitle="Don't miss these deadlines."
        items={closingSoon}
        viewAllHref="/calendar"
      />
      <HighlightSection
        title="Newly Added Opportunities"
        subtitle="Recently added to EduRozgar India."
        items={newlyAdded}
        viewAllHref="/scholarships"
      />
      <HighlightSection
        title="Opportunities for Minority Communities"
        subtitle="Muslim/minority eligibility or preference where officially applicable."
        items={minority}
        viewAllHref="/minority-opportunities"
      />

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-bold">Browse by State</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {stateGroups.map((s) => (
            <Link
              key={s}
              href={`/states/${stateNameToSlug(s) ?? ""}`}
              className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-black/5"
            >
              {s}
            </Link>
          ))}
          <Link href="/states" className="rounded-full bg-[var(--color-teal)] px-3 py-1.5 text-sm font-medium text-white">
            View all states →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-bold">Browse by Education Level</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {levelGroups.map((lvl) => (
            <span key={lvl} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm">
              {lvl}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((key) => (
            <div key={key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
              <p className="font-semibold">{TYPE_LABEL[key]}</p>
              <p className="mt-1 text-slate-500">
                {opportunities.filter((o) => o.opportunity_type === key).length} listings
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HighlightSection({
  title,
  subtitle,
  items,
  viewAllHref,
}: {
  title: string;
  subtitle: string;
  items: Opportunity[];
  viewAllHref: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Link href={viewAllHref} className="text-sm font-semibold text-[var(--color-teal)] hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} />
        ))}
      </div>
    </section>
  );
}
