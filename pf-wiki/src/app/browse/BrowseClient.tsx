"use client";

import { useMemo, useState } from "react";
import { ProblemCard } from "@/components/ProblemCard";
import { PROBLEMS } from "@/data/problems";
import { CATEGORIES } from "@/data/categories";
import { searchProblemsDetailed } from "@/lib/search";

export function BrowseClient() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const matches = useMemo(() => {
    const all = query.trim()
      ? searchProblemsDetailed(PROBLEMS, query)
      : PROBLEMS.map((entry) => ({ entry, score: 0, matchType: "exact" as const }));
    return activeCategory ? all.filter((m) => m.entry.category === activeCategory) : all;
  }, [query, activeCategory]);

  const filtered = matches.map((m) => m.entry);
  const isFuzzyOnly = query.trim().length > 0 && filtered.length > 0 && matches.every((m) => m.matchType === "fuzzy");

  return (
    <div className="flex flex-col gap-6">
      <label htmlFor="pf-browse-search" className="sr-only">
        Search all problems
      </label>
      <input
        id="pf-browse-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all problems — typos are okay…"
        className="w-full max-w-xl rounded-full border border-border bg-surface px-5 py-3 text-sm shadow-sm outline-none focus:border-brand"
      />
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          aria-pressed={activeCategory === null}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-brand text-white"
              : "bg-surface-muted text-foreground/70 hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setActiveCategory(c.slug)}
            aria-pressed={activeCategory === c.slug}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === c.slug
                ? "bg-brand text-white"
                : "bg-surface-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="text-sm text-foreground/50">
        {isFuzzyOnly
          ? `No exact match for "${query.trim()}" — showing the ${filtered.length} closest problem${filtered.length === 1 ? "" : "s"}`
          : `${filtered.length} of ${PROBLEMS.length} problems`}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((entry) => (
          <ProblemCard key={entry.slug} entry={entry} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-foreground/60">
          Nothing matches that search yet. Try a shorter term, or clear the category filter.
        </p>
      )}
    </div>
  );
}
