"use client";

import { useMemo, useState } from "react";
import { Opportunity, OpportunityStatus } from "@/lib/types";
import { OpportunityFilters, filterOpportunities } from "@/lib/helpers";
import { INDIAN_STATES } from "@/lib/data/states";
import OpportunityCard from "./OpportunityCard";

const EDUCATION_LEVELS = [
  "School",
  "School (Class 1–10)",
  "Secondary",
  "Senior Secondary",
  "Undergraduate",
  "Postgraduate",
  "Diploma",
  "Doctoral",
  "M.Phil",
];

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closing_soon", label: "Closing Soon" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "closed", label: "Closed" },
  { value: "result_disbursement_stage", label: "Result / Disbursement" },
];

interface Props {
  opportunities: Opportunity[];
  initialFilters?: OpportunityFilters;
  showMinorityFilters?: boolean;
  emptyMessage?: string;
}

export default function OpportunityListing({
  opportunities,
  initialFilters,
  showMinorityFilters = true,
  emptyMessage = "No opportunities match your filters right now. Try broadening your search.",
}: Props) {
  const [filters, setFilters] = useState<OpportunityFilters>(initialFilters ?? {});

  const results = useMemo(() => filterOpportunities(opportunities, filters), [opportunities, filters]);

  function update<K extends keyof OpportunityFilters>(key: K, value: OpportunityFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-navy)] dark:text-white">
          Filters
        </h2>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Search</span>
          <input
            type="search"
            value={filters.query ?? ""}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Search by keyword"
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">State</span>
          <select
            value={filters.state ?? ""}
            onChange={(e) => update("state", e.target.value || undefined)}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All States / All India</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Education level</span>
          <select
            value={filters.educationLevel ?? ""}
            onChange={(e) => update("educationLevel", e.target.value || undefined)}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Any level</option>
            {EDUCATION_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Application status</span>
          <select
            value={filters.status ?? ""}
            onChange={(e) => update("status", (e.target.value || undefined) as OpportunityStatus | undefined)}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Eligibility & other filters</legend>
          {showMinorityFilters && (
            <>
              <CheckboxRow
                label="Officially mentions Muslim eligibility"
                checked={!!filters.muslimOnly}
                onChange={(v) => update("muslimOnly", v)}
              />
              <CheckboxRow
                label="Minority welfare scheme"
                checked={!!filters.minorityOnly}
                onChange={(v) => update("minorityOnly", v)}
              />
            </>
          )}
          <CheckboxRow label="Women-specific" checked={!!filters.womenOnly} onChange={(v) => update("womenOnly", v)} />
          <CheckboxRow
            label="Persons with disabilities"
            checked={!!filters.disabilityOnly}
            onChange={(v) => update("disabilityOnly", v)}
          />
          <CheckboxRow label="No application fee" checked={!!filters.noFeeOnly} onChange={(v) => update("noFeeOnly", v)} />
          <CheckboxRow
            label="Rural / economically weaker priority"
            checked={!!filters.ruralEwsOnly}
            onChange={(v) => update("ruralEwsOnly", v)}
          />
          <CheckboxRow
            label="First-generation learner priority"
            checked={!!filters.firstGenOnly}
            onChange={(v) => update("firstGenOnly", v)}
          />
        </fieldset>

        <button
          type="button"
          onClick={() => setFilters({})}
          className="mt-4 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          Clear filters
        </button>
      </aside>

      <div>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {results.length} opportunit{results.length === 1 ? "y" : "ies"} found
        </p>
        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-slate-500">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}
