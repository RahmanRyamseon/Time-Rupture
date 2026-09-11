import Link from "next/link";
import { Opportunity } from "@/lib/types";
import { formatDate, TYPE_LABEL } from "@/lib/helpers";
import StatusBadge from "./StatusBadge";
import EligibilityBadges from "./EligibilityBadges";

export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-teal)]">
          {TYPE_LABEL[opportunity.opportunity_type]}
        </span>
        <StatusBadge opportunity={opportunity} />
      </div>

      <h3 className="text-base font-bold leading-snug">
        <Link href={`/opportunity/${opportunity.id}`} className="hover:underline">
          {opportunity.title}
        </Link>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">{opportunity.provider_name}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <dt className="font-semibold">State</dt>
          <dd>{opportunity.state}</dd>
        </div>
        <div>
          <dt className="font-semibold">Level</dt>
          <dd>{opportunity.education_level.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-semibold">Closing date</dt>
          <dd>{formatDate(opportunity.closing_date)}</dd>
        </div>
        <div>
          <dt className="font-semibold">Last verified</dt>
          <dd>{formatDate(opportunity.last_verified_date)}</dd>
        </div>
      </dl>

      <EligibilityBadges opportunity={opportunity} />

      <Link
        href={`/opportunity/${opportunity.id}`}
        className="mt-1 inline-flex items-center justify-center rounded-lg bg-[var(--color-navy)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-navy-dark)]"
      >
        View details
      </Link>
    </article>
  );
}
