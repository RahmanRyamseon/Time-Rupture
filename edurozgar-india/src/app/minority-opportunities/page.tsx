import type { Metadata } from "next";
import Link from "next/link";
import { opportunities } from "@/lib/data/opportunities";
import { formatDate, TYPE_LABEL } from "@/lib/helpers";
import StatusBadge from "@/components/StatusBadge";

export const metadata: Metadata = {
  title: "Muslim & Minority Opportunities in India",
  description:
    "Scholarships, fellowships, admissions and welfare schemes where the official notification identifies Muslims or other notified minority communities as eligible beneficiaries, with the exact eligibility wording from the source.",
};

export default function MinorityOpportunitiesPage() {
  const listings = opportunities.filter(
    (o) => o.muslim_eligibility.flag === "explicitly_eligible" || o.minority_eligibility.flag === "explicitly_eligible"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Muslim and Minority Opportunities</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          This page lists scholarships, fellowships, admissions and welfare schemes from central ministries, state
          minority welfare departments, minority educational institutions, universities, Muslim charitable
          foundations and verified NGOs/trusts, <strong>only where the official notification itself</strong> identifies
          Muslims or a notified minority community as an eligible beneficiary group.
        </p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Eligibility must be confirmed from the official notification.</strong> Being listed here does not
          mean every Muslim or minority applicant automatically qualifies, and it does not mean a fixed percentage of
          any job or scholarship is reserved for Muslims. Income limits, domicile, merit, category and other
          conditions set out in the official document still apply.
        </div>
      </header>

      <ul className="space-y-4">
        {listings.map((o) => (
          <li key={o.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-teal)]">
                  {TYPE_LABEL[o.opportunity_type]}
                </span>
                <h2 className="mt-1 text-lg font-bold">
                  <Link href={`/opportunity/${o.id}`} className="hover:underline">
                    {o.title}
                  </Link>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{o.provider_name} · {o.state}</p>
              </div>
              <StatusBadge opportunity={o} />
            </div>

            {o.muslim_eligibility.flag === "explicitly_eligible" && o.muslim_eligibility.sourceWording && (
              <blockquote className="mt-3 border-l-4 border-[var(--color-teal)] bg-teal-50 p-3 text-sm italic text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
                “{o.muslim_eligibility.sourceWording}”
              </blockquote>
            )}
            {o.muslim_eligibility.flag !== "explicitly_eligible" && o.minority_eligibility.sourceWording && (
              <blockquote className="mt-3 border-l-4 border-[var(--color-teal)] bg-teal-50 p-3 text-sm italic text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
                “{o.minority_eligibility.sourceWording}”
              </blockquote>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Closing date: {formatDate(o.closing_date)}</span>
              <span>Last verified: {formatDate(o.last_verified_date)}</span>
              <Link href={`/opportunity/${o.id}`} className="font-semibold text-[var(--color-teal)] hover:underline">
                View full details →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-slate-500">
        EduRozgar India does not claim that Muslims are eligible for every minority, reserved-category or government
        opportunity. This list is limited to opportunities whose official source explicitly names Muslim or minority
        eligibility, and is provided for information only.
      </p>
    </div>
  );
}
